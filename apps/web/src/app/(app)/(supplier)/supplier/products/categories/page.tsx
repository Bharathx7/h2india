import { getDb } from "@h2india/core";
import { can, scopeFor } from "@h2india/core/authz";
import { companyCategoryRequests } from "@h2india/core/catalogue/taxonomy";
import { formatIstDate } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { catalogue } from "@/marketplace/data";
import { CategoryRequestForm } from "@/supplier/CategoryRequestForm";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Request a category (supplier QC, 16 Nov 2026). No Figma frame: built from the Add a product page and the
// workspace panels. A supplier can't list in a requested category until H2 Economy approves it, which adds it to the
// catalogue; the answer arrives here and in notifications.
export const metadata: Metadata = { title: "Request a category · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const TONE = { Pending: "progress", Approved: "success", Rejected: "error" } as const;
const WORD = { Pending: "Waiting for review", Approved: "Approved", Rejected: "Not approved" } as const;

export default async function CategoryRequestsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/products/categories");
  const org = page.supplier.organisationId;
  const [cat, requests] = await Promise.all([catalogue(), companyCategoryRequests(getDb(), scopeFor(page.actor), org)]);
  const canAsk = can(page.actor, "product.manage", { organisationId: org });
  const classes = cat.classes.map((c) => ({
    id: c.id,
    label: c.label,
    categories: c.categories.map((k) => ({ id: k.id, label: k.label })),
  }));
  const classLabel = new Map<string, string>(cat.classes.map((c) => [c.id, c.label]));
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <Link href="/supplier/products/new" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Add a product
      </Link>
      <div className="flex max-w-180 flex-col gap-1">
        <h1 className="type-h2">Request a category</h1>
        <p className="type-body-sm text-secondary">
          Can&apos;t find a category that fits your product? Tell us what it is. Once we approve it, it appears in the
          catalogue and you can list products in it.
        </p>
      </div>
      {canAsk ? (
        <CategoryRequestForm classes={classes} initialLabel={sp.q?.trim().slice(0, 80) ?? ""} />
      ) : (
        <p className="rounded-card border border-default bg-page p-5 type-body-sm text-body">
          Your company admin or catalogue team can request a category.
        </p>
      )}
      <section aria-labelledby="your-requests" className="flex flex-col gap-3">
        <h2 id="your-requests" className="type-h4">
          Your requests
        </h2>
        {requests.length ? (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
            {requests.map((r) => (
              <li key={r.id} id={r.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="type-label">{r.label}</span>
                  <StatusBadge
                    status={WORD[r.status as keyof typeof WORD]}
                    tone={TONE[r.status as keyof typeof TONE]}
                  />
                </div>
                <span className="type-caption text-secondary">
                  {classLabel.get(r.classId) ?? r.classId} · asked {formatIstDate(r.createdAt)}
                </span>
                {r.status === "Rejected" && r.reason ? (
                  <p className="type-body-sm text-body">Reason: {r.reason}</p>
                ) : null}
                {r.status === "Approved" && r.categoryId ? (
                  <Link
                    href={`/supplier/products/new?category=${r.categoryId}`}
                    className="self-start type-label text-link underline underline-offset-2"
                  >
                    Add a product in this category
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-sm text-secondary">You haven&apos;t requested a category yet.</p>
        )}
      </section>
    </SupplierShell>
  );
}
