import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { listImports } from "@h2india/core/products";
import { formatIstDateTime } from "@h2india/core/time";
import { EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { catalogue } from "@/marketplace/data";
import { ImportUpload } from "@/supplier/ImportUpload";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Bulk upload (607:9; phones 608:8; Modal Import products 272:4427), step 8.5. The worker checks every row; valid rows
// become drafts matched on the supplier's SKU; problems are listed by row and column.
export const metadata: Metadata = { title: "Bulk upload · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const page = await requireSupplier("/supplier/products/import");
  const [imports, cat] = await Promise.all([
    listImports(getDb(), scopeFor(page.actor), page.supplier.organisationId),
    catalogue(),
  ]);
  const categories = cat.classes.flatMap((c) =>
    c.categories.flatMap((k) => [
      ...(k.children.length ? [] : [{ id: k.id, label: `${c.label} › ${k.label}` }]),
      ...k.children.map((s) => ({ id: s.id, label: `${c.label} › ${k.label} › ${s.label}` })),
    ]),
  );
  return (
    <SupplierShell page={page} current="/supplier/products" title="Products">
      <Link href="/supplier/products" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Products
      </Link>
      <div>
        <h1 className="type-h2">Bulk upload</h1>
        <p className="type-body-sm text-secondary">
          Add many products at once from a CSV. Each category has its own template with the spec fields buyers compare.
        </p>
      </div>
      <ImportUpload
        organisationId={page.supplier.organisationId}
        categories={categories}
        checking={imports.some((x) => x.i.status === "Checking rows")}
      />
      <h2 className="type-h3">Import history</h2>
      {imports.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="Import history"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  File
                </th>
                <th scope="col" className="px-2 py-3">
                  Category
                </th>
                <th scope="col" className="px-2 py-3">
                  Uploaded
                </th>
                <th scope="col" className="px-2 py-3">
                  Rows
                </th>
                <th scope="col" className="px-2 py-3">
                  Result
                </th>
                <th scope="col" className="px-2 py-3">
                  <span className="sr-only">Report</span>
                </th>
              </tr>
            </thead>
            {imports.map(({ i, by, category }) => {
              const failed = i.status === "File not read";
              const problemRows = new Set(i.errors.map((e) => e.row)).size;
              return (
                <tbody key={i.id} className="border-t border-default">
                  <tr>
                    <td className="px-4 py-3">
                      <span className="flex gap-2">
                        <Icon name="file-text" size={18} />
                        <span>
                          <span className="block type-spec">{i.fileName}</span>
                          <span className="block type-caption text-secondary">by {by}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-3 type-body-sm">{category}</td>
                    <td className="px-2 py-3 type-body-sm">{formatIstDateTime(i.createdAt)}</td>
                    <td className="px-2 py-3 type-body-sm">{i.rows || "—"}</td>
                    <td className="px-2 py-3">
                      {i.status === "Checking rows" ? (
                        <StatusBadge status="Checking rows" tone="progress" />
                      ) : failed ? (
                        <>
                          <StatusBadge status="File not read" tone="error" />
                          <span className="block type-caption text-error">{i.error}</span>
                        </>
                      ) : problemRows ? (
                        <>
                          <StatusBadge
                            status={`${String(problemRows)} ${problemRows === 1 ? "row needs" : "rows need"} fixing`}
                            tone="warning"
                          />
                          <span className="block type-caption text-secondary">{i.saved} saved as drafts</span>
                        </>
                      ) : (
                        <>
                          <StatusBadge status="All rows saved" tone="success" />
                          <span className="block type-caption text-secondary">{i.saved} saved as drafts</span>
                        </>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right">
                      {failed || problemRows ? (
                        <a
                          href={`/supplier/products/import/${i.id}/errors`}
                          className="inline-flex items-center gap-1.5 rounded-pill border-[1.5px] border-control px-3 py-1.5 type-label"
                        >
                          <Icon name="download" size={16} />
                          Error report
                        </a>
                      ) : i.status === "Done" ? (
                        <Link href="/supplier/products?tab=drafts" className="type-label">
                          View drafts
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                  {problemRows ? (
                    <tr className="bg-subtle">
                      <td colSpan={6} className="px-6 py-4">
                        <p className="type-label">Rows that need fixing</p>
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {i.errors.slice(0, 10).map((e, n) => (
                            <li
                              key={String(n)}
                              className="grid grid-cols-1 gap-3 type-body-sm md:grid-cols-[60px_120px_minmax(0,1fr)]"
                            >
                              <span className="type-spec text-secondary">Row {e.row}</span>
                              <span className="type-spec">{e.sku}</span>
                              <span>{e.message}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 type-caption text-secondary">
                          Fix these rows in your file and upload it again, or add the products by hand.
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              );
            })}
          </table>
        </div>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="No imports yet">
            Download a template, fill it in and upload it. Each row becomes a draft for you to check.
          </EmptyState>
        </div>
      )}
    </SupplierShell>
  );
}
