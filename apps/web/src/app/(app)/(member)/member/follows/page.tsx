import { getDb } from "@h2india/core";
import { formatIstDayMonth } from "@h2india/core/companies/client";
import { listFollows } from "@h2india/core/members";
import { STATES, TOPICS } from "@h2india/core/members/rules";
import { filterDirectory, parseDirectory } from "@h2india/core/directory/rules";
import { cx, EmptyState, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ListPager } from "@/components/ListPager";
import { companies as directory } from "@/directory/data";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";
import { AddFollow, FollowLevel, Unfollow } from "@/member/controls";
import { FromLink } from "@/member/FromLink";
import { MemberShell, requireMember } from "@/member/shell";

// Manage follows (543:8; phones 549:254; search to add 550:8), step 7.2: companies, topics and states, each with how it
// notifies (All updates, Digest only, None). Follow links arrive as ?company=slug, ?topic=…, ?state=….
export const metadata: Metadata = { title: "Follows · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = [
  { value: "company", label: "Companies" },
  { value: "topic", label: "Topics" },
  { value: "state", label: "States" },
] as const;

export default async function FollowsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const userId = await requireMember("/member/follows");
  const linkType = (["company", "topic", "state"] as const).find((t) => sp[t]);
  const follows = await listFollows(getDb(), userId);
  const tab = TABS.find((t) => t.value === sp.tab) ?? TABS[0];
  const mine = follows.filter((f) => f.targetType === tab.value);
  const paged = pageOf(mine, pageRequest(sp));
  const count = (t: string) => follows.filter((f) => f.targetType === t).length;
  const q = (sp.q ?? "").trim();
  const followed = new Set(mine.map((f) => f.targetId));
  const results =
    tab.value === "company" && q
      ? filterDirectory(await directory(), parseDirectory({ q }))
          .items.filter((e) => !followed.has(e.id))
          .slice(0, 6)
      : [];
  const addable =
    tab.value === "topic"
      ? TOPICS.filter((t) => !followed.has(t.value)).map((t) => ({ value: t.value, label: t.label }))
      : tab.value === "state"
        ? STATES.filter((s) => !followed.has(s)).map((s) => ({ value: s, label: s }))
        : [];
  return (
    <MemberShell userId={userId} current="/member/follows">
      <FromLink kind="follow" type={linkType ?? null} value={linkType ? (sp[linkType] ?? "") : ""} />
      <div>
        <h1 className="type-h2">Manage follows</h1>
        <p className="type-body text-secondary">
          {count("company")} organisations, {count("topic")} topics and {count("state")} states. What you follow shapes
          your home feed.
        </p>
      </div>
      <nav aria-label="Follow types" className="flex gap-5 border-b border-default">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/member/follows?tab=${t.value}`}
            aria-current={tab.value === t.value ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 py-3 type-label",
              tab.value === t.value ? "border-inverse text-primary" : "border-transparent text-secondary",
            )}
          >
            {t.label} <span className="text-secondary">{count(t.value)}</span>
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {tab.value === "company" ? (
            <form
              method="get"
              role="search"
              className="flex items-center gap-2 rounded-control border-[1.5px] border-control bg-page px-3"
            >
              <input type="hidden" name="tab" value="company" />
              <Icon name="search" size={18} className="text-icon-secondary" />
              <input
                name="q"
                defaultValue={q}
                aria-label="Search companies and organisations to follow"
                placeholder="Search companies and organisations to follow"
                className="h-11 min-w-0 flex-1 bg-transparent type-body outline-none"
              />
            </form>
          ) : null}
          {results.length ? (
            <ul
              aria-label="Search results"
              className="flex flex-col divide-y divide-default rounded-card border border-default bg-page"
            >
              {results.map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-3">
                  <span className="min-w-0 flex-1 type-label text-primary">{e.name}</span>
                  <AddFollow type="company" value={e.href.split("/").at(-1) ?? ""} label={e.name} />
                </li>
              ))}
            </ul>
          ) : null}
          {mine.length ? (
            <>
              <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
                {paged.rows.map((f) => (
                  <li
                    key={f.id}
                    className="grid grid-cols-1 items-center gap-3 p-4 md:grid-cols-[minmax(0,1fr)_200px_auto]"
                  >
                    <span className="flex flex-col">
                      {f.href ? (
                        <Link href={f.href} className="type-label text-primary hover:underline">
                          {f.label}
                        </Link>
                      ) : (
                        <span className="type-label text-primary">{f.label}</span>
                      )}
                      <span className="type-caption text-secondary">
                        following since {formatIstDayMonth(f.createdAt)}
                      </span>
                    </span>
                    <FollowLevel id={f.id} level={f.level} label={f.label} />
                    <Unfollow type={f.targetType} targetId={f.targetId} label={f.label} />
                  </li>
                ))}
              </ul>
              <ListPager paged={paged} query={pagingQuery(sp)} />
            </>
          ) : (
            <div className="rounded-card border border-default bg-page">
              <EmptyState title={`You don't follow any ${tab.label.toLowerCase()} yet`}>
                Follow them to see their news and updates in your feed.
              </EmptyState>
            </div>
          )}
          {addable.length ? (
            <section aria-label={`Add ${tab.label.toLowerCase()}`} className="flex flex-col gap-2">
              <h2 className="type-h4">Add {tab.label.toLowerCase()}</h2>
              <ul className="flex flex-wrap gap-2">
                {addable.map((a) => (
                  <li key={a.value}>
                    <AddFollow type={tab.value} value={a.value} label={a.label} />
                    <span className="ml-1 type-body-sm">{a.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">What the levels mean</h2>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="type-label">All updates</dt>
              <dd className="type-body-sm text-body">
                Every new post shows in your feed, and you get an in-app notification.
              </dd>
            </div>
            <div>
              <dt className="type-label">Digest only</dt>
              <dd className="type-body-sm text-body">
                Shows in your feed and in your weekly digest email. No separate notifications.
              </dd>
            </div>
            <div>
              <dt className="type-label">None</dt>
              <dd className="type-body-sm text-body">Shows in your feed only. No email or in-app notifications.</dd>
            </div>
          </dl>
          <Link href="/member/preferences" className="inline-flex items-center gap-1.5 type-label text-link">
            Choose channels in Preferences
            <Icon name="arrow-right" size={16} />
          </Link>
        </aside>
      </div>
    </MemberShell>
  );
}
