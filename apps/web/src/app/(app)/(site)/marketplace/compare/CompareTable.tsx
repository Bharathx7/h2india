"use client";

import type { CompareResult } from "@h2india/core/products";
import { Button, buttonClasses, cx, Icon, Switch, VerifiedBadge } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setCompare, useCompareSync } from "@/marketplace/compare";
import { saveCompareAction } from "./actions";

// Compare (91:9; phones 98:3084), step 6.5: products side by side, rows aligned by attribute, "Show only differences",
// Remove, Add a product, and one quote request to every supplier. No price row.

type Ok = Extract<CompareResult, { kind: "ok" }>;

export function CompareTable({
  result,
  limit,
  signedIn,
  categorySlug,
}: {
  result: Ok;
  limit: number;
  signedIn: boolean;
  categorySlug: string;
}) {
  const router = useRouter();
  const [onlyDiff, setOnlyDiff] = useState(false);
  const cols = result.columns;
  // The page is the truth: keep this browser's selection in step with it.
  const key = cols.map((c) => c.id).join(",");
  const synced = useRef("");
  useEffect(() => {
    if (synced.current === key) return;
    synced.current = key;
    setCompare(cols.map((c) => ({ id: c.id, name: c.name, category: categorySlug })));
  }, [key, cols, categorySlug]);
  useCompareSync(signedIn, saveCompareAction);
  const go = (ids: string[]) => {
    router.push(ids.length ? `/marketplace/compare?ids=${ids.join(",")}` : "/marketplace/compare");
  };
  const width = {
    gridTemplateColumns: `minmax(180px,1.2fr) repeat(${String(Math.max(cols.length + (cols.length < limit ? 1 : 0), 1))}, minmax(160px,1fr))`,
  };
  const groups = result.groups
    .map((g) => ({ ...g, rows: onlyDiff ? g.rows.filter((r) => r.differs) : g.rows }))
    .filter((g) => g.rows.length);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <p className="min-w-0 flex-1 type-body text-body">
          {cols.length} of {limit} products from {result.classLabel} › {result.category.label}. You can compare up to{" "}
          {limit} products from one category.
        </p>
        <Switch label="Show only differences" checked={onlyDiff} onCheckedChange={setOnlyDiff} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            go([]);
          }}
        >
          Clear all
        </Button>
      </div>
      <div
        role="region"
        tabIndex={0}
        aria-label="Comparison"
        className="relative overflow-x-auto rounded-card border border-default"
      >
        <div role="table" aria-label={`Compare ${result.category.label.toLowerCase()}`} className="min-w-max">
          <div role="row" className="grid" style={width}>
            <div role="columnheader" className="flex flex-col gap-1 border-r border-default p-4">
              <span className="type-label-lg text-primary">
                {cols.length} {cols.length === 1 ? "product" : "products"}
              </span>
              <span className="type-caption text-secondary">
                Values are from each supplier&apos;s listing. Check the datasheet before you order.
              </span>
            </div>
            {cols.map((c) => (
              <div key={c.id} role="columnheader" className="flex flex-col gap-2 border-r border-default p-4">
                <span aria-hidden="true" className="flex h-20 items-center justify-center rounded-card bg-mint">
                  <Icon name="zap" size={28} className="text-icon-primary" />
                </span>
                <Link href={c.href} className="type-label text-primary hover:underline">
                  {c.name}
                </Link>
                <span className="type-caption text-secondary">{c.supplier}</span>
                {c.verified ? <VerifiedBadge kind="supplier" /> : null}
                <Link href={`/rfq/new?product=${c.slug}`} className={buttonClasses({ size: "sm" })}>
                  Request a quote
                </Link>
                <button
                  type="button"
                  className="self-start type-label-sm text-link hover:text-link-hover"
                  onClick={() => {
                    go(cols.filter((x) => x.id !== c.id).map((x) => x.id));
                  }}
                >
                  Remove<span className="sr-only"> {c.name}</span>
                </button>
              </div>
            ))}
            {cols.length < limit ? (
              <div role="columnheader" className="p-4">
                <Link
                  href={result.category.href}
                  className="flex h-full min-h-40 flex-col items-center justify-center gap-1 rounded-card border-[1.5px] border-dashed border-control p-3 text-center hover:border-focus"
                >
                  <Icon name="plus" size={20} />
                  <span className="type-label text-primary">Add a product</span>
                  <span className="type-caption text-secondary">
                    {limit - cols.length} more from {result.category.label}
                  </span>
                </Link>
              </div>
            ) : null}
          </div>
          {groups.map((g) => (
            <div key={g.group} role="rowgroup">
              <div role="row" className="grid border-t border-default bg-subtle" style={width}>
                <div role="rowheader" className="px-4 py-2 type-eyebrow text-secondary">
                  {g.group}
                </div>
              </div>
              {g.rows.map((r) => (
                <div
                  key={r.label}
                  role="row"
                  className={cx("grid border-t border-default", r.differs && "")}
                  style={width}
                >
                  <div role="rowheader" className="border-r border-default px-4 py-3 type-body-sm text-body">
                    {r.label}
                  </div>
                  {r.values.map((v, i) => (
                    <div
                      key={cols[i]?.id ?? i}
                      role="cell"
                      className="border-r border-default px-4 py-3 type-spec text-primary"
                    >
                      {v}
                    </div>
                  ))}
                  {cols.length < limit ? <div role="cell" /> : null}
                </div>
              ))}
            </div>
          ))}
          {onlyDiff && groups.length === 0 ? (
            <p className="border-t border-default p-4 type-body text-body">These products are the same on every row.</p>
          ) : null}
        </div>
      </div>
      <section aria-labelledby="ask-all" className="flex flex-wrap items-center gap-4 rounded-card bg-mint p-6">
        <div className="min-w-0 flex-1">
          <h2 id="ask-all" className="type-h4 text-primary">
            Ask all {cols.length} suppliers in one go
          </h2>
          <p className="type-body-sm text-body">
            Sends one quote request to the {cols.length} suppliers. Our team checks it within 1 working day, then you
            compare their quotes side by side.
          </p>
        </div>
        <Link href={`/rfq/new?products=${cols.map((c) => c.slug).join(",")}`} className={buttonClasses({})}>
          Request quotes from all {cols.length}
        </Link>
      </section>
    </div>
  );
}
