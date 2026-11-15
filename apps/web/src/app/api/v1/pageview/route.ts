import { getDb } from "@h2india/core";
import { recordPageView } from "@h2india/core/analytics";

// POST /api/v1/pageview (A176, M10 stand-in): one view of a public page, sent by the Analytics component only after
// the visitor accepts analytics cookies. Nothing about the visitor is read or stored.
const BOT = /bot|crawl|spider|preview|headless|lighthouse/i;

export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const body = (await request.json().catch(() => ({}))) as { path?: unknown };
  if (typeof body.path === "string") await recordPageView(getDb(), body.path);
  return new Response(null, { status: 204 });
}
