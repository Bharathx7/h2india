import { isEnabled } from "@h2india/config";
import { getDb, Money } from "@h2india/core";
import { loadActor, scopeFor } from "@h2india/core/authz";
import { listOrders } from "@h2india/core/orders";
import { supplierOf } from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import { getSession } from "@/server/auth";
import { supplierNextStep } from "@/orders/views";

// Export CSV on the orders pipeline (810:12156): the supplier's own orders, the columns the table shows.
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET() {
  if (!isEnabled("transactions")) return new Response(null, { status: 404 });
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const supplier = await supplierOf(db, actor);
  if (!supplier) return new Response(null, { status: 403 });
  const rows = await listOrders(scopeFor(actor), db, { organisationId: supplier.organisationId, side: "supplier" });
  const now = new Date();
  const lines = [
    ["Order", "Placed", "Buyer", "Items", "Total incl. GST", "Stage", "Next step"],
    ...rows.map((o) => [
      o.reference,
      formatIstDate(o.createdAt),
      o.buyerName,
      o.itemSummary,
      Money.format(o.totalPaise, { symbol: false }),
      o.status,
      supplierNextStep(o, now).text,
    ]),
  ];
  return new Response(lines.map((l) => l.map(cell).join(",")).join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="orders-${now.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
