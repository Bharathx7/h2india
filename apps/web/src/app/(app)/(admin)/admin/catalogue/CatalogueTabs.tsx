import { cx } from "@h2india/ui";
import Link from "next/link";

// Catalogue's sections (founder, 20 Nov 2026: "the catalogue needs a proper restructure"): Overview, Categories,
// Applications and Requests, the same header on each.

const TABS = [
  { key: "overview", label: "Overview", href: "/admin/catalogue" },
  { key: "categories", label: "Categories", href: "/admin/catalogue/categories" },
  { key: "applications", label: "Applications", href: "/admin/catalogue/applications" },
  { key: "requests", label: "Requests", href: "/admin/catalogue/requests" },
] as const;

export type CatalogueSection = (typeof TABS)[number]["key"];

export function CatalogueTabs({ current, requests }: { current: CatalogueSection; requests?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-3xl flex-col gap-1">
        <h1 className="type-h2">Catalogue</h1>
        <p className="type-body-sm text-secondary">
          The classes, categories and product fields suppliers list under, and the applications buyers browse by.
          Changes here shape every product form, filter and comparison.
        </p>
      </div>
      <nav aria-label="Catalogue" className="flex gap-6 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === current ? "page" : undefined}
            className={cx(
              "-mb-px inline-flex items-center gap-2 border-b-2 py-3 whitespace-nowrap type-label",
              t.key === current ? "border-inverse text-primary" : "border-transparent text-secondary",
            )}
          >
            {t.label}
            {t.key === "requests" && requests ? (
              <span className="rounded-pill bg-tint px-2 py-0.5 type-label-sm text-primary">{requests}</span>
            ) : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
