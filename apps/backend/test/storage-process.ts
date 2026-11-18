// Owned subprocess used only by the real-file restart/lock/crash tests.
import { EvidenceStore } from "../src/storage/store.ts";
import { connect } from "../src/storage/driver.ts";
const [mode, path, id] = process.argv.slice(2);
if (!path) throw new Error("missing test path");
const store = new EvidenceStore(path);
if (mode === "read") {
  if (!id) throw new Error("missing test revision");
  const result = store.getAnalysis(id);
  process.stdout.write(
    JSON.stringify(result, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v)),
  );
  store.close();
} else if (mode === "hold") {
  store.close();
  const db = connect(path);
  db.exec("BEGIN IMMEDIATE");
  db.exec(
    "INSERT INTO schema_migrations SELECT 2,checksum,applied_at_ms,node_version,driver_version,sqlite_version,sqlite_source_id FROM schema_migrations WHERE version=1",
  );
  process.stdout.write("READY\n");
  // Retain the native connection until this owned process is killed. An empty timer permits
  // garbage collection to close SQLite and release the writer lock while the process stays alive.
  setInterval(() => {
    if (!db.inTransaction) process.exit(1);
  }, 1000);
  setImmediate(() => global.gc?.());
} else {
  store.close();
  process.stdout.write("READY\n");
}
