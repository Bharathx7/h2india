"use client";

import type { AttributeDef } from "@h2india/core/catalogue/attributes";
import type { ListingFacets, ProductCard as Card } from "@h2india/core/products";
import { LEAD_TIMES, listingSearch, PER_PAGE, SORTS, type ListingQuery } from "@h2india/core/products/rules";
import {
  Button,
  buttonClasses,
  Checkbox,
  cx,
  Drawer,
  EmptyState,
  FilterChip,
  FilterGroup,
  FilterPanel,
  Icon,
  IconButton,
  Input,
  ProductCard,
  SegmentedControl,
  Select,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { saveCompareAction } from "@/app/(app)/(site)/marketplace/compare/actions";
import { useCompare, useCompareSync } from "./compare";

// Category and sub-category listing (392:4896 grid, 392:5787 table, 392:6656 no results; phones 395:9321 list and
// 395:9617 filters sheet), step 6.3. Every change rewrites the address (listingSearch), so a shared link reproduces
// the view; the server renders the first page. No price anywhere: the card and the table have no price to show.

export interface ListingProps {
  basePath: string;
  query: ListingQuery;
  /** The category's filterable and comparable attributes. */
  defs: AttributeDef[];
  facets: ListingFacets;
  items: Card[];
  total: number;
  /** "Systems · Electrolysers" on the cards. */
  eyebrow: string;
  categorySlug: string;
  signedIn: boolean;
  /** When nothing matches (Doc 1 §9.2): filters whose removal finds products, the nearest matches, a pre-filled RFQ. */
  noResults?: {
    suggestions: { label: string; href: string; count: number }[];
    nearest: Card[];
    rfqHref: string;
  };
}

export function Listing(props: ListingProps) {
  const router = useRouter();
  useCompareSync(props.signedIn, saveCompareAction);
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState(false);
  const go = (change: Partial<ListingQuery>, keepPage = false) => {
    start(() => {
      router.push(`${props.basePath}${listingSearch(props.query, keepPage ? change : { ...change, page: 1 })}`, {
        scroll: false,
      });
    });
  };
  const q = props.query;
  const chips = appliedChips(props, go);
  const filters = <Filters {...props} go={go} />;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]" aria-busy={pending}>
      <div className="hidden lg:block">{filters}</div>

      <div className="flex min-w-0 flex-col gap-4">
        {chips.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips}
            <button
              type="button"
              className="type-label-sm text-link hover:text-link-hover"
              onClick={() => {
                go(CLEAR);
              }}
            >
              Clear all
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="View"
            className="max-lg:hidden"
            options={[
              { value: "grid", label: "Grid" },
              { value: "table", label: "Table" },
            ]}
            value={q.view}
            onValueChange={(v) => {
              go({ view: v === "table" ? "table" : "grid" }, true);
            }}
          />
          <Drawer
            open={sheet}
            onOpenChange={setSheet}
            title="Filters"
            trigger={
              <Button variant="outline" className="lg:hidden">
                <Icon name="sliders" size={18} />
                Filters{chips.length ? ` (${String(chips.length)})` : ""}
              </Button>
            }
            footer={
              <Button
                className="w-full"
                onClick={() => {
                  setSheet(false);
                }}
              >
                Show {props.total.toLocaleString("en-IN")} {props.total === 1 ? "result" : "results"}
              </Button>
            }
          >
            {filters}
          </Drawer>
          <div className="ml-auto flex gap-2">
            <Select
              aria-label="Sort"
              value={q.sort}
              onChange={(e) => {
                go({ sort: e.target.value as ListingQuery["sort"] });
              }}
              boxClassName="w-55"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Products per page"
              value={String(q.perPage)}
              onChange={(e) => {
                go({ perPage: Number(e.target.value) });
              }}
              boxClassName="w-40 max-md:hidden"
            >
              {PER_PAGE.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </Select>
          </div>
        </div>

        <p role="status" className="sr-only">
          {props.total.toLocaleString("en-IN")} {props.total === 1 ? "product" : "products"}
        </p>

        {props.items.length === 0 ? (
          <section aria-label="Products" data-state="empty" className="flex flex-col gap-6">
            <div className="rounded-card border border-default bg-subtle">
              <EmptyState
                kind="no-results"
                title="No products match these filters"
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      onClick={() => {
                        go(CLEAR);
                      }}
                      variant="primary"
                    >
                      Clear filters
                    </Button>
                    {props.noResults ? (
                      <Link href={props.noResults.rfqHref} className={buttonClasses({ variant: "outline" })}>
                        Request quotes for these specs
                      </Link>
                    ) : null}
                  </div>
                }
              >
                Try fewer filters or a wider range, or send a request and let suppliers come to you.
              </EmptyState>
              {props.noResults?.suggestions.length ? (
                <ul aria-label="Try removing" className="flex flex-col gap-1 px-6 pb-6 text-center">
                  {props.noResults.suggestions.map((sug) => (
                    <li key={sug.href} className="type-body-sm text-body">
                      Remove{" "}
                      <Link href={sug.href} className="type-label text-link underline">
                        {sug.label}
                      </Link>{" "}
                      to see {sug.count.toLocaleString("en-IN")} {sug.count === 1 ? "product" : "products"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {props.noResults?.nearest.length ? (
              <div className="flex flex-col gap-3">
                <h2 className="type-h4 text-primary">Nearest matches</h2>
                <ProductGrid {...props} items={props.noResults.nearest} label="Nearest matches" />
              </div>
            ) : null}
          </section>
        ) : q.view === "table" ? (
          <>
            <div className="hidden lg:block">
              <ProductTable {...props} />
            </div>
            <div className="lg:hidden">
              <ProductGrid {...props} items={props.items} />
            </div>
          </>
        ) : (
          <ProductGrid {...props} items={props.items} />
        )}

        <Pager {...props} go={go} />
      </div>
      <CompareBar />
    </div>
  );
}

function ProductGrid(props: ListingProps & { label?: string }) {
  return (
    <ul aria-label={props.label ?? "Products"} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {props.items.map((p) => (
        <li key={p.id} className="flex">
          <ProductCard
            className="w-full"
            name={p.name}
            href={p.href}
            eyebrow={[props.eyebrow, p.subLabel].filter(Boolean).join(" · ")}
            supplier={p.supplier.name}
            supplierVerified={p.supplier.verified}
            chips={p.chips}
            leadTime={p.leadTime}
            actions={<CardActions product={p} category={props.categorySlug} signedIn={props.signedIn} />}
            renderLink={({ href, className, children }) => (
              <Link href={href} className={className}>
                {children}
              </Link>
            )}
          />
        </li>
      ))}
    </ul>
  );
}

const CLEAR: Partial<ListingQuery> = {
  sub: [],
  choices: {},
  ranges: {},
  certifications: [],
  verified: false,
  madeInIndia: false,
  state: "",
  leadWeeks: null,
};

type Go = (change: Partial<ListingQuery>, keepPage?: boolean) => void;

function appliedChips(props: ListingProps, go: Go): ReactNode[] {
  const q = props.query;
  const out: ReactNode[] = [];
  for (const s of q.sub) {
    const label = props.facets.sub.find((f) => f.slug === s)?.label ?? s;
    out.push(
      <FilterChip
        key={`s${s}`}
        label={label}
        onRemove={() => {
          go({ sub: q.sub.filter((x) => x !== s) });
        }}
      />,
    );
  }
  for (const [key, values] of Object.entries(q.choices)) {
    for (const v of values) {
      out.push(
        <FilterChip
          key={`a${key}${v}`}
          label={v === "yes" || v === "no" ? `${labelOf(props.defs, key)}: ${v}` : v}
          onRemove={() => {
            go({ choices: { ...q.choices, [key]: values.filter((x) => x !== v) } });
          }}
        />,
      );
    }
  }
  for (const [key, r] of Object.entries(q.ranges)) {
    const def = props.defs.find((d) => d.key === key);
    const unit = def?.unit ? ` ${def.unit}` : "";
    const text =
      r.min !== undefined && r.max !== undefined
        ? `${String(r.min)}–${String(r.max)}`
        : r.min !== undefined
          ? `≥ ${String(r.min)}`
          : `≤ ${String(r.max)}`;
    const rest = Object.fromEntries(Object.entries(q.ranges).filter(([k]) => k !== key));
    out.push(
      <FilterChip
        key={`r${key}`}
        label={`${labelOf(props.defs, key)} ${text}${unit}`}
        onRemove={() => {
          go({ ranges: rest });
        }}
      />,
    );
  }
  for (const c of q.certifications) {
    out.push(
      <FilterChip
        key={`c${c}`}
        label={c}
        onRemove={() => {
          go({ certifications: q.certifications.filter((x) => x !== c) });
        }}
      />,
    );
  }
  if (q.verified)
    out.push(
      <FilterChip
        key="v"
        label="Verified only"
        onRemove={() => {
          go({ verified: false });
        }}
      />,
    );
  if (q.madeInIndia)
    out.push(
      <FilterChip
        key="i"
        label="Made in India"
        onRemove={() => {
          go({ madeInIndia: false });
        }}
      />,
    );
  if (q.state)
    out.push(
      <FilterChip
        key="st"
        label={q.state}
        onRemove={() => {
          go({ state: "" });
        }}
      />,
    );
  if (q.leadWeeks !== null) {
    const label = LEAD_TIMES.find((l) => Number(l.value) === q.leadWeeks)?.label ?? "";
    out.push(
      <FilterChip
        key="l"
        label={label}
        onRemove={() => {
          go({ leadWeeks: null });
        }}
      />,
    );
  }
  return out;
}

const labelOf = (defs: AttributeDef[], key: string) => defs.find((d) => d.key === key)?.label ?? key;

function Filters(props: ListingProps & { go: Go }) {
  const { query: q, facets, go } = props;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const n = (count: number) => ` (${count.toLocaleString("en-IN")})`;
  return (
    <FilterPanel
      onClear={() => {
        go(CLEAR);
      }}
    >
      {facets.sub.length ? (
        <FilterGroup title="Technology">
          {facets.sub.map((s) => (
            <Checkbox
              key={s.slug}
              label={`${s.label}${n(s.count)}`}
              checked={q.sub.includes(s.slug)}
              onCheckedChange={() => {
                go({ sub: toggle(q.sub, s.slug) });
              }}
            />
          ))}
        </FilterGroup>
      ) : null}
      {props.defs
        .filter((d) => d.filterable)
        .map((d) =>
          d.type === "number" || d.type === "range" ? (
            <FilterGroup key={d.key} title={d.label} note={d.testCondition ?? undefined}>
              <Range
                key={JSON.stringify(q.ranges[d.key] ?? {})}
                def={d}
                value={q.ranges[d.key]}
                onCommit={(r) => {
                  const rest = Object.fromEntries(Object.entries(q.ranges).filter(([k]) => k !== d.key));
                  go({ ranges: r ? { ...rest, [d.key]: r } : rest });
                }}
              />
            </FilterGroup>
          ) : d.type === "choice" || d.type === "boolean" ? (
            <FilterGroup key={d.key} title={d.label}>
              {(facets.choices[d.key] ?? []).map((c) => (
                <Checkbox
                  key={c.value}
                  label={`${c.value === "yes" ? "Yes" : c.value === "no" ? "No" : c.value}${n(c.count)}`}
                  checked={(q.choices[d.key] ?? []).includes(c.value)}
                  onCheckedChange={() => {
                    go({ choices: { ...q.choices, [d.key]: toggle(q.choices[d.key] ?? [], c.value) } });
                  }}
                />
              ))}
            </FilterGroup>
          ) : null,
        )}
      {facets.certifications.length ? (
        <FilterGroup title="Compliance">
          {facets.certifications.map((c) => (
            <Checkbox
              key={c.value}
              label={`${c.value}${n(c.count)}`}
              checked={q.certifications.includes(c.value)}
              onCheckedChange={() => {
                go({ certifications: toggle(q.certifications, c.value) });
              }}
            />
          ))}
        </FilterGroup>
      ) : null}
      <FilterGroup title="Supplier">
        <Checkbox
          label={`Verified only${n(facets.verified)}`}
          checked={q.verified}
          onCheckedChange={(v) => {
            go({ verified: v === true });
          }}
        />
        <Checkbox
          label={`Made in India${n(facets.madeInIndia)}`}
          checked={q.madeInIndia}
          onCheckedChange={(v) => {
            go({ madeInIndia: v === true });
          }}
        />
        <Select
          aria-label="Supplier's state"
          value={q.state}
          onChange={(e) => {
            go({ state: e.target.value });
          }}
        >
          <option value="">Any state</option>
          {facets.states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </FilterGroup>
      <FilterGroup title="Lead time">
        <Select
          aria-label="Lead time"
          value={q.leadWeeks === null ? "" : String(q.leadWeeks)}
          onChange={(e) => {
            go({ leadWeeks: e.target.value ? Number(e.target.value) : null });
          }}
        >
          <option value="">Any lead time</option>
          {LEAD_TIMES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </FilterGroup>
    </FilterPanel>
  );
}

/** Min and max with the unit; applied on Enter or when the field loses focus, so typing doesn't reload each key. */
function Range({
  def,
  value,
  onCommit,
}: {
  def: AttributeDef;
  value?: { min?: number; max?: number };
  onCommit: (r: { min?: number; max?: number } | null) => void;
}) {
  const [min, setMin] = useState(value?.min === undefined ? "" : String(value.min));
  const [max, setMax] = useState(value?.max === undefined ? "" : String(value.max));
  const commit = () => {
    const lo = min.trim() ? Number(min.replace(/,/g, "")) : undefined;
    const hi = max.trim() ? Number(max.replace(/,/g, "")) : undefined;
    const ok = (x: number | undefined) => x === undefined || Number.isFinite(x);
    if (!ok(lo) || !ok(hi)) return;
    if (lo === value?.min && hi === value?.max) return;
    onCommit(lo === undefined && hi === undefined ? null : { min: lo, max: hi });
  };
  const unit = def.unit ?? "";
  const field = (which: "Min" | "Max", v: string, set: (s: string) => void) => (
    <Input
      aria-label={`${def.label}, ${which === "Min" ? "minimum" : "maximum"}${unit ? ` (${unit})` : ""}`}
      inputMode="decimal"
      placeholder={which}
      suffix={unit || undefined}
      value={v}
      onChange={(e) => {
        set(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
  return (
    <div className="flex gap-2">
      {field("Min", min, setMin)}
      {field("Max", max, setMax)}
    </div>
  );
}

function CardActions({ product, category, signedIn }: { product: Card; category: string; signedIn: boolean }) {
  const compare = useCompare();
  const [note, setNote] = useState<string | null>(null);
  const on = compare.has(product.id);
  return (
    <>
      <IconButton
        icon="compare"
        look="outline"
        size="sm"
        className={cx("bg-page", on && "border-focus bg-mint")}
        label={on ? `Remove ${product.name} from compare` : `Add ${product.name} to compare`}
        aria-pressed={on}
        onClick={() => {
          setNote(compare.toggle({ id: product.id, name: product.name, category }));
        }}
      />
      <Link
        href={
          signedIn
            ? `/member/saved?product=${product.slug}`
            : `/sign-in?next=${encodeURIComponent(`/member/saved?product=${product.slug}`)}`
        }
        aria-label={`Save ${product.name} to a list`}
        className="flex size-8 items-center justify-center rounded-pill border border-control bg-page text-icon-primary hover:border-focus"
      >
        <Icon name="heart" size={16} />
      </Link>
      {note ? (
        <span
          role="alert"
          className="absolute top-11 right-0 w-56 rounded-control bg-inverse p-2 type-caption text-inverse"
        >
          {note}
        </span>
      ) : null}
    </>
  );
}

/** Table view (392:5787): the comparable attributes as columns, a box to add to compare. No price column. */
function ProductTable(props: ListingProps) {
  const compare = useCompare();
  const cols = props.defs.filter((d) => d.comparable);
  const th = "px-2 py-2.5 text-left align-middle font-normal";
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label="Products as a table"
      // Scrolls inside itself so the header and the sideways scrollbar stay in view (Doc 1 §9.2).
      className="relative max-h-[75vh] overflow-auto rounded-card border border-default"
    >
      <table className="w-full min-w-200 border-collapse">
        <thead className="sticky top-0 z-10 bg-subtle type-caption text-secondary">
          <tr>
            <th scope="col" className={cx(th, "w-10 pl-3")}>
              <span className="sr-only">Compare</span>
            </th>
            <th scope="col" className={th}>
              Product
            </th>
            <th scope="col" className={th}>
              Supplier
            </th>
            {props.query.sub.length !== 1 && props.facets.sub.length ? (
              <th scope="col" className={th}>
                Technology
              </th>
            ) : null}
            {cols.map((d) => (
              <th key={d.key} scope="col" className={th}>
                {d.label}
              </th>
            ))}
            <th scope="col" className={th}>
              Lead time
            </th>
            <th scope="col" className={cx(th, "pr-3")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="type-body-sm text-primary">
          {props.items.map((p) => {
            const on = compare.has(p.id);
            return (
              <tr key={p.id} className={cx("border-t border-default", on && "bg-mint")}>
                <td className="py-3 pr-2 pl-3 align-middle">
                  <Checkbox
                    checked={on}
                    onCheckedChange={() => compare.toggle({ id: p.id, name: p.name, category: props.categorySlug })}
                    label={<span className="sr-only">Compare {p.name}</span>}
                  />
                </td>
                <th scope="row" className="px-2 py-3 text-left align-middle font-normal">
                  <Link href={p.href} className="type-label text-primary hover:underline">
                    {p.name}
                  </Link>
                  {p.variant ? <span className="block type-caption text-secondary">{p.variant}</span> : null}
                </th>
                <td className="px-2 py-3 align-middle">
                  <span className="inline-flex items-center gap-1.5">
                    {p.supplier.verified ? <Icon name="shield-check" size={16} className="text-icon-success" /> : null}
                    {p.supplier.name}
                  </span>
                </td>
                {props.query.sub.length !== 1 && props.facets.sub.length ? (
                  <td className="px-2 py-3 align-middle">{p.subLabel ?? "—"}</td>
                ) : null}
                {cols.map((d) => (
                  <td key={d.key} className="px-2 py-3 align-middle type-spec whitespace-nowrap">
                    {p.values[d.key] ?? "—"}
                  </td>
                ))}
                <td className="px-2 py-3 align-middle whitespace-nowrap">{p.leadTime ?? "—"}</td>
                <td className="py-3 pr-3 pl-2 align-middle">
                  <span className="flex items-center gap-2">
                    <Link
                      href={
                        props.signedIn
                          ? `/member/saved?product=${p.slug}`
                          : `/sign-in?next=${encodeURIComponent(`/member/saved?product=${p.slug}`)}`
                      }
                      aria-label={`Save ${p.name} to a list`}
                      className="flex size-8 items-center justify-center rounded-pill border border-control hover:border-focus"
                    >
                      <Icon name="heart" size={16} />
                    </Link>
                    <Link
                      href={`/rfq/new?product=${p.slug}`}
                      className={cx(buttonClasses({ variant: "outline", size: "sm" }), "whitespace-nowrap")}
                    >
                      Request quote<span className="sr-only"> for {p.name}</span>
                    </Link>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pager(props: ListingProps & { go: Go }) {
  const { query: q, total } = props;
  const pages = Math.max(1, Math.ceil(total / q.perPage));
  if (total === 0) return null;
  const from = (q.page - 1) * q.perPage + 1;
  const to = Math.min(total, q.page * q.perPage);
  const href = (page: number) => `${props.basePath}${listingSearch(q, { page })}`;
  const item = "inline-flex size-9 items-center justify-center rounded-control type-label tabular-nums";
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="type-body-sm text-secondary">
        Showing {from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
      </p>
      {pages > 1 ? (
        <ol className="flex items-center gap-1">
          {q.page > 1 ? (
            <li>
              <Link
                href={href(q.page - 1)}
                rel="prev"
                aria-label="Previous page"
                className={cx(item, "hover:bg-subtle")}
              >
                <Icon name="chevron-left" size={18} />
              </Link>
            </li>
          ) : null}
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <li key={p}>
              <Link
                href={href(p)}
                aria-current={p === q.page ? "page" : undefined}
                className={cx(item, p === q.page ? "bg-inverse text-inverse" : "border border-default hover:bg-subtle")}
              >
                {p}
              </Link>
            </li>
          ))}
          {q.page < pages ? (
            <li>
              <Link href={href(q.page + 1)} rel="next" aria-label="Next page" className={cx(item, "hover:bg-subtle")}>
                <Icon name="chevron-right" size={18} />
              </Link>
            </li>
          ) : null}
        </ol>
      ) : null}
    </nav>
  );
}

/** The bar at the bottom while products are picked (392:5787 "Compare 3 of 5"). */
function CompareBar() {
  const compare = useCompare();
  if (!compare.items.length) return null;
  return (
    <section
      aria-label="Compare"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-page shadow-ink-float lg:col-span-2"
    >
      <div className="mx-auto flex w-full max-w-300 flex-wrap items-center gap-3 px-4 py-3 md:px-6 xl:px-0">
        <p className="type-label text-primary">
          Compare {compare.items.length} of {compare.limit}
        </p>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {compare.items.map((i) => (
            <li
              key={i.id}
              className="inline-flex items-center gap-1.5 rounded-pill bg-subtle py-1 pr-1 pl-3 type-label-sm text-primary"
            >
              {i.name}
              <button
                type="button"
                aria-label={`Remove ${i.name} from compare`}
                className="flex size-6 items-center justify-center rounded-pill hover:bg-ink-200"
                onClick={() => {
                  compare.remove(i.id);
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" onClick={compare.clear}>
          Clear
        </Button>
        <Link
          href={`/marketplace/compare?ids=${compare.items.map((i) => i.id).join(",")}`}
          aria-disabled={compare.items.length < 2}
          className={buttonClasses({})}
        >
          Compare {compare.items.length} {compare.items.length === 1 ? "product" : "products"}
        </Link>
      </div>
    </section>
  );
}
