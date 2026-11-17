import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { storefrontView } from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import type { Metadata } from "next";
import { StorefrontEditor } from "@/supplier/StorefrontEditor";
import { requireSupplier, SupplierShell } from "@/supplier/shell";

// Storefront editor (590:8; phones 594:8), step 8.7, rebuilt as a step-by-step flow in founder QC (17 Nov 2026). The
// public result is the profile (482:8, step 6.7).
export const metadata: Metadata = { title: "Storefront · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const page = await requireSupplier("/supplier/storefront");
  const s = page.supplier;
  const v = await storefrontView(getDb(), scopeFor(page.actor), s.organisationId);
  return (
    <SupplierShell page={page} current="/supplier/storefront" title="Storefront">
      {
        <StorefrontEditor
          start={v.working}
          organisationId={s.organisationId}
          company={s.tradeName}
          place={s.city ?? ""}
          verified={s.verification === "Verified"}
          canEdit={s.seat.permissions.has("storefront.manage")}
          status={{
            live: Boolean(v.profile),
            draft: v.open?.status === "Draft" || v.open?.status === "Needs changes",
            changes: v.open?.status === "Draft" || v.open?.status === "Needs changes" ? v.changed.length : 0,
            inReview: v.open?.status === "In review",
            note: v.open?.status === "Needs changes" ? v.open.note : null,
            lastPublished: v.lastPublished ? formatIstDate(v.lastPublished) : null,
            profileHref: v.profile ? `/directory/companies/${v.profile.slug}` : null,
          }}
          key={v.open?.id ?? "live"}
        />
      }
    </SupplierShell>
  );
}
