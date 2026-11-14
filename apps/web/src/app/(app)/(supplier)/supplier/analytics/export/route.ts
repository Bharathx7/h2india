import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { supplierAnalytics } from "@h2india/core/supplier";
import { requireSupplier } from "@/supplier/shell";

// GET /supplier/analytics/export: the last 30 days as a CSV (814:12112 "Export CSV"). The supplier's own figures only.
export async function GET() {
  const page = await requireSupplier("/supplier/analytics");
  const a = await supplierAnalytics(getDb(), scopeFor(page.actor), page.supplier.organisationId);
  const q = (v: string) =>
    /[",\n]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"` : v;
  const lines = [
    `period,${a.from} to ${a.to}`,
    `views,${String(a.views)}`,
    `enquiries,${String(a.enquiries)}`,
    `saves,${String(a.saves)}`,
    `compared,${String(a.compared)}`,
    `storefront views,${String(a.storefrontViews)}`,
    "",
    "product,views,enquiries,saves",
    ...a.top.map((p) => [q(p.name), p.views, p.enquiries, p.saves].join(",")),
    "",
    "buyer state,share of views (%)",
    ...a.states.map((s) => `${q(s.state)},${String(s.share)}`),
  ];
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="h2india-analytics-${a.to}.csv"`,
      "cache-control": "no-store",
    },
  });
}
