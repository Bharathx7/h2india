import { getDb } from "@h2india/core";
import { turnOffAlert } from "@h2india/core/alerts";

// One-click unsubscribe for alert emails (RFC 8058, List-Unsubscribe-Post), step 7.3: turns off that alert only.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const label = await turnOffAlert(getDb(), token);
  return new Response(null, { status: label ? 200 : 404 });
}
