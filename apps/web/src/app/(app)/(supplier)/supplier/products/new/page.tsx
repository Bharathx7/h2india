import { getDb } from "@h2india/core";
import { effectiveSchema } from "@h2india/core/catalogue/taxonomy";
import { buttonClasses, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { catalogue } from "@/marketplace/data";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { EditorPage } from "../editor-page";

// Add a product · Choose category (612:8; phones 614:851), step 8.3: class, category and type, with the fields buyers
// will compare. Continue opens the editor for that category. Other ways to add: a datasheet (8.4) or a CSV (8.5).
export const metadata: Metadata = { title: "Add a product · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

type Search = Promise<{ class?: string; cat?: string; sub?: string; category?: string; q?: string; from?: string }>;

export default async function NewProductPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/products/new");
  if (sp.category && /^[0-9a-f-]{36}$/i.test(sp.category)) return <EditorPage page={page} categoryId={sp.category} />;
  const cat = await catalogue();
  const q = (sp.q ?? "").trim().toLowerCase();
  const klass = cat.classes.find((c) => c.id === sp.class) ?? cat.classes[0];
  const categories = klass?.categories ?? [];
  const category = categories.find((c) => c.id === sp.cat);
  const sub = category?.children.find((c) => c.id === sp.sub);
  const chosen = sub ?? (category && !category.children.length ? category : undefined);
  const defs = chosen ? await effectiveSchema(getDb(), chosen.id, { includeSample: true }) : [];
  const matches = q
    ? cat.classes.flatMap((c) =>
        c.categories.flatMap((k) => [
          ...(k.label.toLowerCase().includes(q) && !k.children.length ? [{ c, k, s: undefined }] : []),
          ...k.children
            .filter((s) => s.label.toLowerCase().includes(q) || k.label.toLowerCase().includes(q))
            .map((s) => ({ c, k, s })),
        ]),
      )
    : [];
  const href = (o: { class?: string; cat?: string; sub?: string }) =>
    `/supplier/products/new?${new URLSearchParams(Object.entries(o).filter((e): e is [string, string] => Boolean(e[1]))).toString()}`;
  const col = "flex flex-col gap-1 border-default p-3 md:border-r";
  const item = (on: boolean) =>
    cx(
      "flex items-center justify-between rounded-control px-3 py-2 type-body-sm",
      on ? "bg-mint type-label text-primary" : "text-body hover:bg-subtle",
    );
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <Link href="/supplier/products" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Products
      </Link>
      <div>
        <h1 className="type-h2">Add a product</h1>
        <p className="type-body-sm text-secondary">
          Start with the category. It decides which spec fields buyers filter and compare on.
        </p>
      </div>
      {/* Founder QC (17 Nov 2026): adding a product is a set of steps; this page is step 1. */}
      <ol aria-label="Steps" className="flex flex-wrap gap-2">
        {["Category", "Details", "Specifications", "Documents and terms", "Review"].map((label, i) => (
          <li
            key={label}
            aria-current={i === 0 ? "step" : undefined}
            className={cx(
              "inline-flex h-10 items-center gap-2 rounded-pill border-[1.5px] pr-4 pl-1.5 type-label",
              i === 0 ? "border-transparent bg-inverse text-inverse" : "border-control bg-page text-secondary",
            )}
          >
            <span
              className={cx(
                "flex size-7 items-center justify-center rounded-pill type-label-sm",
                i === 0 ? "bg-page text-primary" : "bg-subtle text-secondary",
              )}
            >
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-subtle p-4">
        <div>
          <p className="type-label">Other ways to add</p>
          <p className="type-caption text-secondary">
            Have a datasheet? We&apos;ll fill in a draft for you to check. Adding many? Use a CSV template.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/supplier/products/datasheet" className={buttonClasses({ variant: "outline", size: "sm" })}>
            <Icon name="file-text" size={16} />
            Start from a datasheet
          </Link>
          <Link href="/supplier/products/import" className={buttonClasses({ variant: "outline", size: "sm" })}>
            <Icon name="upload" size={16} />
            Bulk upload
          </Link>
        </div>
      </div>
      <p className="type-body-sm text-body">
        Can&apos;t find a category that fits?{" "}
        <Link href="/supplier/products/categories" className="type-label text-link underline underline-offset-2">
          Request a new category
        </Link>
      </p>
      <form method="get" role="search">
        <label className="flex items-center gap-2 rounded-control border-[1.5px] border-control bg-page px-3">
          <Icon name="search" size={18} className="text-icon-secondary" />
          <input
            name="q"
            defaultValue={sp.q}
            aria-label="Search categories"
            placeholder="Search categories, e.g. diaphragm compressor"
            className="h-11 min-w-0 flex-1 bg-transparent type-body outline-none"
          />
        </label>
      </form>
      {q ? (
        <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
          {matches.length ? (
            matches.slice(0, 20).map(({ c, k, s }) => (
              <li key={(s ?? k).id}>
                <Link
                  href={href({ class: c.id, cat: k.id, sub: s?.id })}
                  className="block p-3 type-body-sm hover:bg-subtle"
                >
                  {[c.label, k.label, s?.label].filter(Boolean).join(" › ")}
                </Link>
              </li>
            ))
          ) : (
            <li className="flex flex-col gap-1 p-4 type-body-sm text-body">
              No category matches. Try a broader word.
              <Link
                href={`/supplier/products/categories?q=${encodeURIComponent(sp.q ?? "")}`}
                className="self-start type-label text-link underline underline-offset-2"
              >
                Request a new category
              </Link>
            </li>
          )}
        </ul>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-card border border-default bg-page md:grid-cols-[160px_minmax(0,1fr)_160px_minmax(0,1fr)]">
          <nav aria-label="Class" className={col}>
            <p className="px-3 py-1 type-label-sm text-secondary">Class</p>
            {cat.classes.map((c) => (
              <Link
                key={c.id}
                href={href({ class: c.id })}
                aria-current={klass?.id === c.id ? "true" : undefined}
                className={item(klass?.id === c.id)}
              >
                {c.label}
                {klass?.id === c.id ? <Icon name="check" size={16} /> : null}
              </Link>
            ))}
          </nav>
          <nav aria-label="Category" className={col}>
            <p className="px-3 py-1 type-label-sm text-secondary">Category in {klass?.label.toLowerCase()}</p>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={href({ class: klass?.id, cat: c.id })}
                aria-current={category?.id === c.id ? "true" : undefined}
                className={item(category?.id === c.id)}
              >
                {c.label}
                {category?.id === c.id ? <Icon name="check" size={16} /> : null}
              </Link>
            ))}
          </nav>
          <nav aria-label="Type" className={col}>
            <p className="px-3 py-1 type-label-sm text-secondary">Type</p>
            {(category?.children ?? []).map((c) => (
              <Link
                key={c.id}
                href={href({ class: klass?.id, cat: category?.id, sub: c.id })}
                aria-current={sub?.id === c.id ? "true" : undefined}
                className={item(sub?.id === c.id)}
              >
                {c.label}
                {sub?.id === c.id ? <Icon name="check" size={16} /> : null}
              </Link>
            ))}
          </nav>
          <section className="flex flex-col gap-3 p-4">
            <p className="type-label-sm text-secondary">What buyers compare</p>
            {chosen ? (
              <>
                <h2 className="type-h4">{[klass?.label, category?.label, sub?.label].filter(Boolean).join(" › ")}</h2>
                <p className="type-caption text-secondary">The form will ask for these spec fields, with units:</p>
                <ul className="flex flex-wrap gap-2">
                  {defs.map((d) => (
                    <li key={d.key} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm">
                      {d.label}
                    </li>
                  ))}
                </ul>
                <p className="type-caption text-secondary">
                  Changing the category later sends the product back to review.
                </p>
              </>
            ) : (
              <p className="type-body-sm text-body">
                Choose a category{category ? " and a type" : ""} to see its spec fields.
              </p>
            )}
          </section>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-default bg-page p-4">
        <div>
          <p className="type-caption text-secondary">Selected category</p>
          <p className="type-label">
            {chosen ? [klass?.label, category?.label, sub?.label].filter(Boolean).join(" › ") : "None yet"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/supplier/products" className="type-label text-primary">
            Cancel
          </Link>
          {chosen ? (
            <Link href={`/supplier/products/new?category=${chosen.id}`} className={buttonClasses({})}>
              Continue
            </Link>
          ) : (
            <span className={cx(buttonClasses({}), "pointer-events-none opacity-50")} aria-disabled="true">
              Continue
            </span>
          )}
        </div>
      </div>
    </SupplierShell>
  );
}
