import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { teamView } from "@h2india/core/supplier";
import type { Metadata } from "next";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { TeamPanel } from "@/team/TeamPanel";

// Team (592:371; phones 594:564; Dialog Remove team member 685:318), step 8.7. Founder QC (17 Nov 2026): each member's
// access is ticked per person when they're added or edited (presets tick the boxes), instead of fixed roles.
export const metadata: Metadata = { title: "Team · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/team");
  const s = page.supplier;
  const view = await teamView(getDb(), scopeFor(page.actor), s.organisationId);
  return (
    <SupplierShell page={page} current="/supplier/team" title="Team">
      <div>
        <h1 className="type-h2">Team</h1>
        <p className="type-body-sm text-secondary">
          Who at {s.tradeName} can quote, manage products and see money. Tick what each person can do.
        </p>
      </div>
      <TeamPanel
        view={view}
        company={s.tradeName}
        selfId={page.userId}
        manage={s.seat.permissions.has("team.manage")}
        sp={sp}
        basePath="/supplier/team"
      />
    </SupplierShell>
  );
}
