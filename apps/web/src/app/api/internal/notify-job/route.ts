import { isInternalKey } from "@h2india/core";
import { sendReminder } from "@/events/data";

// POST /api/internal/notify-job: the worker's notify queue (step 5.7). Messages whose templates live in the web app:
// webinar reminders one day and one hour before (676:83 variants, WhatsApp 676:459). Each is sent at most once.
export async function POST(request: Request) {
  if (!isInternalKey(request.headers.get("x-internal-key"))) return new Response(null, { status: 404 });
  const q = new URL(request.url).searchParams;
  if (q.get("job") === "webinar-reminder") {
    const which = q.get("which") === "day" ? "day" : "hour";
    return Response.json({ result: await sendReminder(q.get("registrationId") ?? "", which) });
  }
  return Response.json({ error: "unknown job" }, { status: 400 });
}
