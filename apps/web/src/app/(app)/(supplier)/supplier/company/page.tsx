import { getDb } from "@h2india/core";
import { can, scopeFor } from "@h2india/core/authz";
import { supplierGstins } from "@h2india/core/rfq";
import { StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import { AddGstin, GstinActions } from "@/buyer/Settings";
import {
  addSupplierGstinAction,
  defaultSupplierGstinAction,
  removeSupplierGstinAction,
} from "@/supplier/company-actions";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Company details · GSTINs (supplier QC, 16 Nov 2026). No Figma frame: built like the buyer's GSTINs (574:638), with
// the same rules (same PAN, checked with GST records, only a verified GSTIN can be the default or issue a quote).
export const metadata: Metadata = { title: "Company details · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SupplierCompanyPage() {
  const page = await requireSupplier("/supplier/company");
  const org = page.supplier.organisationId;
  const gstins = await supplierGstins(getDb(), scopeFor(page.actor), org);
  const canManage = can(page.actor, "company.manage", { organisationId: org });
  return (
    <SupplierShell page={page} current="/supplier/company" title="Company details">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-180 flex-col gap-1">
          <h1 className="type-h2">GSTINs</h1>
          <p className="type-body-sm text-secondary">
            Add each state registration you sell from. Each quote is issued under one verified GSTIN; the default is
            chosen unless you pick another on the quote.
          </p>
        </div>
        {canManage ? (
          <AddGstin
            action={addSupplierGstinAction}
            description="It must have the same PAN as your company. We check it with GST records in the background."
          />
        ) : null}
      </div>
      {gstins.length ? (
        <div
          tabIndex={0}
          role="region"
          aria-label="GSTINs"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-160">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  GSTIN
                </th>
                <th scope="col" className="px-2 py-3">
                  State and place of business
                </th>
                <th scope="col" className="px-2 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {gstins.map((g) => (
                <tr key={g.id} className="border-t border-default">
                  <td className="px-4 py-3">
                    <span className="block type-mono">{g.gstin}</span>
                    {g.isDefault ? <StatusBadge status="Default" tone="neutral" /> : null}
                  </td>
                  <td className="px-2 py-3 type-body-sm">{g.place ?? "—"}</td>
                  <td className="px-2 py-3">
                    {g.portalStatus === "Active" ? (
                      <StatusBadge status="Verified" tone="success" />
                    ) : g.portalStatus === "Pending" ? (
                      <StatusBadge status="Checking with GST records" tone="progress" />
                    ) : (
                      <StatusBadge status={g.portalStatus} tone="error" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <GstinActions
                        id={g.id}
                        gstin={g.gstin}
                        isDefault={g.isDefault}
                        active={g.portalStatus === "Active"}
                        setDefault={defaultSupplierGstinAction}
                        remove={removeSupplierGstinAction}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-card border border-default bg-page p-5 type-body-sm text-body">
          No GSTIN yet.{" "}
          {canManage ? "Add the GSTIN of each state you sell from." : "Ask your company admin to add one."}
        </p>
      )}
      {canManage ? null : <p className="type-caption text-secondary">Only a company admin can add or change GSTINs.</p>}
    </SupplierShell>
  );
}
