import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { BackendConfig } from "../config.ts";
import {
  type Manifest,
  ResearchError,
  hashBytes,
  object,
  readJournal,
  sourceIdentity,
  type SourceIdentity,
} from "./model.ts";

// This accepts only a fully reconciled first window whose final source-tool check failed.
// It cannot replace a sampled window, resume a partial block window or add a third window.
export function continuationPlan(
  directory: string,
  root: string,
  currentSource?: SourceIdentity,
  configuration?: Pick<BackendConfig, "providerLabel" | "configurationRevision">,
): NonNullable<Manifest["continuation"]> {
  directory = resolve(directory);
  const journal = readJournal(join(directory, "journal.jsonl"));
  const first = journal.events[0];
  const terminal = journal.events.at(-1);
  if (
    first?.kind !== "manifest" ||
    first.manifest.origin !== "live" ||
    first.manifest.continuation ||
    terminal?.kind !== "end" ||
    !terminal.cleanup ||
    !["malformed", "source_identity_unavailable"].includes(terminal.reason)
  )
    throw new ResearchError("continuation_not_eligible");
  const manifest = first.manifest;
  if (
    configuration &&
    (configuration.providerLabel !== manifest.providerLabel ||
      configuration.configurationRevision !== manifest.configurationRevision)
  )
    throw new ResearchError("configuration_mismatch");
  const windows = journal.events.filter((e) => e.kind === "window");
  if (windows.length !== 1 || windows[0]?.kind !== "window" || windows[0].window !== 1)
    throw new ResearchError("continuation_not_eligible");
  const canonical = journal.events.filter((e) => e.kind === "canonical");
  if (
    canonical.length !== manifest.settings.blocks ||
    canonical.some((e) => e.kind !== "canonical" || !e.header || e.window !== 1)
  )
    throw new ResearchError("continuation_not_eligible");
  const recoveryBytes = readFileSync(join(directory, "source-recovery.json"));
  const recovery = object(JSON.parse(recoveryBytes.toString("utf8")));
  const databaseHash = hashBytes(readFileSync(join(directory, "evidence.sqlite")));
  if (
    recovery.format !== "arb-01-source-recovery-v1" ||
    recovery.sourceSha256 !== manifest.source.sha256 ||
    recovery.journalSha256 !== journal.sha256 ||
    recovery.databaseSha256 !== databaseHash ||
    typeof recovery.verifiedAtMs !== "number" ||
    recovery.verifiedAtMs < terminal.at.wall
  )
    throw new ResearchError("recovery_proof_mismatch");
  for (const file of manifest.source.files)
    if (hashBytes(readFileSync(join(directory, "source", file.path))) !== file.sha256)
      throw new ResearchError("source_snapshot_mismatch");
  const current = currentSource ?? sourceIdentity(root);
  const core = (files: Manifest["source"]["files"]) =>
    files.filter(
      (f) =>
        !f.path.startsWith("apps/backend/src/research/") &&
        f.path !== "apps/backend/src/research.ts",
    );
  if (JSON.stringify(core(current.files)) !== JSON.stringify(core(manifest.source.files)))
    throw new ResearchError("financial_pipeline_changed");
  const preflight = journal.events.find((e) => e.kind === "window-end" && e.window === 0);
  if (preflight?.kind !== "window-end") throw new ResearchError("continuation_not_eligible");
  const originalDeadlineWall =
    manifest.created.wall +
    manifest.settings.preflightMs +
    manifest.settings.windows * manifest.settings.windowMs;
  const preflightSendsRemaining = manifest.settings.preflightSends - preflight.sends;
  const preflightMsRemaining =
    manifest.settings.preflightMs - (preflight.at.wall - manifest.created.wall);
  if (Date.now() >= originalDeadlineWall || preflightSendsRemaining < 1 || preflightMsRemaining < 1)
    throw new ResearchError("original_budget_exhausted");
  return {
    priorDirectory: directory,
    parentRunId: manifest.runId,
    previousEnd: windows[0].end,
    originalDeadlineWall,
    preflightSendsRemaining,
    preflightMsRemaining,
    recoverySha256: hashBytes(recoveryBytes),
    parentJournalSha256: journal.sha256,
    parentDatabaseSha256: databaseHash,
    sourceComparison: "unchanged_financial_pipeline_control_revision",
  };
}
