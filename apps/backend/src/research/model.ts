import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, fsyncSync, openSync, readFileSync, statSync, writeSync } from "node:fs";
import { join } from "node:path";
import type { Header } from "@pooltrace/protocols";
import type { analysisEligibility } from "../analysis.ts";
import { decode, digest, encode, type Document } from "../storage/codec.ts";

export interface Settings {
  windows: number;
  blocks: number;
  delayMs: number;
  pollMs: number;
  windowMs: number;
  reserveMs: number;
  sends: number;
  reserveSends: number;
  preflightMs: number;
  preflightSends: number;
}
export const SETTINGS: Readonly<Settings> = Object.freeze({
  windows: 2,
  blocks: 128,
  delayMs: 10_000,
  pollMs: 2_000,
  windowMs: 45 * 60_000,
  reserveMs: 5 * 60_000,
  sends: 20_000,
  reserveSends: 1_000,
  preflightMs: 120_000,
  preflightSends: 300,
});
export const SIZES = Object.freeze(["10", "50", "100", "500", "1000", "5000"]);
export type Category =
  | "collection"
  | "quotes"
  | "revalidation"
  | "observer"
  | "reconciliation"
  | "control";
export const CATEGORIES: readonly Category[] = [
  "collection",
  "quotes",
  "revalidation",
  "observer",
  "reconciliation",
  "control",
];
export class ResearchError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}
export type Stamp = { wall: number; mono: number };
export interface SourceIdentity {
  head: string;
  patchSha256: string;
  files: { path: string; sha256: string }[];
  sha256: string;
}
export function sourceIdentity(root: string): SourceIdentity {
  try {
    return readSourceIdentity(root);
  } catch {
    throw new ResearchError("source_identity_unavailable");
  }
}
function readSourceIdentity(root: string): SourceIdentity {
  const git = (args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  const paths = git(["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
    .split("\0")
    .filter(
      (p) =>
        /^(apps\/backend\/src\/|packages\/(domain|protocols)\/src\/)/.test(p) ||
        /^(package\.json|bun\.lock|\.node-version|\.bun-version)$/.test(p) ||
        /^(packages\/(domain|protocols)|apps\/backend)\/package\.json$/.test(p),
    )
    .sort();
  const files = [...new Set(paths)].map((path) => ({
    path,
    sha256: hashBytes(readFileSync(join(root, path))),
  }));
  const head = git(["rev-parse", "HEAD"]).trim();
  const patchSha256 = hashBytes(git(["diff", "HEAD", "--", ...paths]));
  return { head, patchSha256, files, sha256: digest({ head, patchSha256, files }) };
}
export function hashBytes(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}
export interface Manifest {
  format: "arb-01-v1";
  runId: string;
  origin: "live" | "fixture";
  created: Stamp;
  source: SourceIdentity;
  runtime: { node: string; bun: string };
  providerLabel: string;
  configurationRevision: string;
  settings: Readonly<Settings>;
  sizes: readonly string[];
  policies: unknown;
  registry: unknown;
  quoteSource: unknown;
  continuation?: {
    priorDirectory: string;
    parentRunId: string;
    previousEnd: bigint;
    originalDeadlineWall: number;
    preflightSendsRemaining: number;
    preflightMsRemaining: number;
    recoverySha256: string;
    parentJournalSha256: string;
    parentDatabaseSha256: string;
    sourceComparison: "unchanged_financial_pipeline_control_revision";
  };
}
export interface Attempt {
  kind: "attempt";
  window: number;
  index: number;
  started: Stamp;
  completed: Stamp;
  observationRevision: string | null;
  analysisRevision: string | null;
  status: string;
  reason: string | null;
  persistence: string;
  state: ReturnType<typeof analysisEligibility> | null;
}
export type Event =
  | { kind: "manifest"; manifest: Manifest }
  | { kind: "window"; window: number; armed: Stamp; head: Header; start: bigint; end: bigint }
  | { kind: "head"; window: number; at: Stamp; header: Header | null; reason: string | null }
  | {
      kind: "canonical";
      window: number;
      at: Stamp;
      height: bigint;
      header: Header | null;
      reason: string | null;
    }
  | Attempt
  | { kind: "logical"; window: number; category: Category }
  | {
      kind: "send";
      window: number;
      category: Category;
      id: number;
      at: Stamp;
      method: string;
      retry: number;
    }
  | { kind: "reply"; window: number; id: number; at: Stamp; outcome: string }
  | {
      kind: "window-end";
      window: number;
      at: Stamp;
      reason: string;
      sends: number;
      maxActive: number;
    }
  | { kind: "end"; at: Stamp; reason: string; windows: number; cleanup: boolean };

// Hash chaining detects corruption/truncation against the retained final digest. It is not a signature.
export class Journal {
  private fd: number;
  private sequence = 0;
  private previous: string | null = null;
  private closed = false;
  constructor(path: string) {
    this.fd = openSync(path, "wx", 0o600);
  }
  append(value: Event, sync = false) {
    try {
      if (this.closed) throw new Error();
      const document = encode(value);
      const core = { sequence: this.sequence, previous: this.previous, document };
      const hash = digest(core);
      const bytes = Buffer.from(`${JSON.stringify({ ...core, hash })}\n`);
      let written = 0;
      while (written < bytes.length) written += writeSync(this.fd, bytes, written);
      if (sync) fsyncSync(this.fd);
      this.previous = hash;
      this.sequence++;
      return hash;
    } catch {
      throw new ResearchError("journal_failure");
    }
  }
  close() {
    if (!this.closed) {
      this.closed = true;
      try {
        fsyncSync(this.fd);
      } finally {
        closeSync(this.fd);
      }
    }
  }
}
export function readJournal(path: string) {
  if (statSync(path).size > 128 * 1024 * 1024) throw new ResearchError("journal_oversize");
  const bytes = readFileSync(path);
  if (bytes.length > 128 * 1024 * 1024 || !bytes.length || bytes.at(-1) !== 10)
    throw new ResearchError("journal_incomplete");
  const events: Event[] = [];
  let previous: string | null = null;
  for (const line of bytes.toString("utf8").trimEnd().split("\n")) {
    const row = object(JSON.parse(line));
    const document = object(row.document);
    if (
      typeof document.json !== "string" ||
      typeof document.paths !== "string" ||
      row.sequence !== events.length ||
      row.previous !== previous ||
      row.hash !== digest({ sequence: row.sequence, previous: row.previous, document })
    )
      throw new ResearchError("journal_corrupt");
    const value = object(decode(document as unknown as Document));
    if (typeof value.kind !== "string") throw new ResearchError("journal_corrupt");
    events.push(value as unknown as Event);
    previous = String(row.hash);
  }
  return { events, terminalDigest: previous, sha256: hashBytes(bytes) };
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ResearchError("artifact_corrupt");
  return value as Record<string, unknown>;
}
export function stampValid(value: Stamp) {
  return (
    Number.isFinite(value.wall) && Number.isFinite(value.mono) && value.wall >= 0 && value.mono >= 0
  );
}
export function validElapsed(start: Stamp, end: Stamp) {
  return (
    stampValid(start) &&
    stampValid(end) &&
    end.wall >= start.wall &&
    end.mono >= start.mono &&
    end.wall - start.wall + 2 >= end.mono - start.mono
  );
}
