import { createRequire } from "node:module";

// Deliberately limited vendor facade. Every row remains unknown until validated.
export interface Statement {
  get(...values: readonly unknown[]): unknown;
  all(...values: readonly unknown[]): unknown[];
  run(...values: readonly unknown[]): unknown;
}
export interface Database {
  readonly inTransaction: boolean;
  prepare(sql: string): Statement;
  exec(sql: string): unknown;
  pragma(sql: string, options?: { simple: boolean }): unknown;
  defaultSafeIntegers(value: boolean): unknown;
  close(): unknown;
}
export type Connect = (path: string, readonly?: boolean) => Database;
const require = createRequire(import.meta.url);
export const DRIVER_VERSION = "13.2.0";
export const connect: Connect = (path, readonly = false) => {
  if (record(require("better-sqlite3/package.json")).version !== DRIVER_VERSION)
    throw new StorageError("storage_configuration");
  const Driver = require("better-sqlite3") as new (
    path: string,
    options: { readonly: boolean; timeout: number },
  ) => Database;
  const db = new Driver(path, { readonly, timeout: 500 });
  db.defaultSafeIntegers(true);
  return db;
};
export type StorageReason =
  | "storage_busy"
  | "storage_readonly"
  | "storage_full"
  | "storage_io"
  | "storage_corrupt"
  | "storage_schema_version"
  | "storage_configuration"
  | "storage_conflict"
  | "storage_encoding"
  | "storage_unavailable";
export class StorageError extends Error {
  readonly reason: StorageReason;
  constructor(reason: StorageReason) {
    super(reason);
    this.reason = reason;
    this.name = "StorageError";
  }
}
export function storageReason(error: unknown): StorageReason {
  if (error instanceof StorageError) return error.reason;
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (["EACCES", "EPERM"].includes(code)) return "storage_readonly";
  if (["ENOSPC", "EDQUOT"].includes(code)) return "storage_full";
  if (["EIO", "ENOENT", "ENOTDIR", "EISDIR"].includes(code)) return "storage_io";
  if (/^SQLITE_(BUSY|LOCKED)/.test(code)) return "storage_busy";
  if (/^SQLITE_READONLY/.test(code)) return "storage_readonly";
  if (code === "SQLITE_FULL") return "storage_full";
  if (/^SQLITE_(IOERR|CANTOPEN)/.test(code)) return "storage_io";
  if (/^SQLITE_(CORRUPT|NOTADB)/.test(code)) return "storage_corrupt";
  if (/^SQLITE_CONSTRAINT/.test(code)) return "storage_conflict";
  return "storage_unavailable";
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new StorageError("storage_corrupt");
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  if (typeof value !== "string") throw new StorageError("storage_corrupt");
  return value;
}
export function integer(value: unknown): bigint {
  if (typeof value !== "bigint") throw new StorageError("storage_corrupt");
  return value;
}
