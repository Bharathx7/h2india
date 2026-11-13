import { getDb } from "@h2india/core";
import { reportsOverview } from "@h2india/core/admin/system";
import { can, loadActor } from "@h2india/core/authz";
import { operatorSession } from "@/server/auth";
import { PERIODS, REPORT_DOWNLOADS } from "../report-groups";

// CSV downloads for Reports (716:348): one row per IST day and figure, from the nightly roll-ups only.
export const dynamic = "force-dynamic";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: Request) {
  const session = await operatorSession();
  if (!session) return new Response(null, { status: 404 });
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  if (!can(actor, "reports.view")) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const days = PERIODS.find((p) => String(p.days) === url.searchParams.get("days"))?.days ?? 30;
  const key = url.searchParams.get("report") ?? "all";
  const group = REPORT_DOWNLOADS.find((g) => g.key === key);
  const wanted: readonly string[] | null = group ? group.metrics : key === "all" ? null : [];
  if (wanted && !wanted.length) return new Response(null, { status: 404 });
  const metrics = (await reportsOverview(db, actor, days)).filter((m) => !wanted || wanted.includes(m.key));
  const lines = [["day (IST)", "figure", "value"].join(",")];
  for (const m of metrics) for (const s of m.series) lines.push([s.day, m.label, s.value].map(cell).join(","));
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="h2india-${group?.key ?? "all"}-last-${String(days)}-days.csv"`,
      "cache-control": "no-store",
    },
  });
}
