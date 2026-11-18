import { sha256, CODEC } from "./codec.ts";
import { DRIVER_VERSION, StorageError, record, text, integer, type Database } from "./driver.ts";

export const APPLICATION_ID = 0x50545243;
const seq = "seq INTEGER PRIMARY KEY AUTOINCREMENT";
const doc = (name: string) => `${name} TEXT NOT NULL CHECK(json_valid(${name}))`;
const codec = `codec TEXT NOT NULL CHECK(codec='${CODEC}')`;
const definitions: [string, string, string][] = [
  [
    "table",
    "observations",
    `CREATE TABLE observations (${seq}, observation_id TEXT NOT NULL UNIQUE, collection_revision_id TEXT NOT NULL, core_sha256 TEXT NOT NULL, clock_context_id TEXT NOT NULL, origin TEXT NOT NULL CHECK(origin IN ('live','historical','fixture')), chain_id TEXT, block_number TEXT, block_hash TEXT, recorded_at_ms INTEGER NOT NULL, FOREIGN KEY(observation_id,collection_revision_id) REFERENCES observation_versions(observation_id,revision_id) DEFERRABLE INITIALLY DEFERRED) STRICT`,
  ],
  [
    "table",
    "observation_versions",
    `CREATE TABLE observation_versions (${seq}, revision_id TEXT NOT NULL UNIQUE, observation_id TEXT NOT NULL REFERENCES observations(observation_id), parent_revision_id TEXT, derivation TEXT NOT NULL CHECK(derivation IN ('collection','analysis','revalidation')), ${codec}, ${doc("payload_json")}, ${doc("bigint_paths_json")}, recorded_at_ms INTEGER NOT NULL, UNIQUE(observation_id,revision_id), CHECK((derivation='collection')=(parent_revision_id IS NULL)), FOREIGN KEY(observation_id,parent_revision_id) REFERENCES observation_versions(observation_id,revision_id)) STRICT`,
  ],
  [
    "table",
    "analyses",
    `CREATE TABLE analyses (${seq}, analysis_id TEXT NOT NULL UNIQUE, observation_id TEXT NOT NULL REFERENCES observations(observation_id), source_revision_id TEXT NOT NULL, ${codec}, ${doc("core_json")}, ${doc("bigint_paths_json")}, core_sha256 TEXT NOT NULL, recorded_at_ms INTEGER NOT NULL, UNIQUE(analysis_id,observation_id), FOREIGN KEY(observation_id,source_revision_id) REFERENCES observation_versions(observation_id,revision_id)) STRICT`,
  ],
  [
    "table",
    "analysis_versions",
    `CREATE TABLE analysis_versions (${seq}, revision_id TEXT NOT NULL UNIQUE, analysis_id TEXT NOT NULL, observation_id TEXT NOT NULL, observation_revision_id TEXT NOT NULL, parent_revision_id TEXT, recorded_at_ms INTEGER NOT NULL, UNIQUE(analysis_id,revision_id), FOREIGN KEY(analysis_id,observation_id) REFERENCES analyses(analysis_id,observation_id), FOREIGN KEY(observation_id,observation_revision_id) REFERENCES observation_versions(observation_id,revision_id), FOREIGN KEY(analysis_id,parent_revision_id) REFERENCES analysis_versions(analysis_id,revision_id)) STRICT`,
  ],
  [
    "table",
    "observation_invalidations",
    `CREATE TABLE observation_invalidations (observation_id TEXT PRIMARY KEY NOT NULL, witness_revision_id TEXT NOT NULL, validation_index INTEGER NOT NULL CHECK(validation_index>=0), recorded_at_ms INTEGER NOT NULL, FOREIGN KEY(observation_id,witness_revision_id) REFERENCES observation_versions(observation_id,revision_id)) STRICT`,
  ],
  [
    "table",
    "schema_migrations",
    `CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY CHECK(version>0), checksum TEXT NOT NULL, applied_at_ms INTEGER NOT NULL, node_version TEXT NOT NULL, driver_version TEXT NOT NULL, sqlite_version TEXT NOT NULL, sqlite_source_id TEXT NOT NULL) STRICT`,
  ],
];
for (const [name, table, columns, unique, where] of [
  [
    "one_collection",
    "observation_versions",
    "observation_id",
    true,
    " WHERE parent_revision_id IS NULL",
  ],
  [
    "one_analysis_initial",
    "analysis_versions",
    "analysis_id",
    true,
    " WHERE parent_revision_id IS NULL",
  ],
  ["observations_origin", "observations", "origin,seq", false, ""],
  ["analyses_observation", "analyses", "observation_id,seq", false, ""],
  ["versions_observation", "observation_versions", "observation_id,seq", false, ""],
  ["versions_analysis", "analysis_versions", "analysis_id,seq", false, ""],
  ["observation_parents", "observation_versions", "observation_id,parent_revision_id", false, ""],
  ["analysis_parents", "analysis_versions", "analysis_id,parent_revision_id", false, ""],
] as const)
  definitions.push([
    "index",
    name,
    `CREATE ${unique ? "UNIQUE " : ""}INDEX ${name} ON ${table}(${columns})${where}`,
  ]);
