import { getDb } from "@h2india/core";
import { can } from "@h2india/core/authz";
import { catalogueApplications, catalogueTree, categoryRequestQueue } from "@h2india/core/catalogue/taxonomy";
import { buttonClasses, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell, requireOperator } from "@/admin/shell";
import { CatalogueTabs } from "./CatalogueTabs";
import { catalogueSummary } from "./summary";

// Catalogue · Overview (founder, 20 Nov 2026): the catalogue at a glance, what needs attention, and the classes to
// open. Operators with catalogue.view see it; catalogue.edit changes it. Others get a plain 404.
export const metadata: Metadata = { title: "Catalogue · H2 Economy admin", robots: { index: false } };

export default async function CatalogueOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  // Old links (?category=…) open the category's own page.
  if (sp.category)
    redirect(`/admin/catalogue/categories/${encodeURIComponent(sp.category)}${sp.tab ? `?tab=${sp.tab}` : ""}`);
  const { userId, actor } = await requireOperator("catalogue.view", "/admin/catalogue");
  const db = getDb();
  const [tree, applications, requests] = await Promise.all([
    catalogueTree(db, actor),
    catalogueApplications(db, { includeHidden: true }),
    can(actor, "queues.view") ? categoryRequestQueue(db, actor) : Promise.resolve([]),
  ]);
  const s = catalogueSummary(tree);
  const tiles = [
    { label: "Classes", value: s.classes },
    { label: "Categories", value: s.categories },
    { label: "Sub-categories", value: s.subCategories },
    { label: "Applications", value: applications.length },
    { label: "Live products", value: s.liveProducts },
  ];
  const attention = [
    {
      label: "Category requests from suppliers",
      count: requests.length,
      href: "/admin/catalogue/requests",
      hint: "Approve to add the category, or reject with a reason.",
    },
    {
      label: "Categories with no product fields",
      count: s.noFields.length,
      href: "/admin/catalogue/categories?show=no-fields",
      hint: "Suppliers get an empty form until you add fields.",
    },
    {
      label: "Hidden categories",
      count: s.hidden.length,
      href: "/admin/catalogue/categories?show=hidden",
      hint: "Not shown on the marketplace until you show them.",
    },
  ].filter((a) => a.count > 0);

  return (
    <AdminShell userId={userId} current="/admin/catalogue">
      <CatalogueTabs current="overview" requests={requests.length} />

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label} className="flex flex-col gap-1 rounded-card border border-default bg-page p-4">
            <span className="type-caption text-secondary">{t.label}</span>
            <span className="type-h3 text-primary">{t.value.toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="attention" className="flex flex-col gap-3">
        <h2 id="attention" className="type-h4">
          Needs attention
        </h2>
        {attention.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {attention.map((a) => (
              <li key={a.label}>
                <Link
                  href={a.href}
                  className="flex h-full flex-col gap-1 rounded-card border border-default bg-page p-4 hover:border-focus"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="type-label text-primary">{a.label}</span>
                    <span className="rounded-pill bg-tint px-2.5 py-0.5 type-label-sm text-primary">{a.count}</span>
                  </span>
                  <span className="type-caption text-secondary">{a.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-default bg-page p-4 type-body-sm text-secondary">
            Nothing needs attention: no open requests, every main category has product fields, nothing is hidden.
          </p>
        )}
      </section>

      <section aria-labelledby="classes" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="classes" className="type-h4">
            Classes
          </h2>
          <Link href="/admin/catalogue/categories" className={buttonClasses({ variant: "outline", size: "sm" })}>
            All categories
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tree.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/catalogue/categories?class=${c.id}`}
                className="flex h-full flex-col gap-2 rounded-card border border-default bg-page p-5 hover:border-focus"
              >
                <span className="type-label-lg text-primary">{c.label}</span>
                <span className="type-body-sm text-secondary">
                  {c.categories.length} {c.categories.length === 1 ? "category" : "categories"} ·{" "}
                  {c.categories.reduce((a, n) => a + n.children.length, 0)} sub-categories ·{" "}
                  {c.liveProducts.toLocaleString("en-IN")} live products
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
