import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const expectedNode = readFileSync(new URL(".node-version", root), "utf8").trim();
const expectedBun = readFileSync(new URL(".bun-version", root), "utf8").trim();

if (process.versions.node !== expectedNode || process.versions.bun) {
  throw new Error(`Use Node.js ${expectedNode} to run project tooling.`);
}

const actualBun = execFileSync("bun", ["--version"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();

if (actualBun !== expectedBun) {
  throw new Error(`Use Bun ${expectedBun}; found ${actualBun}.`);
}

console.log(`Toolchain ready: Node.js ${process.versions.node}, Bun ${actualBun}.`);
