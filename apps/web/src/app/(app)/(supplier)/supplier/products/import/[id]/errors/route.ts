import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { listImports } from "@h2india/core/products";
import { requireSupplier } from "@/supplier/shell";

// GET …/import/<id>/errors: the rows that need fixing, as a CSV (607:9 "Error report"). The supplier's own import.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await requireSupplier("/supplier/products/import");
  const row = (await listImports(getDb(), scopeFor(page.actor), page.supplier.organisationId)).find(
    (x) => x.i.id === id,
  );
  if (!row) return new Response("Not found", { status: 404 });
  const q = (v: string) =>
    /[",\n]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"` : v;
  const lines = [
    "row,sku,column,problem",
    ...(row.i.error ? [`,,,${q(row.i.error)}`] : []),
    ...row.i.errors.map((e) => [String(e.row), e.sku, e.column, e.message].map(q).join(",")),
  ];
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="errors-${row.i.fileName.replace(/[^\w.-]/g, "_")}"`,
    },
  });
}
