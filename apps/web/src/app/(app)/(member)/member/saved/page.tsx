import { getDb } from "@h2india/core";
import { listSaved } from "@h2india/core/members";
import { cx, EmptyState, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { RemoveSaved } from "@/member/controls";
import { FromLink } from "@/member/FromLink";
import { MemberShell, requireMember } from "@/member/shell";
import { formatIstDayMonth } from "@h2india/core/companies/client";

// Saved items (541:8; phones 542:46; empty 541:643, loading 541:796), step 7.2. Save links across the site arrive
// here as ?job=slug, ?tender=slug … and are saved once the page opens (never on prefetch).
export const metadata: Metadata = { title: "Saved items · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "article", label: "Articles", types: ["article"] },
  { value: "product", label: "Products", types: ["product"] },
  { value: "opportunity", label: "Tenders and schemes", types: ["tender", "scheme", "grant", "job"] },
  { value: "event", label: "Events", types: ["event"] },
  { value: "company", label: "Companies", types: ["company"] },
] as const;
const LINK_TYPES = ["article", "product", "tender", "scheme", "grant", "event", "job", "company"];

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const userId = await requireMember("/member/saved");
  const forced = forcedState(sp.state);
  const pendingType = LINK_TYPES.find((t) => sp[t]);
  const all = await listSaved(getDb(), userId);
  const tab = TABS.find((t) => t.value === sp.tab) ?? TABS[0];
  const q = (sp.q ?? "").trim().toLowerCase();
  const shown = all
    .filter((s) => (tab.types as readonly string[]).includes(s.targetType))
    .filter((s) => !q || s.title.toLowerCase().includes(q))
    .sort((a, b) =>
      sp.sort === "title" ? a.title.localeCompare(b.title) : b.createdAt.getTime() - a.createdAt.getTime(),
    );
  return (
    <MemberShell userId={userId} current="/member/saved">
      <FromLink kind="save" type={pendingType ?? null} value={pendingType ? (sp[pendingType] ?? "") : ""} />
      <div>
        <h1 className="type-h2">Saved items</h1>
        <p className="type-body text-secondary">{all.length} items. Only you can see what you save.</p>
      </div>
      <nav aria-label="Saved item types" className="flex gap-5 overflow-x-auto border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/member/saved?tab=${t.value}`}
            aria-current={tab.value === t.value ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label whitespace-nowrap",
              tab.value === t.value ? "border-inverse text-primary" : "border-transparent text-secondary",
            )}
          >
            {t.label}{" "}
            <span className="text-secondary">
              {all.filter((s) => (t.types as readonly string[]).includes(s.targetType)).length}
            </span>
          </Link>
        ))}
      </nav>
      <form method="get" className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="tab" value={tab.value} />
        <input
          name="q"
          defaultValue={sp.q}
          aria-label={`Search saved ${tab.label.toLowerCase()}`}
          placeholder={`Search saved ${tab.label.toLowerCase()}`}
          className="h-11 min-w-60 flex-1 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        />
        <select
          name="sort"
          defaultValue={sp.sort ?? "recent"}
          aria-label="Sort by"
          className="h-11 rounded-control border-[1.5px] border-control bg-page px-3 type-body"
        >
          <option value="recent">Recently saved</option>
          <option value="title">Title A–Z</option>
        </select>
      </form>
      <LiveSection
        label="Saved items"
        state={forced ?? (shown.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-3">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState title={q ? "Nothing saved matches" : `No saved ${tab.label.toLowerCase()} yet`}>
              Use Save on articles, products, tenders, schemes, events and companies to keep them here.
            </EmptyState>
          </div>
        }
      >
        <ul className="flex flex-col gap-3">
          {shown.map((s) => (
            <li key={s.id} className="flex items-center gap-4 rounded-card border border-default bg-page p-4">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {s.meta ? <span className="type-eyebrow text-secondary">{s.meta}</span> : null}
                <Link href={s.href} className="type-h4 text-primary hover:underline">
                  {s.title}
                </Link>
              </span>
              <span className="type-caption text-secondary whitespace-nowrap">
                Saved {formatIstDayMonth(s.createdAt)}
              </span>
              <RemoveSaved id={s.id} title={s.title} />
            </li>
          ))}
        </ul>
      </LiveSection>
    </MemberShell>
  );
}
