import { getDb, Money } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { listOrders, SUPPLIER_PIPELINE } from "@h2india/core/orders";
import { buttonClasses, cx, EmptyState, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { pipelineBadge, supplierNextStep } from "@/orders/views";
import { requireTransactionsPage } from "@/orders/guard";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Supplier orders pipeline (810:12156; phones 811:12343; states 811:12517), step 10.7. The stage tiles filter the
// open orders (?stage=); Paid out counts orders closed this month. ?state= forces the designed states.
export const metadata: Metadata = { title: "Orders · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SupplierOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; state?: string }>;
}) {
  requireTransactionsPage();
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/orders");
  const s = page.supplier;
  const now = new Date();
  const all = await listOrders(scopeFor(page.actor), getDb(), { organisationId: s.organisationId, side: "supplier" });
  const monthStart = new Date(now.getTime() + 5.5 * 3_600_000);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const inStage = (key: string) => {
    const stage = SUPPLIER_PIPELINE.find((x) => x.key === key);
    return all.filter(
      (o) =>
        (stage?.statuses as readonly string[] | undefined)?.includes(o.status) &&
        (key !== "paid" || (o.closedAt && o.closedAt.getTime() + 5.5 * 3_600_000 >= monthStart.getTime())),
    );
  };
  const open = all.filter((o) =>
    SUPPLIER_PIPELINE.slice(0, 6).some((st) => (st.statuses as readonly string[]).includes(o.status)),
  );
  const stage = SUPPLIER_PIPELINE.find((x) => x.key === sp.stage)?.key ?? null;
  const shown = stage ? inStage(stage) : open;
  const paid = inStage("paid").length;
  const overdue = inStage("pending").filter((o) => o.overdue).length;
  const state = forcedState(sp.state) ?? (all.length ? "ready" : "empty");
  return (
    <SupplierShell page={page} current="/supplier/orders" title="Orders">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="type-h2">Orders</h1>
          <p className="type-body text-body">
            Accept new orders within 48 hours.
            <span className="max-md:hidden"> Dispatch opens once the invoice, e-way bill and certificates are in.</span>
          </p>
        </div>
        <a href="/supplier/orders/export" className={cx(buttonClasses({ variant: "outline" }), "max-md:hidden")}>
          Export CSV
        </a>
      </div>
      <LiveSection
        label="Orders"
        state={state}
        errorTitle="Orders didn't load"
        errorText="Check your connection and try again. Acceptance timers keep running, and we email you about new orders."
        skeleton={
          <div className="flex flex-col gap-2.5 rounded-card border border-default bg-page p-6">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page p-6">
            <EmptyState
              title="No orders yet"
              action={
                s.seat.permissions.has("product.manage") ? (
                  <Link href="/supplier/products/new" className={buttonClasses({})}>
                    Add product
                  </Link>
                ) : undefined
              }
            >
              When a buyer accepts one of your quotes, the order lands here. You&apos;ll have 48 hours to accept it.
            </EmptyState>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <nav aria-label="Order stages" className="max-md:hidden">
            <ul className="grid grid-cols-7 gap-2">
              {SUPPLIER_PIPELINE.map((st) => {
                const n = inStage(st.key).length;
                const active = stage === st.key;
                const note =
                  st.key === "pending" && overdue ? { text: `${String(overdue)} overdue`, tone: "text-error" } : null;
                return (
                  <li key={st.key}>
                    <Link
                      href={active ? "/supplier/orders" : `/supplier/orders?stage=${st.key}`}
                      aria-current={active ? "true" : undefined}
                      className={cx(
                        "flex h-31 flex-col gap-1 rounded-control px-3.5 py-3",
                        active ? "border-2 border-selected bg-mint" : "border border-default bg-page",
                      )}
                    >
                      <span className="type-h3">{n}</span>
                      <span className="type-body-sm text-body">{st.label}</span>
                      {note ? <span className={cx("type-caption", note.tone)}>{note.text}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <nav aria-label="Order stages" className="-mx-4 overflow-x-auto px-4 md:hidden">
            <ul className="flex gap-2">
              {SUPPLIER_PIPELINE.map((st) => {
                const active = stage === st.key;
                return (
                  <li key={st.key} className="shrink-0">
                    <Link
                      href={active ? "/supplier/orders" : `/supplier/orders?stage=${st.key}`}
                      aria-current={active ? "true" : undefined}
                      className={cx(
                        "inline-flex h-10 items-center gap-1.5 rounded-pill px-3.5 type-label",
                        active ? "bg-inverse text-inverse" : "border border-default bg-page",
                      )}
                    >
                      {st.label} <span className={active ? "" : "text-secondary"}>{inStage(st.key).length}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {shown.length ? (
            <>
              <div
                tabIndex={0}
                role="region"
                aria-label="Open orders"
                className="relative overflow-x-auto rounded-card border border-default bg-page max-md:hidden"
              >
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-default bg-subtle text-left type-label text-secondary">
                      <th scope="col" className="w-[156px] px-4 py-2.5">
                        Order
                      </th>
                      <th scope="col" className="w-[180px] py-2.5">
                        Buyer
                      </th>
                      <th scope="col" className="w-[220px] py-2.5">
                        Items
                      </th>
                      <th scope="col" className="w-[140px] py-2.5">
                        Total incl. GST
                      </th>
                      <th scope="col" className="w-[170px] py-2.5">
                        Stage
                      </th>
                      <th scope="col" className="py-2.5 pr-4">
                        Next step
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((o) => {
                      const next = supplierNextStep(o, now);
                      const badge = pipelineBadge(o);
                      return (
                        <tr key={o.id} className="border-b border-default last:border-b-0">
                          <td className="px-4 py-3.5">
                            <Link
                              href={`/supplier/orders/${o.id}`}
                              className="type-spec underline-offset-2 hover:underline"
                            >
                              {o.reference}
                            </Link>
                          </td>
                          <td className="py-3.5 pr-2 type-body-sm">{o.buyerName}</td>
                          <td className="py-3.5 pr-2 type-body-sm">{o.itemSummary}</td>
                          <td className="py-3.5 type-spec">{Money.format(o.totalPaise)}</td>
                          <td className="py-3.5">
                            <StatusBadge status={badge.label} tone={badge.tone} />
                          </td>
                          <td className={cx("py-3.5 pr-4 type-body-sm", next.urgent && "text-error")}>{next.text}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="flex flex-col gap-3 md:hidden">
                {shown.map((o) => {
                  const next = supplierNextStep(o, now);
                  const badge = pipelineBadge(o);
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/supplier/orders/${o.id}`}
                        className="flex flex-col gap-2 rounded-card border border-default bg-page p-4"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="type-spec">{o.reference}</span>
                          <StatusBadge status={badge.label} tone={badge.tone} />
                        </span>
                        <span className="type-label">
                          {o.buyerName} · {Money.format(o.totalPaise)}
                        </span>
                        <span className="type-body-sm text-body">{o.itemSummary}</span>
                        <span className={cx("type-caption", next.urgent ? "text-error" : "text-secondary")}>
                          {next.text}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="rounded-card border border-default bg-page">
              <EmptyState title="Nothing at this stage">Orders move here as they progress.</EmptyState>
            </div>
          )}
          <p className="type-caption text-secondary">
            Showing {shown.length} {stage ? "orders" : "open orders"} · {paid} paid out this month are under Paid out.
            Times in IST.
          </p>
        </div>
      </LiveSection>
    </SupplierShell>
  );
}
