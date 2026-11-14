import { getDb } from "@h2india/core";
import { myAlerts } from "@h2india/core/alerts";
import { memberProfile } from "@h2india/core/members";
import { Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { catalogue } from "@/marketplace/data";
import { BuyerWorkspace, requireBuyer } from "@/buyer/shell";
import { WatchCategory, type CategoryOption, type WatchRow } from "@/member/WatchCategory";

// Buyer Saved searches and alerts (79:3425; phones 132:9656; empty 128:9510, loading 128:9530, error 128:9553), step
// 7.3: the categories a buyer watches, in the buyer workspace (step 9.1).
export const metadata: Metadata = { title: "Alerts · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BuyerAlertsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const sp = await searchParams;
  const page = await requireBuyer("/buyer/alerts");
  const userId = page.userId;
  const db = getDb();
  const [alerts, cat, profile] = await Promise.all([myAlerts(db, userId), catalogue(), memberProfile(db, userId)]);
  const categories: CategoryOption[] = cat.classes.flatMap((c) =>
    c.categories.map((k) => ({ value: `${c.id}|${k.label}`, label: `${c.label} › ${k.label}` })),
  );
  const pathOf = (filters: Record<string, string[]>) => {
    const klass = cat.classes.find((c) => c.id === filters.class?.[0]);
    return [klass?.label, filters.category?.[0]].filter(Boolean).join(" › ");
  };
  const rows: WatchRow[] = alerts
    .filter((a) => a.type === "products")
    .map((a) => ({
      id: a.id,
      label: a.label,
      path: pathOf(a.filters),
      news: a.thisWeek ? `${String(a.thisWeek)} new this week` : "No new products",
      frequency: a.frequency,
      on: a.on,
      filters: a.filters,
      channels: a.channels,
    }));
  return (
    <BuyerWorkspace page={page} current="/buyer/alerts">
      <LiveSection
        label="Alerts"
        state={forcedState(sp.state) ?? "ready"}
        skeleton={
          <div className="flex flex-col gap-4">
            <Skeleton kind="card" />
            <Skeleton kind="card" />
          </div>
        }
        empty={null}
      >
        <WatchCategory
          rows={rows}
          categories={categories}
          states={(profile?.states ?? []).filter((s) => s !== "All of India")}
        />
      </LiveSection>
    </BuyerWorkspace>
  );
}
