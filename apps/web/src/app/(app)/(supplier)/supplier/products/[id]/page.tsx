import type { Metadata } from "next";
import { requireSupplier } from "@/supplier/shell";
import { EditorPage } from "../editor-page";

// Product editor (602:281 needs changes, 603:8 rejected; phones 604:8, 614:8), step 8.3.
export const metadata: Metadata = { title: "Edit product · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = await requireSupplier(`/supplier/products/${id}`);
  return <EditorPage page={page} productId={id} categoryId={sp.category} />;
}
