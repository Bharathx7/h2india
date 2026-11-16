import { Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AddSupplierForm } from "@/admin/companies/AddSupplierForm";
import { AdminShell, requireOperator } from "@/admin/shell";

// Add a supplier (admin QC, 16 Nov 2026). No Figma frame: built from the admin forms. The company is created exactly
// as Join creates it; it isn't Verified until its badges are granted from evidence.
export const metadata: Metadata = { title: "Add a supplier · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AddSupplierPage() {
  const { userId } = await requireOperator("users.edit", "/admin/users/companies/new");
  return (
    <AdminShell userId={userId} current="/admin/users" title="Users">
      <Link href="/admin/users" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Users
      </Link>
      <div className="flex max-w-180 flex-col gap-1">
        <h1 className="type-h2">Add a supplier</h1>
        <p className="type-body-sm text-secondary">
          For a supplier who asked us to set them up. We check the GSTIN and refuse a company that&apos;s already on H2
          India. The owner gets an invitation by email. The company isn&apos;t verified until its badges are granted.
        </p>
      </div>
      <AddSupplierForm />
    </AdminShell>
  );
}
