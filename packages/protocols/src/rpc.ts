import {
  type Abi,
  type Address,
  type Hash,
  type Hex,
  createPublicClient,
  custom,
  decodeFunctionResult,
  encodeFunctionData,
  parseAbi,
} from "viem";
import { mainnet } from "viem/chains";
import {
  type Clock,
  type Header,
  POLICY,
  type RequestEvidence,
  RpcFailure,
  failure,
  systemClock,
} from "./types.ts";

const allowedMethods = new Set([
  "eth_chainId",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getCode",
  "eth_call",
]);
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const quantityPattern = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;
const dataPattern = /^0x(?:[0-9a-fA-F]{2})*$/;
export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new RpcFailure("cancelled");
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new RpcFailure("cancelled"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export function quantity(value: unknown): bigint {
  if (typeof value !== "string" || !quantityPattern.test(value)) throw new RpcFailure("malformed");
  return BigInt(value);
}
export function header(value: unknown): Header {
  if (!value || typeof value !== "object") throw new RpcFailure("state_unavailable");
  const v = value as Record<string, unknown>;
  if (
    typeof v.hash !== "string" ||
    !hashPattern.test(v.hash) ||
    typeof v.parentHash !== "string" ||
    !hashPattern.test(v.parentHash)
  ) {
    throw new RpcFailure("malformed");
  }
  return {
    number: quantity(v.number),
    timestamp: quantity(v.timestamp),
    hash: v.hash as Hash,
    parentHash: v.parentHash as Hash,
  };
}

function rpcError(value: unknown): RpcFailure {
  if (!value || typeof value !== "object") return new RpcFailure("malformed");
  const v = value as Record<string, unknown>;
  const message = typeof v.message === "string" ? v.message.toLowerCase() : "";
  if (/not canonical|non.?canonical/.test(message)) return new RpcFailure("noncanonical");
  if (
    /(?:header|block).*not found|unknown block|cannot find.*block|missing trie|historical state|state.*not available/.test(
      message,
    )
  )
    return new RpcFailure("state_unavailable");
  if (/execution reverted/.test(message)) return new RpcFailure("reverted");
  if (v.code === -32601 || v.code === -32602) return new RpcFailure("unsupported");
  return new RpcFailure("rpc");
}

export class RpcSession {
  readonly requests: RequestEvidence[] = [];
  readonly clock: Clock;
  readonly startedWall: number;
  readonly startedMono: number;
  readonly signal: AbortSignal;
  clockInvalid = false;
  private readonly controller = new AbortController();
  private readonly timer: ReturnType<typeof setTimeout>;
  private readonly fetcher: Fetch;
  private readonly url: string;
  private readonly client;
  private active = 0;
  private sequence = 0;
  private lastWall: number;
  private lastMono: number;
  private readonly waiting: Array<() => void> = [];

  constructor(options: { url: string; clock?: Clock; fetch?: Fetch; signal?: AbortSignal }) {
    let parsed: URL;
    try {
      parsed = new URL(options.url);
    } catch {
      throw new RpcFailure("configuration");
    }
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password)
      throw new RpcFailure("configuration");
    this.url = options.url;
    this.clock = options.clock ?? systemClock;
    this.fetcher = options.fetch ?? fetch;
    this.startedWall = this.clock.wall();
    this.startedMono = this.clock.mono();
    this.lastWall = this.startedWall;
    this.lastMono = this.startedMono;
    this.signal = options.signal
      ? AbortSignal.any([this.controller.signal, options.signal])
      : this.controller.signal;
    this.timer = setTimeout(() => this.controller.abort("deadline"), POLICY.attemptTimeoutMs);
    const transport = custom(
      { request: async ({ method, params }) => this.request(method, params ?? []) },
      { retryCount: 0 },
    );
    this.client = createPublicClient({
      chain: mainnet,
      transport,
      cacheTime: 0,
      batch: { multicall: false },
    });
  }

  private guard(): void {
    const wall = this.clock.wall();
    const mono = this.clock.mono();
    if (
      wall < this.lastWall ||
      mono < this.lastMono ||
      wall - this.lastWall + 2 < mono - this.lastMono
    )
      this.clockInvalid = true;
    this.lastWall = wall;
    this.lastMono = mono;
    if (mono - this.startedMono >= POLICY.attemptTimeoutMs) throw new RpcFailure("deadline");
    if (this.signal.aborted)
      throw new RpcFailure(this.controller.signal.reason === "deadline" ? "deadline" : "cancelled");
  }
  private async acquire(): Promise<void> {
    this.guard();
    if (this.active < POLICY.concurrency) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const ready = () => {
        this.signal.removeEventListener("abort", aborted);
        resolve();
      };
      const aborted = () => {
        const index = this.waiting.indexOf(ready);
        if (index >= 0) this.waiting.splice(index, 1);
        reject(
          new RpcFailure(this.controller.signal.reason === "deadline" ? "deadline" : "cancelled"),
        );
      };
      this.waiting.push(ready);
      this.signal.addEventListener("abort", aborted, { once: true });
    });
    try {
      this.guard();
    } catch (error) {
      this.release();
      throw error;
    }
  }
  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
  private async wait(ms: number): Promise<void> {
    this.guard();
    if (this.clock.mono() - this.startedMono + ms >= POLICY.attemptTimeoutMs)
      throw new RpcFailure("deadline");
    await new Promise<void>((resolve, reject) => {
      const aborted = () => {
        clearTimeout(timer);
        reject(
          new RpcFailure(this.controller.signal.reason === "deadline" ? "deadline" : "cancelled"),
        );
      };
      const timer = setTimeout(() => {
        this.signal.removeEventListener("abort", aborted);
        resolve();
      }, ms);
      this.signal.addEventListener("abort", aborted, { once: true });
    });
  }
  private async send(method: string, params: readonly unknown[]): Promise<unknown> {
    this.guard();
    const id = ++this.sequence;
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), POLICY.requestTimeoutMs);
    const signal = AbortSignal.any([this.signal, timeout.signal]);
    try {
      const response = await abortable(
        this.fetcher(this.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
          signal,
        }),
        signal,
      );
      this.guard();
      if (timeout.signal.aborted) throw new RpcFailure("timeout");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new RpcFailure("authorization");
        if (response.status === 429 || response.status >= 500) {
          const raw = response.headers.get("retry-after");
          let wait =
            raw === null
              ? 0
              : /^\d+(?:\.\d+)?$/.test(raw)
                ? Number(raw) * 1000
                : Date.parse(raw) - this.clock.wall();
          if (!Number.isFinite(wait) || wait < 0) wait = 0;
          throw new RpcFailure(response.status === 429 ? "rate_limited" : "server", wait);
        }
        throw new RpcFailure("rpc");
      }
      const body: unknown = await abortable(response.json(), signal);
      this.guard();
      if (timeout.signal.aborted) throw new RpcFailure("timeout");
      if (!body || typeof body !== "object") throw new RpcFailure("malformed");
      const result = body as Record<string, unknown>;
      if (result.jsonrpc !== "2.0" || result.id !== id) throw new RpcFailure("malformed");
      if ("error" in result) throw rpcError(result.error);
      if (!("result" in result)) throw new RpcFailure("malformed");
      return result.result;
    } catch (error) {
      this.guard();
      if (timeout.signal.aborted) throw new RpcFailure("timeout");
      if (error instanceof RpcFailure) throw error;
      if (error instanceof SyntaxError) throw new RpcFailure("malformed");
      throw new RpcFailure("network");
    } finally {
      clearTimeout(timer);
    }
  }

  async request(method: string, params: readonly unknown[] = []): Promise<unknown> {
    if (!allowedMethods.has(method)) throw new RpcFailure("configuration");
    if (method === "eth_call" || method === "eth_getCode") {
      const block = params[1];
      if (
        !block ||
        typeof block !== "object" ||
        !("blockHash" in block) ||
        typeof block.blockHash !== "string" ||
        !hashPattern.test(block.blockHash) ||
        !("requireCanonical" in block) ||
        block.requireCanonical !== true
      )
        throw new RpcFailure("configuration");
    }
    await this.acquire();
    try {
      for (let send = 1; send <= POLICY.maxSends; send++) {
        try {
          const result = await this.send(method, params);
          this.requests.push({ method, send, outcome: "success" });
          return result;
        } catch (error) {
          const safe = failure(error);
          this.requests.push({ method, send, outcome: safe.reason });
          if (
            send === POLICY.maxSends ||
            !["network", "timeout", "rate_limited", "server"].includes(safe.reason)
          )
            throw safe;
          await this.wait(Math.max(POLICY.retryWaitMs, safe.retryAfterMs));
        }
      }
      throw new RpcFailure("rpc");
    } finally {
      this.release();
    }
  }
  async chain(): Promise<bigint> {
    return quantity(await this.request("eth_chainId"));
  }
  async block(number: bigint | "latest"): Promise<Header> {
    return header(
      await this.request("eth_getBlockByNumber", [
        number === "latest" ? number : `0x${number.toString(16)}`,
        false,
      ]),
    );
  }
  async code(address: Address, hash: Hash): Promise<Hex | undefined> {
    try {
      const result = await this.client.getCode({
        address,
        blockHash: hash,
        requireCanonical: true,
      });
      if (result !== undefined && !dataPattern.test(result)) throw new RpcFailure("malformed");
      return result;
    } catch (error) {
      throw failure(error);
    }
  }
  async contract(
    address: Address,
    signature: string,
    args: readonly unknown[],
    hash: Hash,
  ): Promise<unknown> {
    try {
      const abi: Abi = parseAbi([signature]);
      const functionName = signature.split("(")[0]?.replace("function ", "");
      if (!functionName) throw new RpcFailure("configuration");
      const data = encodeFunctionData({ abi, functionName, args });
      const result = await this.client.call({
        to: address,
        data,
        blockHash: hash,
        requireCanonical: true,
        batch: false,
      });
      if (!result.data || result.data === "0x" || !dataPattern.test(result.data))
        throw new RpcFailure("malformed");
      return decodeFunctionResult({ abi, functionName, data: result.data });
    } catch (error) {
      throw failure(error);
    }
  }
  close(): void {
    clearTimeout(this.timer);
    this.controller.abort("closed");
  }
}
