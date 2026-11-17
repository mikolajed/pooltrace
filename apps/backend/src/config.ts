import { RpcFailure } from "@pooltrace/protocols";

export interface BackendConfig {
  readonly rpcUrl: string;
  readonly providerLabel: string;
  readonly configurationRevision: string;
}
export function readConfig(env: Readonly<Record<string, string | undefined>>): BackendConfig {
  const rpcUrl = env.ETHEREUM_RPC_URL?.trim();
  const providerLabel = env.RPC_PROVIDER_LABEL?.trim() || "alchemy-ethereum";
  const configurationRevision = env.RPC_CONFIG_REVISION?.trim() || "alchemy-ethereum-v1";
  if (
    !rpcUrl ||
    !/^[a-z][a-z0-9_-]{0,63}$/.test(providerLabel) ||
    !/^[a-z][a-z0-9_-]{0,63}$/.test(configurationRevision)
  )
    throw new RpcFailure("configuration");
  try {
    const url = new URL(rpcUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      throw new Error();
  } catch {
    throw new RpcFailure("configuration");
  }
  return { rpcUrl, providerLabel, configurationRevision };
}
