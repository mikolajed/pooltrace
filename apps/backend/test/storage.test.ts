import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { quoteFixture } from "@pooltrace/protocols/fixtures";
import { collectSnapshot, type Observation } from "../src/snapshot.ts";
import { analyzeSnapshot, type Analysis } from "../src/analysis.ts";
import { readConfig } from "../src/config.ts";
import { runCli } from "../src/cli-runner.ts";
import { encode, decode, digest, MAX_BYTES } from "../src/storage/codec.ts";
import { EvidenceStore, databasePath, type SaveReceipt } from "../src/storage/store.ts";
import {
  connect,
  record,
  StorageError,
  type Connect,
  type Database,
} from "../src/storage/driver.ts";

const dirs: string[] = [],
  stores: EvidenceStore[] = [],
  handles: Database[] = [];
const directory = () => {
  const d = mkdtempSync(join(tmpdir(), "pooltrace-store-test-"));
  dirs.push(d);
  return d;
};
const file = () => join(directory(), "evidence.sqlite");
const open = (path = file(), factory?: Connect) => {
  const s = new EvidenceStore(path, factory);
  stores.push(s);
  return s;
};
const raw = (path: string) => {
  const db = connect(path);
  handles.push(db);
  return db;
};
afterEach(() => {
  for (const s of stores.splice(0))
    try {
      s.close();
    } catch {}
  for (const d of handles.splice(0))
    try {
      d.close();
    } catch {}
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
let observation: Observation, analysis: Analysis;
const config = readConfig({
  ETHEREUM_RPC_URL: "https://fixture.invalid",
  RPC_PROVIDER_LABEL: "constructed-fixture",
  RPC_CONFIG_REVISION: "diagnostic-fixture-v1",
});
beforeAll(async () => {
  const fixture = quoteFixture({ timestamp: 1_700_000_000n });
  observation = await collectSnapshot(config, { origin: "fixture", fetch: fixture.fetch });
  analysis = await analyzeSnapshot(observation, config, { fetch: fixture.fetch });
});
const fresh = (): Observation => ({ ...observation, attemptId: randomUUID() });
function saved(r: SaveReceipt) {
  expect(r.status).toBe("saved");
  if (!r.observationRevisionId) throw new Error("missing revision");
  return r.observationRevisionId;
}
const event = (canonical: "valid" | "invalidated" | "unavailable" = "valid") => ({
  at: 12,
  monotonicAt: 13,
  canonical,
  head: null,
});
const extend = (
  o: Observation,
  canonical: "valid" | "invalidated" | "unavailable" = "valid",
): Observation => ({
  ...o,
  validations: [...o.validations, event(canonical)],
  requests: [...o.requests, { method: "eth_chainId", send: 1, outcome: "success" }],
});
function faulty(phase: "before" | "after" | "rollback" | "unknown"): Connect {
  let initialized = false;
  return (path, readonly) => {
    if (readonly && phase === "unknown") throw new Error("private-io-diagnostic");
    const db = connect(path, readonly);
    return {
      get inTransaction() {
        return db.inTransaction;
      },
      prepare: (sql) => db.prepare(sql),
      pragma: (sql, opts) => db.pragma(sql, opts),
      defaultSafeIntegers: (v) => db.defaultSafeIntegers(v),
      close: () => db.close(),
      exec(sql) {
        if (sql === "COMMIT" && !initialized) {
          initialized = true;
          return db.exec(sql);
        }
        if (sql === "COMMIT" && initialized && !readonly) {
          if (phase === "after" || phase === "unknown") db.exec(sql);
          throw Object.assign(new Error("private-io-diagnostic"), { code: "SQLITE_IOERR" });
        }
        if (sql === "ROLLBACK" && phase === "rollback")
          throw new Error("private-rollback-diagnostic");
        return db.exec(sql);
      },
    };
  };
}
describe("exact storage codec (S01)", () => {
  it("preserves types, extremes, ordered equal events, null and escaped keys", () => {
    const value = {
      "10": 123n,
      "2": "123",
      "a~/b": {
        unsigned: (1n << 256n) - 1n,
        ratio: 1n << 520n,
        signed: -1n,
        zero: 0n,
        missing: null,
        known: false,
      },
      events: [1n, 1n],
      metadata: -0,
      optional: undefined,
    };
    const doc = encode(value),
      result = decode(doc);
    expect(doc.json.startsWith('{"10":')).toBe(true);
    expect(doc.paths).toContain("a~0~1b");
    expect(result).toEqual({ ...value, metadata: 0 });
    expect(encode({ b: 2n, a: 1n })).toEqual(encode({ a: 1n, b: 2n }));
    expect(digest([1n, 1n])).not.toBe(digest([1n]));
  });
  it.each([NaN, Infinity, new Date(), [undefined], new Map(), () => {}, Symbol("x")])(
    "rejects unsupported value %s",
    (v) => expect(() => encode(v)).toThrow(StorageError),
  );
  it("rejects cycles and oversize rather than losing fields", () => {
    const x: unknown[] = [];
    x.push(x);
    expect(() => encode(x)).toThrow(StorageError);
    expect(() => encode("x".repeat(MAX_BYTES))).toThrow(StorageError);
  });
  it.each([
    ['["/n","/n"]', '{"n":"1"}'],
    ['["/missing"]', '{"n":"1"}'],
    ['["/n"]', '{"n":"01"}'],
  ])("rejects malformed canonical type metadata %j", (paths, json) => {
    expect(() => decode({ json: json ?? '{"n":"1"}', paths })).toThrow(StorageError);
  });
});
describe("file schema and immutable evidence (S01–S04, S06–S07)", () => {
  it("verifies the engine/settings/STRICT schema and rejects updates/deletes", () => {
    const path = file(),
      s = open(path),
      db = raw(path);
    expect(s.metadata).toMatchObject({ driver: "13.2.0", version: "3.54.1" });
    for (const [key, value] of [
      ["journal_mode", "delete"],
      ["foreign_keys", 1n],
    ] as const)
      expect(db.pragma(key, { simple: true })).toBe(value);
    const id = saved(s.saveObservation(observation));
    for (const operation of ["UPDATE observations SET origin='live'", "DELETE FROM observations"])
      expect(() => db.exec(operation)).toThrow();
    expect(db.pragma("foreign_key_check")).toEqual([]);
    expect(db.pragma("integrity_check", { simple: true })).toBe("ok");
    expect(statSync(path).mode & 0o777).toBe(0o600);
    s.close();
    expect(open(path).getObservation(id).value).toEqual(observation);
  });
  it("round-trips typed analyses and preserves all rows/dependencies through a separate process", () => {
    const path = file(),
      s = open(path),
      source = saved(s.saveObservation(observation)),
      result = s.saveAnalysis(analysis, source);
    expect(result.status).toBe("saved");
    expect(s.getAnalysis(result.analysisRevisionId as string)).toMatchObject({
      context: "historical",
      eligibleForLiveQualification: false,
      currentBest: null,
      value: analysis,
    });
    s.close();
    const p = spawnSync(
      process.execPath,
      [
        new URL("./storage-process.ts", import.meta.url).pathname,
        "read",
        path,
        result.analysisRevisionId as string,
      ],
      { encoding: "utf8" },
    );
    expect(p.status, p.stderr).toBe(0);
    const read = JSON.parse(p.stdout);
    expect(read.value.rows).toHaveLength(36);
    expect(read.value.transactionCost.status).toBe("unavailable");
    expect(read.eligibleForLiveQualification).toBe(false);
  });
  it("preserves large typed diagnostics in actual SQL documents", () => {
    const s = open(),
      source = saved(s.saveObservation(observation));
    const a = {
      ...analysis,
      rows: analysis.rows.map((r, i) =>
        i === 0 ? { ...r, gross: -(1n << 260n), input: (1n << 256n) - 1n } : r,
      ),
    };
    const result = s.saveAnalysis(a, source);
    expect(result.status).toBe("saved");
    expect(s.getAnalysis(result.analysisRevisionId as string).value).toEqual(a);
  });
  it("keeps two analyses, divergent branches, repeated equal events and all terminal invalidations", () => {
    const s = open(),
      source = saved(s.saveObservation(observation));
    const a = { ...analysis, observation: extend(analysis.observation) },
      b = {
        ...analysis,
        attemptId: randomUUID(),
        quotes: analysis.quotes.map((q) => ({ ...q, analysisId: "unused" })),
        observation: extend(analysis.observation, "unavailable"),
      };
    b.quotes = analysis.quotes.map((q) => ({ ...q, analysisId: b.attemptId }));
    const ra = s.saveAnalysis(a, source),
      rb = s.saveAnalysis(b, source);
    expect(ra.status).toBe("saved");
    expect(rb.status).toBe("saved");
    const repeated = { ...a, observation: extend(a.observation) };
    const rr = s.saveAnalysis(repeated, source, ra.analysisRevisionId);
    expect(rr.status).toBe("saved");
    const invalid = { ...repeated, observation: extend(repeated.observation, "invalidated") };
    const ri = s.saveAnalysis(invalid, source, rr.analysisRevisionId);
    expect(ri.status).toBe("saved");
    for (const id of [ra.analysisRevisionId, rb.analysisRevisionId, rr.analysisRevisionId])
      expect(s.getAnalysis(id as string).knownInvalidation).not.toBeNull();
    expect(s.getObservation(source).value).toEqual(observation);
    expect(s.getAnalysis(ra.analysisRevisionId as string).value).toEqual(a);
    const late = s.saveObservation(extend(observation), source);
    expect(late.status).toBe("saved");
    expect(s.getObservation(late.observationRevisionId as string).knownInvalidation).not.toBeNull();
    const newId = saved(s.saveObservation(fresh()));
    expect(s.getObservation(newId).knownInvalidation).toBeNull();
  });
  it("returns stable IDs and original row metadata on retries/no-ops", () => {
    const path = file(),
      s = open(path),
      a = s.saveObservation(observation),
      b = s.saveObservation(observation);
    expect(a.observationRevisionId).toBe(b.observationRevisionId);
    expect(s.saveObservation(observation, a.observationRevisionId).observationRevisionId).toBe(
      a.observationRevisionId,
    );
    const first = s.list("observations").rows[0];
    expect(s.list("observations").rows).toHaveLength(1);
    expect(s.list("observations").rows[0]).toEqual(first);
    const ra = s.saveAnalysis(analysis, a.observationRevisionId as string),
      rb = s.saveAnalysis(analysis, a.observationRevisionId as string);
    expect(ra.analysisRevisionId).toBe(rb.analysisRevisionId);
    expect(s.list("analyses").rows).toHaveLength(1);
    expect(
      s.saveAnalysis(analysis, a.observationRevisionId as string, ra.analysisRevisionId)
        .analysisRevisionId,
    ).toBe(ra.analysisRevisionId);
  });
  it("rejects changed immutable core, bad parents and shortened/reordered histories", () => {
    const path = file(),
      s = open(path),
      id = saved(s.saveObservation(observation));
    expect(s.saveObservation({ ...observation, complete: !observation.complete }).reason).toBe(
      "storage_conflict",
    );
    const s2 = open(path);
    expect(s2.getObservation(id).value).toEqual(observation);
    expect(s2.saveObservation({ ...extend(observation), requests: [] }, id).reason).toBe(
      "storage_conflict",
    );
    const s3 = open(path),
      result = s3.saveAnalysis(analysis, id);
    expect(result.status).toBe("saved");
    expect(
      s3.saveAnalysis({ ...analysis, logicalReads: 999 }, id, result.analysisRevisionId).reason,
    ).toBe("storage_conflict");
    const s4 = open(path),
      other = saved(s4.saveObservation(fresh()));
    expect(s4.saveAnalysis(analysis, other).reason).toBe("storage_conflict");
  });
  it("preserves failed collection, blocked analyses and unavailable costs", () => {
    const s = open(),
      failed = {
        ...fresh(),
        chainId: null,
        block: null,
        registry: null,
        complete: false,
        validations: [],
        failures: ["network"],
      };
    const id = saved(s.saveObservation(failed));
    expect(s.getObservation(id).value).toEqual(failed);
    const source = saved(s.saveObservation(observation)),
      a = {
        ...analysis,
        rows: analysis.rows.map((r) => ({
          ...r,
          status: "unavailable" as const,
          reason: "cancelled",
          output: null,
          gross: null,
        })),
        failures: ["cancelled"],
      };
    const result = s.saveAnalysis(a, source);
    expect(result.status).toBe("saved");
    expect(s.getAnalysis(result.analysisRevisionId as string).value).toEqual(a);
  });
  it("rejects unknown diagnostic fields and broken quote references before writing", () => {
    const s = open(),
      id = saved(s.saveObservation(observation));
    expect(
      s.saveObservation({ ...fresh(), rpcUrl: "https://private.invalid/secret" } as Observation)
        .reason,
    ).toBe("storage_encoding");
    const broken = { ...analysis, rows: analysis.rows.map((r) => ({ ...r, leg1: "absent" })) };
    expect(s.saveAnalysis(broken, id).reason).toBe("storage_encoding");
    expect(s.list("analyses").rows).toHaveLength(0);
  });
  it("detects missing bigint metadata and corrupted payloads on a historical read", () => {
    const path = file(),
      s = open(path),
      id = saved(s.saveObservation(observation)),
      db = raw(path);
    db.exec("DROP TRIGGER observation_versions_update_immutable");
    db.prepare("UPDATE observation_versions SET bigint_paths_json='[]' WHERE revision_id=?").run(
      id,
    );
    expect(() => s.getObservation(id)).toThrow(StorageError);
  });
  it("bounds cursor membership while retaining separate origin and invalidation knowledge", () => {
    const s = open();
    for (let i = 0; i < 4; i++) saved(s.saveObservation(fresh()));
    const page = s.list("observations", { limit: 2, origin: "fixture" });
    saved(s.saveObservation(fresh()));
    const next = s.list("observations", {
      limit: 2,
      cursor: page.cursor as NonNullable<typeof page.cursor>,
    });
    expect(new Set([...page.rows, ...next.rows].map((r) => r.seq)).size).toBe(4);
    expect(s.list("observations", { origin: "live" }).rows).toEqual([]);
    expect(() => s.list("observations", { limit: 101 })).toThrow(StorageError);
    expect(() => s.list("observations", { cursor: { highWater: "3", lastSeq: "4" } })).toThrow(
      StorageError,
    );
  });
  it.each(["future", "foreign", "schema", "ledger", "wal", "corrupt"])(
    "preserves incompatible %s files",
    (kind) => {
      const path = file();
      if (kind === "corrupt") writeFileSync(path, "not a database");
      else {
        open(path).close();
        const db = raw(path);
        if (kind === "future") db.pragma("user_version=2");
        if (kind === "foreign") db.pragma("application_id=123");
        if (kind === "schema") db.exec("DROP TRIGGER observations_delete_immutable");
        if (kind === "ledger") {
          db.exec("DROP TRIGGER schema_migrations_update_immutable");
          db.exec("UPDATE schema_migrations SET checksum='wrong'");
        }
        if (kind === "wal") db.pragma("journal_mode=WAL");
        db.close();
      }
      const before = readFileSync(path);
      expect(() => open(path)).toThrow(StorageError);
      expect(readFileSync(path)).toEqual(before);
    },
  );
});
describe("acknowledgement and operational faults (S03–S05, S07–S08)", () => {
  it.each(["before", "after", "rollback", "unknown"] as const)(
    "handles injected %s commit outcome honestly",
    (phase) => {
      const path = file();
      open(path).close();
      const s = open(path, faulty(phase)),
        result = s.saveObservation(observation);
      expect(result.status).toBe(
        phase === "after" ? "saved" : phase === "unknown" ? "unknown" : "not_saved",
      );
      expect(result.reason).toBe(phase === "after" ? null : "storage_io");
      expect(s.available).toBe(false);
      expect(() => s.list("observations")).toThrow(StorageError);
      const reopened = open(path);
      expect(reopened.list("observations").rows).toHaveLength(
        phase === "after" || phase === "unknown" ? 1 : 0,
      );
    },
  );
  it("rolls back analysis bundle insertion without losing saved collection", () => {
    const path = file(),
      s = open(path),
      source = saved(s.saveObservation(observation));
    raw(path).exec(
      "CREATE TRIGGER injected_failure BEFORE INSERT ON analysis_versions BEGIN SELECT RAISE(ABORT,'private diagnostic'); END",
    );
    const result = s.saveAnalysis(
      { ...analysis, observation: extend(analysis.observation) },
      source,
    );
    expect(result.status).toBe("not_saved");
    const db = raw(path);
    expect(record(db.prepare("SELECT count(*) n FROM analyses").get()).n).toBe(0n);
    expect(record(db.prepare("SELECT count(*) n FROM observation_versions").get()).n).toBe(1n);
    expect(db.pragma("foreign_key_check")).toEqual([]);
  });
  it("gets real SQLite read-only and page-limit FULL failures", () => {
    const path = file();
    open(path).close();
    const ro = open(path, (p) => connect(p, true));
    expect(ro.saveObservation(observation).reason).toBe("storage_readonly");
    const factory: Connect = (p, readonly) => {
      const db = connect(p, readonly);
      const pages = record(db.prepare("SELECT page_count FROM pragma_page_count").get()).page_count;
      db.pragma(`max_page_count=${String(pages)}`);
      return db;
    };
    const full = open(path, factory);
    expect(full.saveObservation(observation).reason).toBe("storage_full");
    expect(open(path).list("observations").rows).toHaveLength(0);
  });
  it("holds a real writer lock, times out, and recovers after killing only the owned writer", async () => {
    const path = file();
    open(path).close();
    const child = spawn(
      process.execPath,
      [new URL("./storage-process.ts", import.meta.url).pathname, "hold", path],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.once("data", () => resolve());
        child.once("error", reject);
        child.once("exit", () => reject(new Error("writer exited before barrier")));
      });
      const s = open(path),
        started = performance.now(),
        result = s.saveObservation(observation),
        elapsed = performance.now() - started;
      expect(result.reason).toBe("storage_busy");
      expect(elapsed).toBeGreaterThanOrEqual(450);
      expect(elapsed).toBeLessThan(2000);
    } finally {
      child.kill("SIGKILL");
      await new Promise<void>((resolve) => child.once("close", () => resolve()));
    }
    const s = open(path);
    expect(s.list("observations").rows).toHaveLength(0);
    expect(raw(path).pragma("integrity_check", { simple: true })).toBe("ok");
  });
  it("initializes concurrently in separate processes", async () => {
    const path = file();
    const start = () =>
      new Promise<number | null>((resolve, reject) => {
        const child = spawn(process.execPath, [
          new URL("./storage-process.ts", import.meta.url).pathname,
          "init",
          path,
        ]);
        child.on("error", reject);
        child.on("close", resolve);
      });
    expect(await Promise.all([start(), start()])).toEqual([0, 0]);
    expect(open(path).list("observations").rows).toEqual([]);
  });
  it("rolls back a failed initial migration and permits a later clean initialization", () => {
    const path = file();
    const factory: Connect = (p) => {
      const db = connect(p);
      return {
        ...db,
        get inTransaction() {
          return db.inTransaction;
        },
        prepare: (sql) => db.prepare(sql),
        pragma: (sql, opts) => db.pragma(sql, opts),
        defaultSafeIntegers: (v) => db.defaultSafeIntegers(v),
        close: () => db.close(),
        exec(sql) {
          if (sql.startsWith("CREATE TABLE")) {
            db.exec(sql.split(";\n")[0] as string);
            throw new Error("injected migration failure");
          }
          return db.exec(sql);
        },
      };
    };
    expect(() => open(path, factory)).toThrow(StorageError);
    expect(open(path).list("observations").rows).toEqual([]);
  });
  it("resolves default/configured paths and rejects unsafe command path forms", () => {
    const root = directory();
    expect(databasePath(root, "live")).toBe(join(root, "data/pooltrace.sqlite"));
    expect(databasePath(root, "fixture")).toBe(join(root, "data/pooltrace-fixture.sqlite"));
    expect(databasePath(root, "fixture", "local.sqlite")).toBe(join(root, "local.sqlite"));
    for (const value of [
      "",
      ":memory:",
      "file:test?mode=memory",
      "https://private.invalid/db",
      "\0",
      " padded ",
    ])
      expect(() => databasePath(root, "live", value)).toThrow(StorageError);
  });
  it("does no DB/network work on help or invalid market configuration", async () => {
    const root = directory(),
      openStore = vi.fn(() => {
        throw new StorageError("storage_io");
      }),
      fetch = vi.fn();
    expect((await runCli(["--help"], { root, env: {}, openStore, fetch })).exitCode).toBe(0);
    expect(
      (
        await runCli(["--mode", "live"], {
          root,
          env: {},
          readFile: () => undefined,
          openStore,
          fetch,
        })
      ).exitCode,
    ).toBe(2);
    expect(openStore).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(existsSync(join(root, "data"))).toBe(false);
  });
  it("fails initialization before RPC without leaking errors/paths", async () => {
    const root = directory(),
      fetch = vi.fn();
    const r = await runCli(["--mode", "live", "--format", "json"], {
      root,
      env: { ETHEREUM_RPC_URL: "https://private.invalid/key" },
      readFile: () => undefined,
      fetch,
      openStore: () => {
        throw new StorageError("storage_full");
      },
    });
    expect(r.exitCode).toBe(1);
    expect(r.envelope?.persistence).toMatchObject({ status: "not_saved", reason: "storage_full" });
    expect(fetch).not.toHaveBeenCalled();
    expect(r.stdout).not.toContain("private.invalid");
    expect(r.stdout).not.toContain(root);
  });
  it("retains usable diagnostics when analysis save fails, with confirmed collection IDs", async () => {
    const root = directory();
    let writes = 0;
    const r = await runCli(["--mode", "fixture", "--format", "json"], {
      root,
      env: {},
      readFile: () => undefined,
      openStore: (path) => {
        const s = open(path);
        const save = s.saveAnalysis.bind(s);
        s.saveAnalysis = (...args) => {
          writes++;
          if (writes === 1)
            return {
              status: "unknown",
              reason: "storage_io",
              observationRevisionId: null,
              analysisRevisionId: null,
              acknowledgedAt: null,
            };
          return save(...args);
        };
        return s;
      },
    });
    expect(r.exitCode).toBe(1);
    expect(r.envelope?.status).toBe("usable");
    expect(r.envelope?.persistence).toMatchObject({ status: "unknown", reason: "storage_io" });
    expect(r.envelope?.persistence.collectionRevisionId).not.toBeNull();
  });
  it("stops before analysis after collection-save failure", async () => {
    const root = directory();
    let analyze: ReturnType<typeof vi.fn> | undefined;
    const r = await runCli(["--mode", "fixture", "--format", "json"], {
      root,
      env: {},
      readFile: () => undefined,
      openStore: (path) => {
        const s = open(path);
        s.saveObservation = () => ({
          status: "not_saved",
          reason: "storage_busy",
          observationRevisionId: null,
          analysisRevisionId: null,
          acknowledgedAt: null,
        });
        const spy = vi.fn(s.saveAnalysis.bind(s));
        analyze = spy;
        s.saveAnalysis = spy;
        return s;
      },
    });
    expect(r.exitCode).toBe(1);
    expect(r.envelope?.analysis).toBeNull();
    expect(analyze).not.toHaveBeenCalled();
    expect(r.envelope?.persistence.reason).toBe("storage_busy");
  });
  it("re-evaluates expiry after the last commit and bounds renewal to one save", async () => {
    const root = directory();
    let wall = 1_700_000_000_000,
      mono = 0,
      writes = 0;
    const clock = { wall: () => wall, mono: () => mono };
    const r = await runCli(["--mode", "fixture", "--format", "json"], {
      root,
      env: {},
      readFile: () => undefined,
      clock,
      openStore: (path) => {
        const s = open(path),
          save = s.saveAnalysis.bind(s);
        s.saveAnalysis = (...args) => {
          const result = save(...args);
          writes++;
          wall += 6000;
          mono += 6000;
          return result;
        };
        return s;
      },
    });
    expect(writes).toBe(2);
    expect(r.exitCode).toBe(1);
    expect(r.envelope?.status).toBe("stale");
    expect(r.envelope?.eligibility?.best).toBeNull();
    expect(r.envelope?.persistence.status).toBe("saved");
    expect(r.envelope?.persistence.lastSavedAnalysisRevisionId).not.toBeNull();
  });
  it("excludes configured endpoint/key and raw diagnostics from actual rows and output", async () => {
    const root = directory(),
      path = join(root, "private.sqlite"),
      fixture = quoteFixture({ timestamp: BigInt(Math.floor(Date.now() / 1000)) });
    const r = await runCli(["--mode", "live", "--format", "json"], {
      root,
      env: {
        ETHEREUM_RPC_URL: "https://private.invalid/unique-secret-key",
        POOLTRACE_DB_PATH: path,
      },
      readFile: () => undefined,
      fetch: fixture.fetch,
    });
    expect(r.envelope?.persistence.status).toBe("saved");
    expect(r.stdout).not.toContain("unique-secret-key");
    expect(readFileSync(path).includes(Buffer.from("unique-secret-key"))).toBe(false);
  });
  it("preserves confirmed commit status while withholding admission after an integrity-read error", async () => {
    const root = directory();
    const r = await runCli(["--mode", "fixture", "--format", "json"], {
      root,
      env: {},
      readFile: () => undefined,
      openStore: (path) => {
        const s = open(path);
        s.knownInvalidation = () => {
          throw new StorageError("storage_corrupt");
        };
        return s;
      },
    });
    expect(r.exitCode).toBe(1);
    expect(r.envelope?.persistence.status).toBe("saved");
    expect(r.envelope?.persistence.reason).toBe("storage_corrupt");
    expect(r.envelope?.eligibility?.best).toBeNull();
    expect(r.envelope?.eligibility?.workloadAdmitted).toBe(false);
  });
  it("rejects anonymous or URI paths at the backend store boundary too", () => {
    for (const path of ["", ":memory:", "file:invalid"])
      expect(() => new EvidenceStore(path)).toThrow(StorageError);
  });
  it("delivers SIGINT queued during a real synchronous database lock before returning output", async () => {
    const path = file();
    open(path).close();
    const lock = raw(path);
    lock.exec("BEGIN EXCLUSIVE");
    const child = spawn("bun", ["run", "cli", "--mode", "live", "--format", "json"], {
      env: {
        ...process.env,
        ETHEREUM_RPC_URL: "https://fixture.invalid",
        POOLTRACE_DB_PATH: path,
        NODE_OPTIONS: `--import=${new URL("./storage-signal-bootstrap.ts", import.meta.url).href}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "",
      sent = false;
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    try {
      child.stdout.on("data", (chunk) => {
        out += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        if (!sent && String(chunk).includes("STORAGE_TEST_OPEN")) {
          sent = true;
          child.kill("SIGINT");
        }
      });
      const code = await new Promise<number | null>((resolve, reject) => {
        child.on("error", reject);
        child.on("close", resolve);
      });
      expect(sent).toBe(true);
      expect(code).toBe(130);
      expect(JSON.parse(out)).toMatchObject({
        status: "cancelled",
        persistence: { status: "not_saved", reason: "storage_busy" },
      });
    } finally {
      clearTimeout(timer);
      lock.exec("ROLLBACK");
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  });
});
