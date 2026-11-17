import { getDb } from "@h2india/core";
import { can, scopeFor } from "@h2india/core/authz";
import { supplierGstins } from "@h2india/core/rfq";
import type { Metadata } from "next";
import { GstinCard } from "@/buyer/Settings";
import { addSupplierGstinAction, replaceSupplierGstinAction } from "@/supplier/company-actions";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Company details · GSTIN (supplier QC, 16 Nov 2026; one GSTIN per company since founder QC, 17 Nov 2026, A189). No
// Figma frame: the buyer's GSTIN card with the supplier's actions. Every quote is issued under this GSTIN.
export const metadata: Metadata = { title: "Company details · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SupplierCompanyPage() {
  const page = await requireSupplier("/supplier/company");
  const org = page.supplier.organisationId;
  const [g] = await supplierGstins(getDb(), scopeFor(page.actor), org);
  const canManage = can(page.actor, "company.manage", { organisationId: org });
  return (
    <SupplierShell page={page} current="/supplier/company" title="Company details">
      <div className="flex max-w-180 flex-col gap-1">
        <h1 className="type-h2">GSTIN</h1>
        <p className="type-body-sm text-secondary">
          Your company&apos;s GSTIN. Every quote, order and invoice you issue on H2 Economy uses it.
        </p>
      </div>
      <GstinCard
        canEdit={canManage}
        add={addSupplierGstinAction}
        replace={replaceSupplierGstinAction}
        current={g ? { gstin: g.gstin, place: g.place, status: g.portalStatus, checkedOn: null } : null}
      />
    </SupplierShell>
  );
}
