import { TRACKER_VIEWS } from "@/cms/tracker/options";
import { CHANGE_KINDS, changesCsv, filterChanges, PERIODS } from "@/tracker/changes";
import { recentChanges } from "@/tracker/data";

// GET /tracker/changes/csv: the Recent changes table as filtered (740:841).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const view = TRACKER_VIEWS.find((v) => v.view === q.get("view"))?.view;
  const kind = CHANGE_KINDS.find((k) => k.value === q.get("kind"))?.value ?? "";
  const days = Number(PERIODS.find((p) => p.value === q.get("period"))?.value ?? "30");
  const list = filterChanges(
    await recentChanges({ view, since: new Date(Date.now() - days * 86_400_000), limit: 2000 }),
    kind,
  );
  return new Response(String.fromCharCode(0xfeff) + changesCsv(list), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="h2india-tracker-changes.csv"',
      "cache-control": "no-store",
    },
  });
}
