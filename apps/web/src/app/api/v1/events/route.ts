import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { recordEvent } from "@h2india/core/supplier";
import { getSession } from "@/server/auth";

// POST /api/v1/events (step 8.8): a listing or storefront view from the page's beacon. No person is stored (only the
// viewer company's state); operators, the supplier's own team and robots aren't counted.
const BOT = /bot|crawl|spider|preview|headless|lighthouse/i;

export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    productId?: string;
    organisationId?: string;
    productIds?: string[];
  };
  const id = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);
  const session = await getSession().catch(() => null);
  const db = getDb();
  const viewer = session ? await loadActor(db, session.user.id) : null;
  if (body.type === "listing_viewed" && id(body.productId))
    await recordEvent(db, { type: "listing_viewed", productId: id(body.productId), viewer });
  else if (body.type === "profile_viewed" && id(body.organisationId))
    await recordEvent(db, { type: "profile_viewed", organisationId: id(body.organisationId), viewer });
  else if (body.type === "compared" && Array.isArray(body.productIds)) {
    for (const p of body.productIds.slice(0, 5))
      if (id(p)) await recordEvent(db, { type: "compared", productId: p, viewer });
  }
  return new Response(null, { status: 204 });
}
