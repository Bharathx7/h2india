import { getDb } from "@h2india/core";
import { listAlerts } from "@h2india/core/members";
import { buttonClasses, cx, EmptyState, Icon, Skeleton } from "@h2india/ui";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { buildFeed, FEED_KINDS } from "@/member/feed";
import { MemberShell } from "@/member/shell";

// Member home feed (532:9; phones 539:314; empty 532:629), step 7.2: what's new from what the member follows, newest
// first (A149), filtered by kind. The right rail shows their alerts; Hydrogen 101 and events join in step 7.5.
export async function MemberHome({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: Promise<{ state?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const forced = forcedState(sp.state);
  const [feed, alerts] = await Promise.all([buildFeed(userId), listAlerts(getDb(), userId)]);
  const kind = FEED_KINDS.find((k) => k.value === sp.kind)?.value ?? "";
  const items = feed.items.filter(
    (i) =>
      !kind || i.kind === kind || (kind === "scheme" && i.kind === "grant") || (kind === "company" && i.kind === "job"),
  );
  const n = (c: number, one: string, many: string) => `${String(c)} ${c === 1 ? one : many}`;
  return (
    <MemberShell userId={userId} current="/member">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Your feed</h1>
          <p className="type-body text-secondary">
            Updates from {n(feed.summary.topics, "topic", "topics")}, {n(feed.summary.states, "state", "states")} and{" "}
            {n(feed.summary.companies, "organisation", "organisations")} you follow.
          </p>
        </div>
        <Link href="/member/follows" className={buttonClasses({ variant: "outline" })}>
          Manage follows
        </Link>
      </div>
      <nav aria-label="Show" className="flex flex-wrap gap-2">
        {FEED_KINDS.map((k) => (
          <Link
            key={k.value}
            href={k.value ? `/member?kind=${k.value}` : "/member"}
            aria-current={kind === k.value ? "page" : undefined}
            className={cx(
              "inline-flex h-8 items-center rounded-pill border-[1.5px] px-3 type-label",
              kind === k.value ? "border-transparent bg-inverse text-inverse" : "border-control bg-page text-primary",
            )}
          >
            {k.label}
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <LiveSection
          label="Your feed"
          state={forced ?? (items.length ? "ready" : "empty")}
          skeleton={
            <div className="flex flex-col gap-3">
              <Skeleton kind="card" />
              <Skeleton kind="card" />
            </div>
          }
          empty={
            <div className="rounded-card border border-default bg-page">
              <EmptyState
                title={
                  feed.summary.topics + feed.summary.states + feed.summary.companies
                    ? "Nothing new yet"
                    : "Your feed is empty"
                }
                action={
                  <Link href="/member/follows" className={buttonClasses({})}>
                    Follow topics and companies
                  </Link>
                }
              >
                Follow topics, states and companies, and new articles, tenders, schemes and events show here.
              </EmptyState>
            </div>
          }
        >
          <ul className="flex flex-col gap-4">
            {items.map((i) => (
              <li key={i.key} className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1.5 type-caption text-secondary">
                  <Icon name="eye" size={14} />
                  Because you follow {i.because}
                </p>
                <article className="flex flex-col gap-1 rounded-card border border-default bg-page p-4">
                  <p className="type-eyebrow text-secondary">{[i.eyebrow, i.meta].filter(Boolean).join(" · ")}</p>
                  <h2 className="type-h4 text-primary">
                    <Link href={i.href} className="hover:underline">
                      {i.title}
                    </Link>
                  </h2>
                </article>
              </li>
            ))}
          </ul>
        </LiveSection>
        <aside
          aria-label="Your alerts"
          className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5"
        >
          <h2 className="type-h4 text-primary">Your alerts</h2>
          {alerts.length ? (
            <ul className="flex flex-col gap-2">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.id} className="type-body-sm text-body">
                  {a.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-body-sm text-body">No alerts yet.</p>
          )}
          <Link href="/member/alerts" className="inline-flex items-center gap-1.5 type-label text-link">
            Manage alerts
            <Icon name="arrow-right" size={16} />
          </Link>
        </aside>
      </div>
    </MemberShell>
  );
}