for (const table of [
  "observations",
  "observation_versions",
  "analyses",
  "analysis_versions",
  "observation_invalidations",
  "schema_migrations",
])
  for (const operation of ["UPDATE", "DELETE"]) {
    const name = `${table}_${operation.toLowerCase()}_immutable`;
    definitions.push([
      "trigger",
      name,
      `CREATE TRIGGER ${name} BEFORE ${operation} ON ${table} BEGIN SELECT RAISE(ABORT,'immutable evidence'); END`,
    ]);
  }
export const MIGRATION_SQL = definitions.map(([, , sql]) => `${sql};`).join("\n");
export const MIGRATION_CHECKSUM = sha256(MIGRATION_SQL);
export function engine(db: Database) {
  const row = record(
    db.prepare("SELECT sqlite_version() version, sqlite_source_id() source").get(),
  );
  return { version: text(row.version), source: text(row.source) };
}
function identity(db: Database): "new" | "current" {
  const application = integer(db.pragma("application_id", { simple: true })),
    version = integer(db.pragma("user_version", { simple: true }));
  const rows = db
    .prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*' ORDER BY name")
    .all()
    .map(record);
  if (application === 0n && version === 0n && rows.length === 0) return "new";
  if (application !== BigInt(APPLICATION_ID) || version !== 1n)
    throw new StorageError("storage_schema_version");
  if (
    rows.length !== definitions.length ||
    definitions.some(
      ([type, name, sql]) => !rows.some((r) => r.type === type && r.name === name && r.sql === sql),
    )
  )
    throw new StorageError("storage_corrupt");
  const ledger = db.prepare("SELECT * FROM schema_migrations").all().map(record);
  if (
    ledger.length !== 1 ||
    ledger[0]?.version !== 1n ||
    ledger[0]?.checksum !== MIGRATION_CHECKSUM
  )
    throw new StorageError("storage_corrupt");
  return "current";
}
function settings(db: Database) {
  db.pragma("foreign_keys=ON");
  db.pragma("trusted_schema=OFF");
  db.pragma("synchronous=EXTRA");
  db.pragma("busy_timeout=500");
  for (const [name, value] of [
    ["foreign_keys", 1n],
    ["trusted_schema", 0n],
    ["synchronous", 3n],
    ["busy_timeout", 500n],
  ] as const)
    if (db.pragma(name, { simple: true }) !== value)
      throw new StorageError("storage_configuration");
  if (db.pragma("journal_mode", { simple: true }) !== "delete")
    throw new StorageError("storage_configuration");
}
export function initialize(db: Database) {
  db.exec("BEGIN");
  let state: "new" | "current", info: ReturnType<typeof engine>;
  try {
    state = identity(db);
    info = engine(db);
    db.exec("COMMIT");
  } catch (error) {
    if (db.inTransaction) db.exec("ROLLBACK");
    throw error;
  }
  if (info.version !== "3.54.1") throw new StorageError("storage_configuration");
  if (state === "new") {
    db.pragma("journal_mode=DELETE");
    settings(db);
    db.exec("BEGIN IMMEDIATE");
    try {
      if (identity(db) === "new") {
        db.exec(MIGRATION_SQL);
        db.prepare("INSERT INTO schema_migrations VALUES (1,?,?,?,?,?,?)").run(
          MIGRATION_CHECKSUM,
          Date.now(),
          process.version,
          DRIVER_VERSION,
          info.version,
          info.source,
        );
        db.pragma(`application_id=${APPLICATION_ID}`);
        db.pragma("user_version=1");
      }
      db.exec("COMMIT");
    } catch (error) {
      if (db.inTransaction) db.exec("ROLLBACK");
      throw error;
    }
  }
  identity(db);
  settings(db);
  return { driver: DRIVER_VERSION, ...info };
}
export function verifyReadOnly(db: Database) {
  if (identity(db) !== "current") throw new StorageError("storage_schema_version");
  settings(db);
}
