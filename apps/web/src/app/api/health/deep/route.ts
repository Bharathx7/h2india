import { getDb, isHealthToken } from "@h2india/core";
import { alarmChecks } from "@h2india/core/ops";

// GET /api/health/deep (step 13.3): every alarm and its state, for the outside uptime check. Needs the HEALTH_TOKEN
// bearer token (a plain 404 otherwise, so it isn't found by scanning). 503 when a critical alarm is failing, so any
// uptime tool alerts on the status alone.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!isHealthToken(auth?.startsWith("Bearer ") ? auth.slice(7) : null)) return new Response(null, { status: 404 });
  const alarms = await alarmChecks(getDb());
  const critical = alarms.filter((a) => !a.ok && a.severity === "critical");
  const warnings = alarms.filter((a) => !a.ok && a.severity === "warning");
  return Response.json(
    {
      status: critical.length ? "critical" : warnings.length ? "warning" : "ok",
      at: new Date().toISOString(),
      alarms: alarms.map(({ key, label, severity, ok, value, runbook }) => ({
        key,
        label,
        severity,
        ok,
        value,
        runbook,
      })),
    },
    { status: critical.length ? 503 : 200, headers: { "cache-control": "no-store" } },
  );
}
