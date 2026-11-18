"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Analysis,
  type Current,
  confirmedDeadline,
  formatAmount,
  type Observation,
  venue,
} from "../lib/view.ts";

interface Config {
  apiOrigin: string;
  expectedMode: string;
}
interface HistoryRow {
  analysis_id?: string;
  observation_id: string;
  source_revision_id?: string;
  revision_id?: string;
  collection_revision_id?: string;
  origin: string;
  recorded_at_ms: number;
  knownInvalidation: unknown;
}
interface HistoryPage {
  rows: HistoryRow[];
  cursor: { highWater: string; lastSeq: string } | null;
}
export default function Page() {
  const [config, setConfig] = useState<Config | null>(null),
    [view, setView] = useState<Current | null>(null),
    [connection, setConnection] = useState("Connecting"),
    [now, setNow] = useState(0),
    [deadline, setDeadline] = useState(0),
    [historyKind, setHistoryKind] = useState<"analyses" | "observations">("analyses"),
    [history, setHistory] = useState<HistoryPage>({ rows: [], cursor: null }),
    [historyError, setHistoryError] = useState<string | null>(null),
    [detail, setDetail] = useState<{
      value: Analysis | Observation;
      knownInvalidation: unknown;
      asOf: number;
    } | null>(null);
  const configRef = useRef<Config | null>(null);
  const historyRequest = useRef(0);
  const latest = useRef({ instanceId: "", sequence: -1 }),
    lastStatus = useRef(0),
    fetching = useRef(false),
    pending = useRef(false),
    suspended = useRef(false);
  const refresh = useCallback(async (settings: Config) => {
    if (fetching.current) {
      pending.current = true;
      return;
    }
    fetching.current = true;
    try {
      const start = performance.now();
      const response = await fetch(`${settings.apiOrigin}/api/v1/current`, {
        cache: "no-store",
        credentials: "omit",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error();
      const next: Current = await response.json();
      if (next.apiVersion !== "local-api-v1" || next.mode !== settings.expectedMode) {
        setConnection("Configuration mismatch");
        setDeadline(0);
        return;
      }
      if (
        latest.current.instanceId &&
        (next.instanceId !== latest.current.instanceId || next.sequence < latest.current.sequence)
      )
        return;
      latest.current = { instanceId: next.instanceId, sequence: next.sequence };
      setView(next);
      setDeadline(
        !suspended.current && performance.now() - lastStatus.current < 3000
          ? confirmedDeadline(start, performance.now(), next.validForMs)
          : 0,
      );
    } catch {
      setConnection("Disconnected");
      setDeadline(0);
    } finally {
      fetching.current = false;
      if (pending.current) {
        pending.current = false;
        void refresh(settings);
      }
    }
  }, []);
  useEffect(() => {
    if (deadline <= 0) return;
    const timeout = setTimeout(() => setDeadline(0), Math.max(0, deadline - performance.now()));
    return () => clearTimeout(timeout);
  }, [deadline]);
  useEffect(() => {
    let source: EventSource | undefined,
      disposed = false;
    void fetch("/api/config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const settings: Config = await response.json();
        if (disposed) return;
        configRef.current = settings;
        setConfig(settings);
        source = new EventSource(`${settings.apiOrigin}/api/v1/events`, { withCredentials: false });
        source.addEventListener("status", (event) => {
          try {
            const status: Current & { eligibility?: { best: unknown } | null } = JSON.parse(
              (event as MessageEvent<string>).data,
            );
            if (status.apiVersion !== "local-api-v1" || status.mode !== settings.expectedMode) {
              setConnection("Configuration mismatch");
              setDeadline(0);
              return;
            }
            if (status.instanceId !== latest.current.instanceId) {
              latest.current = { instanceId: status.instanceId, sequence: -1 };
              setView(null);
              setDeadline(0);
            }
            if (status.sequence < latest.current.sequence) return;
            latest.current.sequence = status.sequence;
            lastStatus.current = performance.now();
            setConnection("Connected");
            if (!status.eligibility?.best || status.validForMs <= 0) setDeadline(0);
            void refresh(settings);
          } catch {
            setConnection("Invalid update");
            setDeadline(0);
          }
        });
        source.onerror = () => {
          setConnection("Disconnected · reconnecting");
          setDeadline(0);
        };
      })
      .catch(() => setConnection("Configuration unavailable"));
    const timer = setInterval(() => {
      setNow(performance.now());
      if (performance.now() - lastStatus.current >= 3000) {
        setDeadline(0);
        setConnection((current) =>
          current === "Configuration mismatch" ? current : "Waiting for updates",
        );
      }
    }, 250);
    const resume = () => {
      suspended.current = document.hidden;
      setDeadline(0);
      if (!document.hidden && configRef.current) void refresh(configRef.current);
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      disposed = true;
      source?.close();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [refresh]);
  const loadHistory = useCallback(
    async (next = false, kind = historyKind) => {
      if (!config) return;
      const requestId = ++historyRequest.current;
      try {
        setHistoryError(null);
        const query = new URLSearchParams({ limit: "10" });
        if (next && history.cursor) {
          query.set("highWater", history.cursor.highWater);
          query.set("lastSeq", history.cursor.lastSeq);
        }
        const response = await fetch(`${config.apiOrigin}/api/v1/history/${kind}?${query}`, {
          cache: "no-store",
          credentials: "omit",
        });
        if (!response.ok) throw new Error();
        const page: HistoryPage = await response.json();
        if (requestId === historyRequest.current) setHistory(page);
      } catch {
        if (requestId === historyRequest.current) setHistoryError("History unavailable");
      }
    },
    [config, history.cursor, historyKind],
  );
  async function inspect(row: HistoryRow) {
    const revisionId = historyKind === "analyses" ? row.revision_id : row.collection_revision_id;
    if (!config || !revisionId) return;
    try {
      const response = await fetch(
        `${config.apiOrigin}/api/v1/history/${historyKind}/${revisionId}`,
        { cache: "no-store", credentials: "omit" },
      );
      if (!response.ok) throw new Error();
      setDetail(await response.json());
    } catch {
      setHistoryError("Exact revision unavailable");
    }
  }
  const result = view?.result,
    admitted = deadline > now && connection === "Connected" && !detail;
  const analysis = detail ? ("rows" in detail.value ? detail.value : null) : result?.analysis;
  const observation = detail
    ? "observation" in detail.value
      ? detail.value.observation
      : detail.value
    : (result?.analysis?.observation ?? result?.observation);
  const best = admitted ? result?.eligibility?.best : null;
  const timestamp = (value: number | undefined) =>
    value === undefined ? "Unavailable" : new Date(value).toLocaleString();
  return (
    <main>
      <header>
        <a className="wordmark" href="/">
          POOLTRACE<span>LOCAL RESEARCH</span>
        </a>
        <div className="connection">
          <i className={connection === "Connected" ? "dot online" : "dot"} />
          {connection}
        </div>
      </header>
      <section className="intro">
        <div>
          <div className="eyebrow">ETHEREUM · USDC / WETH</div>
          <h1>Follow the evidence.</h1>
          <p>Exact cycle quotations, tested trade sizes, and the provenance behind every result.</p>
        </div>
        <span className="pill">READ ONLY</span>
      </section>
      {(observation ? observation.origin === "fixture" : config?.expectedMode === "fixture") && (
        <aside className="banner">
          CONSTRUCTED FIXTURE — synthetic state and timestamps. No live RPC or market admission.
        </aside>
      )}
      {detail && (
        <aside className="banner">
          HISTORICAL EVIDENCE — no current live admission.{" "}
          {detail.knownInvalidation ? "Known invalidation recorded." : "Original as-of evidence."}{" "}
          <button type="button" onClick={() => setDetail(null)}>
            Return to current
          </button>
        </aside>
      )}
      <section className="metrics">
        <article>
          <span className="metric-label">BEST TESTED GROSS</span>
          <strong className={best ? (BigInt(best.gross) > 0n ? "profit" : "loss") : ""}>
            {best ? `${formatAmount(best.gross)} USDC` : "Unavailable"}
          </strong>
          <small>
            {best
              ? BigInt(best.gross) > 0n
                ? "Positive gross quotation; net unavailable"
                : "No positive gross result in tested grid"
              : "Requires a fresh, qualified, saved comparison"}
          </small>
        </article>
        <article>
          <span className="metric-label">TRANSACTION COST</span>
          <strong>Unavailable</strong>
          <small>Full executor transaction evidence missing</small>
        </article>
        <article>
          <span className="metric-label">ESTIMATED NET PROFIT</span>
          <strong>Unavailable</strong>
          <small>Gross quotation does not establish net profit</small>
        </article>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              {detail
                ? analysis
                  ? "Historical cycle outcomes"
                  : "Historical observation"
                : "Cycle outcomes"}
            </h2>
            <p>USDC → WETH → USDC · best tested size, not a global optimum</p>
          </div>
          <span className="pill">
            {detail && !analysis
              ? "OBSERVATION RECORD"
              : `${analysis?.rows.length ?? 0} / 36 OUTCOMES`}
          </span>
        </div>
        <div className="states">
          <span>
            Service mode <b>{config?.expectedMode ?? "Starting"}</b>
          </span>
          <span>
            Collector <b>{view?.collector ?? "Starting"}</b>
          </span>
          <span>
            Evidence{" "}
            <b>
              {detail
                ? "Historical"
                : admitted
                  ? result?.status
                  : result
                    ? "Dated diagnostics"
                    : "Awaiting first attempt"}
            </b>
          </span>
          <span>
            Persistence{" "}
            <b>
              {detail ? "Saved historical version" : (result?.persistence.status ?? "Not saved")}
            </b>
          </span>
          <span>
            Validation{" "}
            <b>
              {detail
                ? detail.knownInvalidation
                  ? "Invalidated"
                  : (observation?.validations?.at(-1)?.canonical ?? "Unavailable")
                : (result?.eligibility?.canonical ?? "Unavailable")}
            </b>
          </span>
          <span>
            Age{" "}
            <b>
              {detail
                ? "Not current"
                : result?.eligibility?.blockAgeMs == null
                  ? "Unavailable"
                  : `${result.eligibility.blockAgeMs} ms at as-of`}
            </b>
          </span>
        </div>
        {!detail && result?.reason && <p className="notice">Latest outcome: {result.reason}</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Input USDC</th>
                <th>WETH after leg 1</th>
                <th>Final USDC</th>
                <th>Gross USDC</th>
                <th>At-block outcome</th>
              </tr>
            </thead>
            <tbody>
              {analysis?.rows.map((row) => (
                <tr key={`${row.route.join("-")}:${row.input}`}>
                  <td>
                    {venue(row.route[0])}
                    <span className="arrow"> → </span>
                    {venue(row.route[1])}
                  </td>
                  <td>{formatAmount(row.input)}</td>
                  <td>
                    {formatAmount(
                      analysis.quotes.find((quote) => quote.quoteId === row.leg1)?.output,
                      18,
                    )}
                  </td>
                  <td>{formatAmount(row.output)}</td>
                  <td
                    className={
                      row.gross === null
                        ? ""
                        : BigInt(row.gross) > 0n
                          ? "profit"
                          : BigInt(row.gross) < 0n
                            ? "loss"
                            : ""
                    }
                  >
                    {formatAmount(row.gross)}
                  </td>
                  <td>
                    <span className="outcome">{row.status}</span>
                    {row.reason && <small className="reason">{row.reason}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!analysis && (
            <div className="empty">
              <h3>{detail ? "No attached cycle analysis" : "No calculated outcomes yet"}</h3>
              <p>
                {detail
                  ? "This immutable observation retains snapshot evidence. Select a cycle analysis to inspect its trade-size outcomes."
                  : "The backend collects independently of this browser. Unavailable observations remain visible in history."}
              </p>
            </div>
          )}
        </div>
        <p className="footnote">
          Rows retain numeric diagnostics when stale, incomplete, rejected, or unavailable. They do
          not imply live eligibility, execution, or capture.
        </p>
      </section>
      <section className="bottom-grid">
        <article className="panel provenance">
          <h2>Block provenance</h2>
          <dl>
            <dt>Origin</dt>
            <dd>{observation?.origin ?? "Unavailable"}</dd>
            <dt>Chain ID</dt>
            <dd>{observation?.chainId ?? "Unavailable"}</dd>
            <dt>Block</dt>
            <dd>{observation?.block?.number ?? "Unavailable"}</dd>
            <dt>Block hash</dt>
            <dd className="hash">{observation?.block?.hash ?? "Unavailable"}</dd>
            <dt>Block timestamp</dt>
            <dd>
              {observation?.block
                ? timestamp(Number(BigInt(observation.block.timestamp) * 1000n))
                : "Unavailable"}
            </dd>
            <dt>Observed</dt>
            <dd>{timestamp(observation?.finishedAt)}</dd>
            <dt>{detail ? "Retrieved" : "View as of"}</dt>
            <dd>{timestamp(detail ? detail.asOf : view?.asOf)}</dd>
            <dt>Ranking metric</dt>
            <dd>Absolute USDC gross surplus</dd>
          </dl>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Stored evidence</h2>
              <p>Immutable historical revisions</p>
            </div>
            <button type="button" onClick={() => void loadHistory()}>
              Refresh history
            </button>
          </div>
          <div className="history-kinds">
            {(["analyses", "observations"] as const).map((kind) => (
              <button
                type="button"
                key={kind}
                aria-pressed={historyKind === kind}
                onClick={() => {
                  setHistoryKind(kind);
                  setHistory({ rows: [], cursor: null });
                  void loadHistory(false, kind);
                }}
              >
                {kind === "analyses" ? "Cycle analyses" : "Observations"}
              </button>
            ))}
          </div>
          {historyError && <p className="notice">{historyError}</p>}
          {history.rows.length ? (
            <ul className="history">
              {history.rows.map((row) => (
                <li key={row.analysis_id ?? row.observation_id}>
                  <button type="button" onClick={() => void inspect(row)}>
                    <span>
                      {row.origin.toUpperCase()} · {timestamp(row.recorded_at_ms)}
                    </span>
                    <small>{row.analysis_id ?? row.observation_id}</small>
                    {row.knownInvalidation ? <b>Invalidated</b> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-history">
              Load stored records to inspect exact historical evidence.
            </p>
          )}
          {history.cursor && (
            <button type="button" onClick={() => void loadHistory(true)}>
              Older records →
            </button>
          )}
        </article>
      </section>
      <footer>
        <span>Pooltrace · local read-only research</span>
        <span>Quoted results · no transaction execution</span>
      </footer>
    </main>
  );
}
