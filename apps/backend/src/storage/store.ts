import { randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Analysis } from "../analysis.ts";
import type { Observation } from "../snapshot.ts";
import { CODEC, decode, digest, encode, revision } from "./codec.ts";
import {
  type Connect,
  connect,
  type Database,
  integer,
  record,
  StorageError,
  type StorageReason,
  storageReason,
  text,
} from "./driver.ts";
import {
  analysisCore,
  assertAnalysis,
  assertExtension,
  assertObservation,
  observationCore,
} from "./evidence.ts";
import { initialize, verifyReadOnly } from "./schema.ts";

const context = randomUUID();
export function databasePath(root: string, mode: "live" | "fixture", raw?: string): string {
  if (
    raw !== undefined &&
    (!raw ||
      raw.trim() !== raw ||
      raw.includes("\0") ||
      raw === ":memory:" ||
      /^[a-z][a-z0-9+.-]*:/i.test(raw))
  )
    throw new StorageError("storage_configuration");
  return resolve(root, raw ?? `data/pooltrace${mode === "fixture" ? "-fixture" : ""}.sqlite`);
}
export interface SaveReceipt {
  status: "saved" | "not_saved" | "unknown";
  reason: StorageReason | null;
  observationRevisionId: string | null;
  analysisRevisionId: string | null;
  acknowledgedAt: number | null;
}
export interface Witness {
  revisionId: string;
  validationIndex: number;
}
interface ObservationVersion {
  revisionId: string;
  value: Observation;
  parent: string | null;
  derivation: string;
  row: Record<string, unknown>;
}
// Historical evidence deliberately cannot be passed to live producer APIs without an explicit cast.
export interface History {
  context: "historical";
  value: unknown;
  knownInvalidation: Witness | null;
  eligibleForLiveQualification: false;
  currentBest: null;
}
export interface Cursor {
  highWater: string;
  lastSeq: string;
}
export interface ListOptions {
  limit?: number;
  origin?: Observation["origin"];
  observationId?: string;
  cursor?: Cursor;
}
const number = (v: unknown) => {
  const b = integer(v);
  const n = Number(b);
  if (!Number.isSafeInteger(n)) throw new StorageError("storage_corrupt");
  return n;
};
const optionalText = (v: unknown) => (v === null ? null : text(v));
const equal = (a: unknown, b: unknown) => digest(a) === digest(b);
const receipt = (
  status: SaveReceipt["status"],
  reason: StorageReason | null,
  obs: string | null = null,
  analysis: string | null = null,
): SaveReceipt => ({
  status,
  reason,
  observationRevisionId: obs,
  analysisRevisionId: analysis,
  acknowledgedAt: status === "saved" ? Date.now() : null,
});
export class EvidenceStore {
  private db: Database;
  private closed = false;
  private readonly path: string;
  private readonly open: Connect;
  readonly metadata: ReturnType<typeof initialize>;
  constructor(path: string, open: Connect = connect) {
    path = databasePath(process.cwd(), "live", path);
    this.path = path;
    this.open = open;
    let db: Database | undefined;
    try {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      try {
        const fd = openSync(path, "wx", 0o600);
        closeSync(fd);
      } catch (e) {
        if (!e || typeof e !== "object" || !("code" in e) || e.code !== "EEXIST") throw e;
      }
      db = open(path);
      this.db = db;
      this.metadata = initialize(db);
    } catch (error) {
      try {
        db?.close();
      } catch {}
      throw new StorageError(storageReason(error));
    }
  }
  close() {
    if (!this.closed) {
      this.closed = true;
      try {
        this.db.close();
      } catch (error) {
        throw new StorageError(storageReason(error));
      }
    }
  }
  get available() {
    return !this.closed;
  }
  private read<T>(operation: () => T): T {
    try {
      if (this.closed) throw new StorageError("storage_unavailable");
      return operation();
    } catch (error) {
      throw new StorageError(storageReason(error));
    }
  }
  private row(table: string, column: string, id: string) {
    if (this.closed) throw new StorageError("storage_unavailable");
    // All identifiers are module-owned constants; only values come from callers.
    const result = this.db.prepare(`SELECT * FROM ${table} WHERE ${column}=?`).get(id);
    return result === undefined ? null : record(result);
  }
  private observationVersion(id: string): ObservationVersion {
    const row = this.row("observation_versions", "revision_id", id);
    if (!row || row.codec !== CODEC) throw new StorageError("storage_corrupt");
    const value = decode({ json: text(row.payload_json), paths: text(row.bigint_paths_json) });
    try {
      assertObservation(value);
    } catch {
      throw new StorageError("storage_corrupt");
    }
    const parent = optionalText(row.parent_revision_id),
      derivation = text(row.derivation);
    if (
      row.observation_id !== value.attemptId ||
      revision(`observation:${derivation}`, value.attemptId, parent, value) !== id
    )
      throw new StorageError("storage_corrupt");
    const root = this.row("observations", "observation_id", value.attemptId);
    if (
      !root ||
      root.core_sha256 !== digest(observationCore(value)) ||
      root.origin !== value.origin ||
      root.chain_id !== (value.chainId?.toString() ?? null) ||
      root.block_number !== (value.block?.number.toString() ?? null) ||
      root.block_hash !== (value.block?.hash.toLowerCase() ?? null)
    )
      throw new StorageError("storage_corrupt");
    return { revisionId: id, value, parent, derivation, row };
  }
  private checkedObservation(id: string) {
    const version = this.observationVersion(id);
    if (version.parent) {
      try {
        assertExtension(this.observationVersion(version.parent).value, version.value);
      } catch {
        throw new StorageError("storage_corrupt");
      }
    } else if (
      this.row("observations", "observation_id", version.value.attemptId)
        ?.collection_revision_id !== id
    )
      throw new StorageError("storage_corrupt");
    if (
      version.value.validations.some((v) => v.canonical === "invalidated") &&
      !this.row("observation_invalidations", "observation_id", version.value.attemptId)
    )
      throw new StorageError("storage_corrupt");
    return version;
  }
  knownInvalidation(observationId: string): Witness | null {
    return this.read(() => this.witness(observationId));
  }
  private witness(observationId: string): Witness | null {
    const row = this.row("observation_invalidations", "observation_id", observationId);
    if (!row) return null;
    const revisionId = text(row.witness_revision_id),
      validationIndex = number(row.validation_index),
      witness = this.checkedObservation(revisionId);
    if (
      witness.value.attemptId !== observationId ||
      witness.value.validations[validationIndex]?.canonical !== "invalidated"
    )
      throw new StorageError("storage_corrupt");
    return { revisionId, validationIndex };
  }
  getObservation(id: string): History {
    return this.read(() => {
      const version = this.checkedObservation(id);
      return {
        context: "historical",
        value: version.value,
        knownInvalidation: this.knownInvalidation(version.value.attemptId),
        eligibleForLiveQualification: false,
        currentBest: null,
      };
    });
  }
  private analysisVersion(id: string) {
    const row = this.row("analysis_versions", "revision_id", id);
    if (!row) throw new StorageError("storage_corrupt");
    const analysisId = text(row.analysis_id),
      observationId = text(row.observation_id),
      obsId = text(row.observation_revision_id),
      parent = optionalText(row.parent_revision_id);
    const core = this.row("analyses", "analysis_id", analysisId);
    if (!core || core.codec !== CODEC || core.observation_id !== observationId)
      throw new StorageError("storage_corrupt");
    const decoded = record(
      decode({ json: text(core.core_json), paths: text(core.bigint_paths_json) }),
    );
    const observation = this.checkedObservation(obsId).value,
      source = this.checkedObservation(text(core.source_revision_id)).value;
    const value = { ...decoded, observation };
    try {
      assertAnalysis(value);
    } catch {
      throw new StorageError("storage_corrupt");
    }
    if (
      value.attemptId !== analysisId ||
      observation.attemptId !== observationId ||
      !equal(observationCore(source), observationCore(observation)) ||
      core.core_sha256 !== digest(decoded) ||
      revision("analysis", analysisId, parent, { observationRevisionId: obsId }) !== id
    )
      throw new StorageError("storage_corrupt");
    if (parent) {
      const previous = this.row("analysis_versions", "revision_id", parent);
      if (!previous || previous.analysis_id !== analysisId)
        throw new StorageError("storage_corrupt");
      const prior = text(previous.observation_revision_id),
        version = this.checkedObservation(obsId);
      if (prior !== obsId && version.parent !== prior) throw new StorageError("storage_corrupt");
    } else if (
      obsId !== core.source_revision_id &&
      this.checkedObservation(obsId).parent !== core.source_revision_id
    )
      throw new StorageError("storage_corrupt");
    return { value: value as Analysis, row, core };
  }
  getAnalysis(id: string): History {
    return this.read(() => {
      const { value } = this.analysisVersion(id);
      return {
        context: "historical",
        value,
        knownInvalidation: this.knownInvalidation(value.observation.attemptId),
        eligibleForLiveQualification: false,
        currentBest: null,
      };
    });
  }
  private insertObservation(
    value: Observation,
    parent: string | null,
    kind: "collection" | "analysis" | "revalidation",
    id: string,
  ) {
    const doc = encode(value),
      now = Date.now(),
      root = this.row("observations", "observation_id", value.attemptId);
    if (parent) assertExtension(this.checkedObservation(parent).value, value);
    else if (root && (root.collection_revision_id !== id || root.clock_context_id !== context))
      throw new StorageError("storage_conflict");
    if (!root) {
      if (parent) throw new StorageError("storage_conflict");
      this.db
        .prepare(
          "INSERT INTO observations(observation_id,collection_revision_id,core_sha256,clock_context_id,origin,chain_id,block_number,block_hash,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .run(
          value.attemptId,
          id,
          digest(observationCore(value)),
          context,
          value.origin,
          value.chainId?.toString() ?? null,
          value.block?.number.toString() ?? null,
          value.block?.hash.toLowerCase() ?? null,
          now,
        );
    }
    const existing = this.row("observation_versions", "revision_id", id);
    if (existing) {
      if (
        !equal(this.checkedObservation(id).value, value) ||
        existing.parent_revision_id !== parent ||
        existing.derivation !== kind
      )
        throw new StorageError("storage_conflict");
    } else
      this.db
        .prepare(
          "INSERT INTO observation_versions(revision_id,observation_id,parent_revision_id,derivation,codec,payload_json,bigint_paths_json,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?)",
        )
        .run(id, value.attemptId, parent, kind, CODEC, doc.json, doc.paths, now);
    const index = value.validations.findIndex((v) => v.canonical === "invalidated");
    if (index >= 0 && !this.knownInvalidation(value.attemptId))
      this.db
        .prepare("INSERT INTO observation_invalidations VALUES (?,?,?,?)")
        .run(value.attemptId, id, index, now);
  }
  private write(obs: string, analysis: string | null, execute: () => void): SaveReceipt {
    if (this.closed) return receipt("not_saved", "storage_unavailable");
    let committing = false,
      rollbackConfirmed = false;
    try {
      this.db.exec("BEGIN IMMEDIATE");
      execute();
      committing = true;
      this.db.exec("COMMIT");
      return receipt("saved", null, obs, analysis);
    } catch (error) {
      try {
        if (this.db.inTransaction) {
          this.db.exec("ROLLBACK");
          rollbackConfirmed = true;
        }
      } catch {
        committing = true;
      }
      try {
        this.close();
      } catch {
        committing = true;
      }
      if (!committing || rollbackConfirmed) return receipt("not_saved", storageReason(error));
      let db: Database | undefined;
      try {
        db = this.open(this.path, true);
        verifyReadOnly(db);
        // Reuse full integrity/relationship readers against a separate committed view.
        const old = this.db;
        this.db = db;
        this.closed = false;
        try {
          this.checkedObservation(obs);
          if (analysis) this.analysisVersion(analysis);
          return receipt("saved", null, obs, analysis);
        } catch {
          if (
            !this.row("observation_versions", "revision_id", obs) ||
            (analysis && !this.row("analysis_versions", "revision_id", analysis))
          )
            return receipt("not_saved", storageReason(error));
          return receipt("unknown", storageReason(error));
        } finally {
          this.db = old;
          this.closed = true;
        }
      } catch {
        return receipt("unknown", storageReason(error));
      } finally {
        try {
          db?.close();
        } catch {
          /* Reconciliation was read-only. */
        }
      }
    }
  }
  saveObservation(value: Observation, parent: string | null = null): SaveReceipt {
    try {
      encode(value);
      assertObservation(value);
      const kind = parent ? "revalidation" : "collection";
      if (parent && equal(this.checkedObservation(parent).value, value))
        return this.write(parent, null, () => {});
      const id = revision(`observation:${kind}`, value.attemptId, parent, value);
      return this.write(id, null, () => this.insertObservation(value, parent, kind, id));
    } catch (error) {
      return receipt("not_saved", storageReason(error));
    }
  }
  saveAnalysis(value: Analysis, sourceId: string, previousId: string | null = null): SaveReceipt {
    try {
      encode(analysisCore(value));
      encode(value.observation);
      assertAnalysis(value);
      const source = this.checkedObservation(sourceId),
        previous = previousId ? this.analysisVersion(previousId) : null;
      if (
        source.value.attemptId !== value.observation.attemptId ||
        (previous &&
          (previous.core.source_revision_id !== sourceId ||
            previous.value.attemptId !== value.attemptId))
      )
        throw new StorageError("storage_conflict");
      const parentObs = previous ? text(previous.row.observation_revision_id) : sourceId;
      const unchanged = equal(this.checkedObservation(parentObs).value, value.observation),
        kind = previous ? "revalidation" : "analysis";
      const obs = unchanged
        ? parentObs
        : revision(
            `observation:${kind}`,
            value.observation.attemptId,
            parentObs,
            value.observation,
          );
      const core = analysisCore(value),
        doc = encode(core);
      const id =
        previous && unchanged
          ? (previousId as string)
          : revision("analysis", value.attemptId, previousId, { observationRevisionId: obs });
      return this.write(obs, id, () => {
        if (!unchanged) this.insertObservation(value.observation, parentObs, kind, obs);
        const existing = this.row("analyses", "analysis_id", value.attemptId);
        if (existing) {
          if (
            existing.core_sha256 !== digest(core) ||
            existing.core_json !== doc.json ||
            existing.bigint_paths_json !== doc.paths ||
            existing.source_revision_id !== sourceId
          )
            throw new StorageError("storage_conflict");
        } else
          this.db
            .prepare(
              "INSERT INTO analyses(analysis_id,observation_id,source_revision_id,codec,core_json,bigint_paths_json,core_sha256,recorded_at_ms) VALUES (?,?,?,?,?,?,?,?)",
            )
            .run(
              value.attemptId,
              value.observation.attemptId,
              sourceId,
              CODEC,
              doc.json,
              doc.paths,
              digest(core),
              Date.now(),
            );
        const stored = this.row("analysis_versions", "revision_id", id);
        if (stored) {
          if (!equal(this.analysisVersion(id).value, value))
            throw new StorageError("storage_conflict");
        } else
          this.db
            .prepare(
              "INSERT INTO analysis_versions(revision_id,analysis_id,observation_id,observation_revision_id,parent_revision_id,recorded_at_ms) VALUES (?,?,?,?,?,?)",
            )
            .run(id, value.attemptId, value.observation.attemptId, obs, previousId, Date.now());
      });
    } catch (error) {
      return receipt("not_saved", storageReason(error));
    }
  }
  findVersion(kind: "observations" | "analyses", id: string): History | null {
    return this.read(() => {
      if (kind !== "observations" && kind !== "analyses")
        throw new StorageError("storage_configuration");
      if (
        !this.row(
          kind === "observations" ? "observation_versions" : "analysis_versions",
          "revision_id",
          id,
        )
      )
        return null;
      return kind === "observations" ? this.getObservation(id) : this.getAnalysis(id);
    });
  }
  list(kind: "observations" | "analyses", options: ListOptions = {}) {
    return this.read(() => this.listRows(kind, options));
  }
  private listRows(kind: "observations" | "analyses", options: ListOptions = {}) {
    if (kind !== "observations" && kind !== "analyses")
      throw new StorageError("storage_configuration");
    const limit = options.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new StorageError("storage_configuration");
    const cursor = options.cursor;
    if (
      cursor &&
      (cursor.highWater.length > 19 ||
        cursor.lastSeq.length > 19 ||
        !/^(0|[1-9][0-9]*)$/.test(cursor.highWater) ||
        !/^(0|[1-9][0-9]*)$/.test(cursor.lastSeq) ||
        BigInt(cursor.lastSeq) > BigInt(cursor.highWater) ||
        BigInt(cursor.highWater) > 9223372036854775807n)
    )
      throw new StorageError("storage_configuration");
    const high = cursor
      ? BigInt(cursor.highWater)
      : integer(
          record(this.db.prepare(`SELECT coalesce(max(seq),0) high FROM ${kind}`).get()).high,
        );
    const where = ["t.seq<=?"],
      args: unknown[] = [high];
    if (cursor) {
      where.push("t.seq<?");
      args.push(BigInt(cursor.lastSeq));
    }
    if (options.origin) {
      where.push("o.origin=?");
      args.push(options.origin);
    }
    if (options.observationId) {
      where.push("t.observation_id=?");
      args.push(options.observationId);
    }
    args.push(limit);
    const rows = this.db
      .prepare(
        `SELECT t.seq,t.observation_id,${kind === "analyses" ? "t.analysis_id,t.source_revision_id,(SELECT v.revision_id FROM analysis_versions v WHERE v.analysis_id=t.analysis_id AND v.parent_revision_id IS NULL) revision_id" : "t.collection_revision_id"},t.recorded_at_ms,o.origin FROM ${kind} t JOIN observations o ON t.observation_id=o.observation_id WHERE ${where.join(" AND ")} ORDER BY t.seq DESC LIMIT ?`,
      )
      .all(...args)
      .map((v) => {
        const r = record(v);
        return {
          ...r,
          seq: integer(r.seq).toString(),
          recorded_at_ms: number(r.recorded_at_ms),
          knownInvalidation: this.knownInvalidation(text(r.observation_id)),
        };
      });
    return {
      rows,
      cursor:
        rows.length === limit
          ? { highWater: high.toString(), lastSeq: rows.at(-1)?.seq as string }
          : null,
    };
  }
}
