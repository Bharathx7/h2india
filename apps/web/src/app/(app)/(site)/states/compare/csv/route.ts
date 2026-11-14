import { STATE_OPTIONS } from "@/cms/records/common";
import { compareStates, MAX_STATES, toCsv } from "@/schemes/compare";

/** A byte-order mark, so Excel opens the file as UTF-8 (₹ and state names stay intact). */
const BOM = String.fromCharCode(0xfeff);

// GET /states/compare/csv?s=…: "Download CSV" on Compare states (751:7856). The same table as the page.
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams
    .getAll("s")
    .filter((v) => v !== "all-india" && STATE_OPTIONS.some((o) => o.value === v))
    .slice(0, MAX_STATES);
  const { states, rows } = await compareStates([...new Set(asked)]);
  return new Response(`${BOM}${toCsv(states, rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="h2india-state-policies.csv"',
      "cache-control": "no-store",
    },
  });
}
