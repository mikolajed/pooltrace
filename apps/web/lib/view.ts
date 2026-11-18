export interface Row {
  route: [number, number];
  input: string;
  output: string | null;
  gross: string | null;
  leg1: string | null;
  status: string;
  reason: string | null;
}
export interface Analysis {
  attemptId: string;
  rows: Row[];
  quotes: { quoteId: string; output: string | null }[];
  observation: Observation;
}
export interface Observation {
  attemptId: string;
  origin: string;
  chainId: string | null;
  block: { number: string; hash: string; timestamp: string } | null;
  finishedAt: number;
  validations?: { at: number; canonical: string }[];
}
export interface Eligibility {
  best: { gross: string; input: string; route: [number, number] } | null;
  freshness: string;
  blockAgeMs: number | null;
  canonical: string;
  workloadAdmitted: boolean;
  qualified: boolean;
  quotesComplete: boolean;
}
export interface Current {
  apiVersion: string;
  instanceId: string;
  sequence: number;
  asOf: number;
  mode: string;
  collector: string;
  attempts: number;
  phase: string;
  validForMs: number;
  result: {
    status: string;
    reason: string | null;
    analysis: Analysis | null;
    observation: Observation | null;
    eligibility: Eligibility | null;
    persistence: {
      status: string;
      reason: string | null;
      collectionRevisionId: string | null;
      lastSavedAnalysisRevisionId: string | null;
    };
  } | null;
}
export function formatAmount(value: string | null | undefined, decimals = 6) {
  if (value == null || !/^-?(0|[1-9][0-9]*)$/.test(value)) return "Unavailable";
  const amount = BigInt(value),
    absolute = amount < 0n ? -amount : amount,
    scale = 10n ** BigInt(decimals);
  const fraction = (absolute % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${amount < 0n ? "−" : ""}${absolute / scale}${fraction ? `.${fraction}` : ""}`;
}
export function confirmedDeadline(requestStarted: number, receivedAt: number, validForMs: number) {
  return Number.isFinite(validForMs) && validForMs > 0 && requestStarted + validForMs > receivedAt
    ? requestStarted + validForMs
    : 0;
}
export const venue = (ordinal: number) =>
  ["V2", "V3 · 0.05%", "V3 · 0.30%"][ordinal] ?? "Unavailable";
