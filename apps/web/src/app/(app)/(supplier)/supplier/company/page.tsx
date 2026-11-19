import { getDb } from "@h2india/core";
import { can, scopeFor } from "@h2india/core/authz";
import { companySettings } from "@h2india/core/buyer";
import { panOf, stateOf } from "@h2india/core/companies/client";
import { formatIstDayMonth } from "@h2india/core/time";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GstinCard } from "@/buyer/Settings";
import { addSupplierGstinAction, replaceSupplierGstinAction } from "@/supplier/company-actions";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Company details (supplier QC, 16 Nov 2026; one GSTIN per company since founder QC, 17 Nov 2026, A189). No Figma
// frame. The company's details as GST records give them (legal name, state, registered address, PAN; read-only, they
// come from the GSTIN) and the GSTIN card with the supplier's actions and words. Every quote is issued under this GSTIN.
export const metadata: Metadata = { title: "Company details · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SupplierCompanyPage() {
  const page = await requireSupplier("/supplier/company");
  const org = page.supplier.organisationId;
  const company = await companySettings(getDb(), scopeFor(page.actor), org);
  if (!company) notFound();
  const g = company.gstins[0] ?? null;
  const canManage = can(page.actor, "company.manage", { organisationId: org });
  const details: [string, string | null, boolean?][] = [
    ["Legal name", company.org.legalName],
    ["State", company.org.state ?? (g ? stateOf(g.gstin) || null : null)],
    ["Registered address", company.org.registeredAddress],
    ["PAN", company.org.pan ?? (g ? panOf(g.gstin) : null), true],
  ];
  return (
    <SupplierShell page={page} current="/supplier/company" title="Company details">
      <div className="flex max-w-180 flex-col gap-1">
        <h1 className="type-h2">Company details</h1>
        <p className="type-body-sm text-secondary">
          Your company as GST records show it. Every quote, order and invoice you issue on H2 Economy uses these details
          and your GSTIN.
        </p>
      </div>
      <section
        aria-labelledby="details"
        className="flex max-w-3xl flex-col gap-3 rounded-card border border-default bg-page p-5"
      >
        <h2 id="details" className="type-h4">
          From your GST records
        </h2>
        <dl>
          {details.map(([label, value, mono]) => (
            <div
              key={label}
              className="grid grid-cols-1 gap-1 border-t border-default py-2.5 md:grid-cols-[180px_minmax(0,1fr)]"
            >
              <dt className="type-body-sm text-secondary">{label}</dt>
              <dd
                className={
                  value
                    ? mono
                      ? "type-spec text-primary"
                      : "type-body-sm text-primary"
                    : "type-body-sm text-secondary"
                }
              >
                {value ?? (g ? "Filled in once we've checked your GSTIN" : "Comes from your GSTIN")}
              </dd>
            </div>
          ))}
        </dl>
        <p className="type-caption text-secondary">
          These come from your GSTIN and can&apos;t be edited here. If something is wrong, write to H2 Economy through{" "}
          <a href="/contact" className="text-link underline">
            Contact
          </a>
          .
        </p>
      </section>
      <GstinCard
        canEdit={canManage}
        add={addSupplierGstinAction}
        replace={replaceSupplierGstinAction}
        addDescription="We check it with GST records in the background and fill in your state and registered address from it. You can keep setting up while we check."
        current={
          g
            ? {
                gstin: g.gstin,
                place: g.place,
                status: g.portalStatus,
                checkedOn: g.portalStatus === "Active" && g.checkedAt ? formatIstDayMonth(g.checkedAt) : null,
              }
            : null
        }
      />
    </SupplierShell>
  );
}
