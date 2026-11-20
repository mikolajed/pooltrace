import { type Clock, type Fetch, RpcFailure } from "@pooltrace/protocols";
import type { Category, Event, Stamp } from "./model.ts";

type Waiter = {
  category: Category;
  signal: AbortSignal;
  resolve: () => void;
  reject: () => void;
  abort: () => void;
};
async function untilAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new RpcFailure("cancelled");
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new RpcFailure("cancelled"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    if (signal.aborted) abort();
  });
}
export class RunTransport {
  readonly window: number;
  readonly limit: number;
  readonly reserve: number;
  readonly deadline: number;
  private readonly clock: Clock;
  private readonly append: (event: Event) => unknown;
  private readonly underlying: Fetch;
  sends = 0;
  active = 0;
  maxActive = 0;
  closing = false;
  private queue: Waiter[] = [];
  constructor(
    window: number,
    limit: number,
    reserve: number,
    deadline: number,
    clock: Clock,
    append: (event: Event) => unknown,
    underlying: Fetch = fetch,
  ) {
    this.window = window;
    this.limit = limit;
    this.reserve = reserve;
    this.deadline = deadline;
    this.clock = clock;
    this.append = append;
    this.underlying = underlying;
  }
  private check(category: Category, signal: AbortSignal) {
    if (signal.aborted) throw new RpcFailure("cancelled");
    if (this.clock.mono() >= this.deadline) throw new RpcFailure("deadline");
    if (
      (this.closing && category !== "reconciliation") ||
      this.sends >= this.limit - (category === "reconciliation" ? 0 : this.reserve)
    )
      throw new RpcFailure("budget");
  }
  private acquire(category: Category, signal: AbortSignal): Promise<void> {
    this.check(category, signal);
    if (this.active < 4 && !this.queue.length) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        category,
        signal,
        resolve,
        reject: () => reject(new RpcFailure("cancelled")),
        abort: () => {},
      };
      waiter.abort = () => {
        this.queue = this.queue.filter((item) => item !== waiter);
        waiter.reject();
      };
      this.queue.push(waiter);
      signal.addEventListener("abort", waiter.abort, { once: true });
      if (signal.aborted) waiter.abort();
    });
  }
  private release() {
    this.active--;
    const index = this.queue.findIndex((w) => w.category !== "observer");
    const waiter = this.queue.splice(Math.max(index, 0), 1)[0];
    if (waiter) {
      waiter.signal.removeEventListener("abort", waiter.abort);
      this.active++;
      waiter.resolve();
    }
  }
  logical(category: Category) {
    this.append({ kind: "logical", window: this.window, category });
  }
  fetchFor(category: () => Category): Fetch {
    return async (url, init, context) => {
      const label = category();
      const signal = init.signal ?? new AbortController().signal;
      await this.acquire(label, signal);
      try {
        this.check(label, signal);
        const body: unknown = JSON.parse(String(init.body));
        if (
          !body ||
          typeof body !== "object" ||
          !("method" in body) ||
          typeof body.method !== "string"
        )
          throw new RpcFailure("configuration");
        const id = ++this.sends;
        this.maxActive = Math.max(this.maxActive, this.active);
        const at = (): Stamp => ({ wall: this.clock.wall(), mono: this.clock.mono() });
        this.append({
          kind: "send",
          window: this.window,
          category: label,
          id,
          at: at(),
          method: body.method,
          retry: context?.retry ?? 1,
        });
        try {
          const response = await untilAbort(this.underlying(url, init), signal);
          // Hold the shared slot through body consumption, not merely through receipt of headers.
          const reader = response.body?.getReader();
          const abortReader = () => {
            void reader?.cancel().catch(() => {});
          };
          signal.addEventListener("abort", abortReader, { once: true });
          if (signal.aborted) abortReader();
          const chunks: Uint8Array[] = [];
          let length = 0;
          if (reader)
            try {
              while (true) {
                const result = await reader.read();
                if (result.done) break;
                length += result.value.byteLength;
                if (length > 1024 * 1024) throw new RpcFailure("malformed");
                chunks.push(result.value);
              }
            } finally {
              await reader.cancel().catch(() => {});
              reader.releaseLock();
              signal.removeEventListener("abort", abortReader);
            }
          if (signal.aborted) throw new RpcFailure("cancelled");
          const replay = new Response(
            [204, 205, 304].includes(response.status) ? null : Buffer.concat(chunks),
            { status: response.status, headers: response.headers },
          );
          this.append({
            kind: "reply",
            window: this.window,
            id,
            at: at(),
            outcome: `http_${response.status}`,
          });
          return replay;
        } catch (error) {
          this.append({
            kind: "reply",
            window: this.window,
            id,
            at: at(),
            outcome: signal.aborted ? "cancelled" : "transport_failure",
          });
          throw error;
        }
      } finally {
        this.release();
      }
    };
  }
}
