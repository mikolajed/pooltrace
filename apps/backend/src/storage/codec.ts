import { createHash } from "node:crypto";
import { StorageError } from "./driver.ts";

export const CODEC = "storage-evidence-v1";
export const MAX_BYTES = 4 * 1024 * 1024;
export interface Document {
  json: string;
  paths: string;
}
export const sha256 = (bytes: string) => createHash("sha256").update(bytes).digest("hex");
const pointerKey = (s: string) => s.replaceAll("~", "~0").replaceAll("/", "~1");
export function encode(value: unknown): Document {
  const paths: string[] = [],
    seen = new Set<object>();
  let nodes = 0;
  function visit(v: unknown, path: string, depth: number): string {
    if (++nodes > 200_000 || depth > 64) throw new StorageError("storage_encoding");
    if (typeof v === "bigint") {
      paths.push(path);
      return JSON.stringify(v.toString());
    }
    if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "number" && Number.isFinite(v)) return JSON.stringify(v);
    if (!v || typeof v !== "object" || seen.has(v) || Object.getOwnPropertySymbols(v).length)
      throw new StorageError("storage_encoding");
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null)
      throw new StorageError("storage_encoding");
    seen.add(v);
    let result: string;
    if (Array.isArray(v)) {
      if (Object.keys(v).length !== v.length) throw new StorageError("storage_encoding");
      result = `[${Array.from(v, (item, i) => visit(item, `${path}/${i}`, depth + 1)).join(",")}]`;
    } else {
      const parts: string[] = [];
      for (const key of Object.keys(v).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(v, key);
        if (!descriptor || !("value" in descriptor)) throw new StorageError("storage_encoding");
        if (descriptor.value !== undefined)
          parts.push(
            `${JSON.stringify(key)}:${visit(descriptor.value, `${path}/${pointerKey(key)}`, depth + 1)}`,
          );
      }
      result = `{${parts.join(",")}}`;
    }
    seen.delete(v);
    return result;
  }
  const json = visit(value, "", 0),
    map = JSON.stringify(paths.sort());
  if (Buffer.byteLength(json) + Buffer.byteLength(map) > MAX_BYTES)
    throw new StorageError("storage_encoding");
  return { json, paths: map };
}
export function decode(doc: Document): unknown {
  try {
    if (Buffer.byteLength(doc.json) + Buffer.byteLength(doc.paths) > MAX_BYTES) throw new Error();
    const paths: unknown = JSON.parse(doc.paths);
    if (
      !Array.isArray(paths) ||
      paths.some((p) => typeof p !== "string") ||
      new Set(paths).size !== paths.length
    )
      throw new Error();
    const set = new Set<string>(paths),
      found = new Set<string>();
    let nodes = 0;
    function revive(v: unknown, path: string, depth: number): unknown {
      if (++nodes > 200_000 || depth > 64) throw new Error();
      if (set.has(path)) {
        if (typeof v !== "string" || !/^(0|-[1-9][0-9]*|[1-9][0-9]*)$/.test(v)) throw new Error();
        found.add(path);
        return BigInt(v);
      }
      if (Array.isArray(v)) return v.map((x, i) => revive(x, `${path}/${i}`, depth + 1));
      if (v && typeof v === "object")
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, revive(x, `${path}/${pointerKey(k)}`, depth + 1)]),
        );
      return v;
    }
    const result = revive(JSON.parse(doc.json), "", 0),
      encoded = encode(result);
    if (found.size !== set.size || encoded.json !== doc.json || encoded.paths !== doc.paths)
      throw new Error();
    return result;
  } catch {
    throw new StorageError("storage_corrupt");
  }
}
export function digest(value: unknown): string {
  const doc = encode(value);
  return sha256(`${CODEC}\n${doc.json}\n${doc.paths}`);
}
export const revision = (kind: string, id: string, parent: string | null, value: unknown) =>
  digest({ codec: CODEC, kind, id, parent, value });
