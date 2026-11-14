import { trackerRecords } from "@/tracker/data";
import { applyFilters, subView, toCsv } from "@/tracker/views";

// GET /tracker/<view>/csv: Download CSV (738:5437…), the same filtered rows as the page, each with its source and
// as-of date (A34).
export async function GET(request: Request, { params }: { params: Promise<{ view: string }> }) {
  const view = subView((await params).view);
  if (!view) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const chosen = Object.fromEntries(view.filters([]).map((f) => [f.name, url.searchParams.get(f.name) ?? ""]));
  const rows = applyFilters(view, await trackerRecords(view.slug), chosen);
  return new Response(String.fromCharCode(0xfeff) + toCsv(view, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="h2india-tracker-${view.path}.csv"`,
      "cache-control": "no-store",
    },
  });
}
