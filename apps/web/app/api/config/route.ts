import { publicConfig } from "../../../lib/public-config.ts";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    return Response.json(publicConfig(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { reason: "configuration" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
