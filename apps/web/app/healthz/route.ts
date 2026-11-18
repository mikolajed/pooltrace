import { publicConfig } from "../../lib/public-config.ts";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    const config = publicConfig();
    const instanceId = process.env.POOLTRACE_INSTANCE_ID;
    if (!instanceId) throw new Error();
    return Response.json(
      {
        contractVersion: config.contractVersion,
        application: "web",
        runId: config.runId,
        instanceId,
        phase: "ready",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { reason: "configuration" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
