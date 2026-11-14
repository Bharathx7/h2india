"use client";

import { Alert, Button, Icon, Input } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveQuickStockAction } from "./product-actions";

// Quick stock and price (722:12379), step 8.5: fixed-price products only; price, stock and dispatch days go live on
// save without review. Leaving with unsaved changes asks first (playbook DONE WHEN).

export interface QuickRow {
  id: string;
  name: string;
  model: string | null;
  sku: string | null;
  price: string;
  stockQty: string;
  shipDays: string;
  gstBps: number;
}

const rupees = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;
const num = (s: string) => Number(s.replace(/[₹,\s]/g, ""));

export function QuickStock({ rows, total }: { rows: QuickRow[]; total: number }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, QuickRow>>(() => Object.fromEntries(rows.map((r) => [r.id, r])));
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();
  const changed = useMemo(
    () =>
      rows.filter((r) => {
        const v = values[r.id];
        return v && (v.price !== r.price || v.stockQty !== r.stockQty || v.shipDays !== r.shipDays);
      }),
    [rows, values],
  );
  // Check as the supplier types: lead time at least a day (722:12379).
  const local = Object.fromEntries(
    changed.flatMap((r) => {
      const v = values[r.id];
      if (!v) return [];
      if (!(num(v.price) > 0)) return [[r.id, "Enter the price"]];
      if (!Number.isInteger(num(v.stockQty)) || num(v.stockQty) < 0) return [[r.id, "Stock is a whole number"]];
      if (!Number.isInteger(num(v.shipDays)) || num(v.shipDays) < 1) return [[r.id, "At least 1 day"]];
      return [];
    }),
  );
  const shown = { ...problems, ...local };
  // Unsaved changes: the browser asks before closing or reloading; links in the app ask too.
  useEffect(() => {
    if (!changed.length) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (a?.href && !a.target && !window.confirm("You have unsaved changes. Leave without saving?"))
        e.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [changed.length]);
  const set = (id: string, patch: Partial<QuickRow>) => {
    const v = values[id];
    if (v) setValues({ ...values, [id]: { ...v, ...patch } });
  };
  const firstProblem = Object.entries(shown)[0];
  return (
    <>
      {saved ? <Alert tone="success" title={saved} live /> : null}
      <div
        tabIndex={0}
        role="region"
        aria-label="Quick stock and price"
        className="relative overflow-x-auto rounded-card border border-default bg-page p-4"
      >
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="bg-subtle text-left type-caption text-secondary">
              <th scope="col" className="px-3 py-2">
                Product
              </th>
              <th scope="col" className="px-3 py-2">
                Price ex-GST
              </th>
              <th scope="col" className="px-3 py-2">
                Stock
              </th>
              <th scope="col" className="px-3 py-2">
                Lead time
              </th>
              <th scope="col" className="px-3 py-2">
                Buyer pays incl. GST
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = values[r.id] ?? r;
              const incl = num(v.price) * (1 + r.gstBps / 10_000);
              return (
                <tr key={r.id} className="border-t border-default align-top">
                  <th scope="row" className="px-3 py-3 text-left font-normal">
                    <span className="block type-label">{r.name}</span>
                    <span className="block type-spec text-secondary">{r.model ?? r.sku}</span>
                  </th>
                  <td className="px-3 py-3">
                    <Input
                      aria-label={`Price for ${r.name}`}
                      inputMode="decimal"
                      value={v.price}
                      onChange={(e) => {
                        set(r.id, { price: e.target.value });
                      }}
                    />
                    {v.price !== r.price ? (
                      <span className="type-caption text-secondary">Was {rupees(num(r.price))}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <Input
                        aria-label={`Stock for ${r.name}`}
                        inputMode="numeric"
                        value={v.stockQty}
                        onChange={(e) => {
                          set(r.id, { stockQty: e.target.value });
                        }}
                      />
                      <span className="type-body-sm text-secondary">in stock</span>
                    </span>
                    {v.stockQty !== r.stockQty ? (
                      <span className="type-caption text-secondary">Was {r.stockQty || "0"}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-2">
                      <Input
                        aria-label={`Lead time for ${r.name}, days`}
                        inputMode="numeric"
                        value={v.shipDays}
                        onChange={(e) => {
                          set(r.id, { shipDays: e.target.value });
                        }}
                      />
                      <span className="type-body-sm text-secondary">days</span>
                    </span>
                    {shown[r.id] ? (
                      <span role="alert" className="flex items-center gap-1 type-caption text-error">
                        <Icon name="alert-circle" size={14} />
                        {shown[r.id]}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 type-body-sm">{num(v.price) > 0 ? rupees(incl) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 type-caption text-secondary">
          Showing {rows.length} of {total} fixed-price products. Quote-only products have no price to edit, so they
          aren&apos;t listed here.
        </p>
      </div>
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-default bg-page p-4 shadow-ink-float-sm">
        <div>
          <p className="type-label">
            {changed.length} unsaved {changed.length === 1 ? "change" : "changes"}
          </p>
          <p className="type-caption text-secondary">
            {firstProblem
              ? `Fix the ${rows.find((r) => r.id === firstProblem[0])?.model ?? "highlighted"} row to save. `
              : ""}
            Price and stock changes go live straight away.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={!changed.length || pending}
            onClick={() => {
              setValues(Object.fromEntries(rows.map((r) => [r.id, r])));
            }}
          >
            Discard
          </Button>
          <Button
            disabled={!changed.length || pending || Object.keys(local).length > 0}
            onClick={() => {
              start(async () => {
                const r = await saveQuickStockAction(
                  changed.map((c) => ({
                    id: c.id,
                    price: values[c.id]?.price ?? "",
                    stockQty: values[c.id]?.stockQty ?? "",
                    shipDays: values[c.id]?.shipDays ?? "",
                  })),
                );
                if (r.ok) {
                  setProblems({});
                  setSaved(
                    `${String(r.saved)} ${r.saved === 1 ? "product" : "products"} updated. Buyers see the new price and stock now.`,
                  );
                  router.refresh();
                } else setProblems(r.problems);
              });
            }}
          >
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}
