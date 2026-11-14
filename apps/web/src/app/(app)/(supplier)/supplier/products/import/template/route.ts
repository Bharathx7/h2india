import { getDb } from "@h2india/core";
import { effectiveSchema } from "@h2india/core/catalogue/taxonomy";
import { templateCsv } from "@h2india/core/products";
import { requireSupplier } from "@/supplier/shell";

// GET …/import/template?category=<id>: the CSV template for a category (607:9 "Download template (CSV)").
export async function GET(request: Request) {
  await requireSupplier("/supplier/products/import");
  const id = new URL(request.url).searchParams.get("category") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Choose a category", { status: 400 });
  const csv = templateCsv(await effectiveSchema(getDb(), id, { includeSample: true }));
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="h2india-template.csv"`,
    },
  });
}
