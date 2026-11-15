import { getDb } from "@h2india/core";
import { receiveWebhook, WebhookRejected } from "@h2india/core/orders";

// POST /api/v1/payments/webhook (step 10.4, playbook Section 9): the payment partner's events. Verified by signature,
// stored unique by event id, processed once. 200 for processed and duplicates; 202 when stored but not processed yet
// (the partner retries); 400 for a bad signature. The body is read raw, as the signature covers the exact bytes.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  try {
    const result = await receiveWebhook(getDb(), raw, signature);
    return Response.json({ result }, { status: result === "stored" ? 202 : 200 });
  } catch (error) {
    if (error instanceof WebhookRejected) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
