// Test-only barrier before the CLI enters a synchronous native database open/read.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const id = require.resolve("better-sqlite3"),
  Driver = require(id),
  entry = require.cache[id];
if (!entry) throw new Error("missing test module");
entry.exports = new Proxy(Driver, {
  construct(target, args) {
    process.stderr.write("STORAGE_TEST_OPEN\n");
    return Reflect.construct(target, args);
  },
});
