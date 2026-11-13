import { getDb } from "@h2india/core";
import { exportCsv, exportMemberData } from "@h2india/core/members";
import { getSession } from "@/server/auth";

// Download my data (step 7.4): the signed-in member's own records as JSON or CSV. Never cached.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Sign in first.", { status: 401 });
  const data = await exportMemberData(getDb(), session.user.id);
  const csv = new URL(request.url).searchParams.get("format") === "csv";
  const day = data.exportedAt.slice(0, 10);
  return new Response(csv ? exportCsv(data) : JSON.stringify(data, null, 2), {
    headers: {
      "content-type": csv ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="h2india-my-data-${day}.${csv ? "csv" : "json"}"`,
      "cache-control": "no-store",
    },
  });
}
