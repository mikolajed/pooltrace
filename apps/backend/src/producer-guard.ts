import { randomUUID } from "node:crypto";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export class ProducerOwnershipError extends Error {
  readonly reason = "producer_unavailable";
  constructor() {
    super("producer_unavailable");
  }
}
function canonical(path: string) {
  path = resolve(path);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  let database = join(realpathSync(dirname(path)), basename(path));
  try {
    database = realpathSync(database);
    if (statSync(database).nlink !== 1) throw new ProducerOwnershipError();
  } catch (e) {
    if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ENOENT") throw e;
  }
  return database;
}
export function acquireProducer(path: string) {
  let fd: number | undefined;
  try {
    const dbPath = canonical(path),
      ownerPath = `${dbPath}.owner`,
      token = randomUUID();
    fd = openSync(ownerPath, "wx", 0o600);
    writeFileSync(fd, JSON.stringify({ token, pid: process.pid }));
    closeSync(fd);
    fd = undefined;
    const assertOwned = () => {
      try {
        if (statSync(ownerPath).size > 4096) throw new Error();
        const value: unknown = JSON.parse(readFileSync(ownerPath, "utf8"));
        if (
          !value ||
          typeof value !== "object" ||
          !("token" in value) ||
          value.token !== token ||
          canonical(path) !== dbPath
        )
          throw new Error();
      } catch {
        throw new ProducerOwnershipError();
      }
    };
    assertOwned();
    let released = false;
    return {
      dbPath,
      assertOwned,
      release() {
        if (!released) {
          assertOwned();
          unlinkSync(ownerPath);
          released = true;
        }
      },
    };
  } catch {
    if (fd !== undefined) closeSync(fd);
    throw new ProducerOwnershipError();
  }
}
export type ProducerGuard = ReturnType<typeof acquireProducer>;
