import { isEnabled } from "@h2india/config";
import { getDb, Money } from "@h2india/core";
import { loadActor, scopeFor } from "@h2india/core/authz";
import { supplierSettlements } from "@h2india/core/orders";
import { supplierOf } from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import { getSession } from "@/server/auth";

// A month's statement as CSV (822:13666, Download statement 308:6774): every release with its fee and deductions.
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(request: Request) {
  if (!isEnabled("transactions")) return new Response(null, { status: 404 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return new Response("Choose a month", { status: 400 });
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const supplier = await supplierOf(db, actor);
  if (!supplier?.seat.permissions.has("money.view")) return new Response(null, { status: 403 });
  const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 7);
  const rows = (await supplierSettlements(scopeFor(actor), db, supplier.organisationId)).filter(
    (r) => ist(r.settlement.createdAt) === month,
  );
  const p = (v: bigint) => Money.format(v, { symbol: false, paise: "always" });
  const lines = [
    ["Date", "Order", "Buyer", "Released", "Fee", "GST on fee", "TCS", "TDS", "You receive", "Payout", "Rate card"],
    ...rows.map((r) => [
      formatIstDate(r.settlement.createdAt),
      r.reference,
      r.buyer,
      p(r.settlement.releasedPaise),
      p(r.settlement.feePaise),
      p(r.settlement.gstOnFeePaise),
      p(r.settlement.tcsPaise),
      p(r.settlement.tdsPaise),
      p(r.settlement.netPaise),
      r.payoutRef ?? "",
      r.settlement.rateCardVersion,
    ]),
  ];
  return new Response(lines.map((l) => l.map(cell).join(",")).join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="statement-${month}.csv"`,
    },
  });
}
