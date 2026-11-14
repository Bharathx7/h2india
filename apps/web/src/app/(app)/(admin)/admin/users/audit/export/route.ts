import { exportAuditCsv, getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { operatorSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// GET /admin/users/audit/export: the filtered audit log as CSV (656:872). Needs users.export; the export is audited.
export async function GET(request: Request) {
  const session = await operatorSession();
  if (!session) return new Response(null, { status: 404 });
  const actor = await loadActor(getDb(), session.user.id);
  const sp = new URL(request.url).searchParams;
  const actorId = sp.get("actor");
  try {
    const csv = await exportAuditCsv(
      getDb(),
      actor,
      {
        actorId: actorId && /^[0-9a-f-]{36}$/i.test(actorId) ? actorId : undefined,
        action: sp.get("action") || undefined,
        resourceType: sp.get("type") || undefined,
        from: sp.get("from") ? new Date(`${sp.get("from") ?? ""}T00:00:00+05:30`) : undefined,
        to: sp.get("to") ? new Date(`${sp.get("to") ?? ""}T23:59:59+05:30`) : undefined,
      },
      await requestContext(),
    );
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="h2india-audit-log.csv"',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
