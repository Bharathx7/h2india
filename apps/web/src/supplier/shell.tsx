import { getDb } from "@h2india/core";
import { loadActor, type Actor } from "@h2india/core/authz";
import { suspensionOf } from "@h2india/core/admin/appeals";
import { supplierOf, type SupplierContext } from "@h2india/core/supplier";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SuspendedBanner } from "@/supplier/appeal/Banner";
import { getSession } from "@/server/auth";

// The supplier workspace (Figma page 14, Stage 8): Workspace sidebar v2, supplier variant (Catalogue, Selling,
// Business, Company), with Add product in the top bar. Orders are left out while transactions are off.

export interface SupplierPage {
  userId: string;
  actor: Actor;
  supplier: SupplierContext;
}

/** The signed-in person and their supplier company; anyone else is sent to sign in or to join as a supplier. */
export async function requireSupplier(path: string): Promise<SupplierPage> {
  const session = await getSession();
  if (!session) redirect(`/supplier/sign-in?next=${encodeURIComponent(path)}`);
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  const supplier = await supplierOf(db, actor);
  // Signed in without a supplier company: finish (or start) supplier sign-up, the same as buyers (founder QC,
  // 19 Nov 2026). Join sends people who already have another workspace on to it.
  if (!supplier) redirect("/join/supplier");
  return { userId: session.user.id, actor, supplier };
}

/**
 * A supplier page's content area, with the suspension banner when the company is suspended. The frame (sidebar, top
 * bar, Add product) is drawn once by the supplier layout (SupplierFrame, founder 20 Nov 2026).
 */
export async function SupplierShell({
  page,
  children,
}: {
  page: SupplierPage;
  current?: string;
  /** The page's name ("Dashboard"). The top bar no longer shows it (founder QC, 17 Nov 2026); pages show their own h1. */
  title?: string;
  children: ReactNode;
}) {
  const suspension = await suspensionOf(getDb(), page.supplier.organisationId);
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {suspension ? (
        <SuspendedBanner
          reason={suspension.reason}
          appeal={suspension.appeal ? { status: suspension.appeal.status, note: suspension.appeal.note } : null}
          canAppeal={page.supplier.seat.permissions.has("company.manage")}
        />
      ) : null}
      {children}
    </div>
  );
}
