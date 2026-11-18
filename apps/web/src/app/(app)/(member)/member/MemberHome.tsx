import { getDb } from "@h2india/core";
import config from "@payload-config";
import { courseSummary, learningProgress, listAlerts, myRegistrations } from "@h2india/core/members";
import { getPayload } from "payload";
import { allChapters } from "@/knowledge/data";
import { dayMonth } from "@/opportunities/views";
import { buttonClasses, cx, EmptyState, Icon, Skeleton } from "@h2india/ui";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { buildFeed, FEED_KINDS } from "@/member/feed";
import { MemberShell } from "@/member/shell";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Member home feed (532:9; phones 539:314; empty 532:629), step 7.2: what's new from what the member follows, newest
// first (A149), filtered by kind. The right rail shows their alerts; Hydrogen 101 and events join in step 7.5.
// Founder QC (17 Nov 2026): a summary row, a Personalise prompt until they follow something, and pages on the feed.
export async function MemberHome({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: Promise<{ state?: string; kind?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const forced = forcedState(sp.state);
  const db = getDb();
  const [feed, alerts, chapters, progress, regs] = await Promise.all([
    buildFeed(userId),
    listAlerts(db, userId),
    allChapters(),
    learningProgress(db, userId),
    myRegistrations(db, userId),
  ]);
  const course = courseSummary(
    progress,
    chapters.map((c) => String(c.id)),
  );
  const nextChapter =
    chapters.find((c) => progress.some((p) => p.chapterId === String(c.id) && p.status === "in_progress")) ??
    chapters.find((c) => !progress.some((p) => p.chapterId === String(c.id)));
  const eventIds = [...new Set(regs.map((r) => r.eventId))];
  const events = eventIds.length
    ? (
        await (
          await getPayload({ config })
        ).find({ collection: "events", where: { id: { in: eventIds } }, limit: eventIds.length, depth: 0 })
      ).docs
        .filter((e) => Date.parse(e.endsAt ?? e.startsAt) >= new Date().getTime())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, 2)
    : [];
  const kind = FEED_KINDS.find((k) => k.value === sp.kind)?.value ?? "";
  const items = feed.items.filter(
    (i) =>
      !kind || i.kind === kind || (kind === "scheme" && i.kind === "grant") || (kind === "company" && i.kind === "job"),
  );
  const n = (c: number, one: string, many: string) => `${String(c)} ${c === 1 ? one : many}`;
  const following = feed.summary.topics + feed.summary.states + feed.summary.companies;
  const paged = pageOf(items, pageRequest(sp));
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
      <ul aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            value: following,
            label: "Following",
            sub: `${n(feed.summary.topics, "topic", "topics")} · ${n(feed.summary.states, "state", "states")} · ${n(feed.summary.companies, "organisation", "organisations")}`,
            href: "/member/follows",
          },
          {
            value: alerts.length,
            label: "Alerts",
            sub: "Tenders, schemes, jobs and news you watch",
            href: "/member/alerts",
          },
          {
            value: course.done,
            label: "Hydrogen 101 chapters done",
            sub: course.total ? `Of ${String(course.total)} chapters` : "The course opens soon",
            href: "/member/hydrogen-101",
          },
          { value: events.length, label: "Upcoming events", sub: "Events you registered for", href: "/member/events" },
        ].map((k) => (
          <li key={k.label}>
            <Link
              href={k.href}
              className="flex h-full flex-col gap-1 rounded-card border border-default bg-page p-5 hover:border-focus"
            >
              <span className="type-h2 tabular-nums">{k.value.toLocaleString("en-IN")}</span>
              <span className="type-label text-primary">{k.label}</span>
              <span className="type-caption text-secondary">{k.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
      {following === 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-mint p-5">
          <div>
            <h2 className="type-h4 text-primary">Personalise your feed</h2>
            <p className="type-body-sm text-body">
              Pick the topics, states and companies you care about. New articles, tenders, schemes and events show here.
            </p>
          </div>
          <Link href="/member/welcome" className={buttonClasses({})}>
            Personalise
          </Link>
        </section>
      ) : null}
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
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link href="/member/welcome" className={buttonClasses({})}>
                      Personalise your feed
                    </Link>
                    <Link href="/member/follows" className={buttonClasses({ variant: "outline" })}>
                      Follow topics and companies
                    </Link>
                  </div>
                }
              >
                Follow topics, states and companies, and new articles, tenders, schemes and events show here.
              </EmptyState>
            </div>
          }
        >
          <ul className="flex flex-col gap-4">
            {paged.rows.map((i) => (
              <li key={i.key} className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1.5 type-caption text-secondary">
                  <Icon name="eye" size={14} />
                  Because you follow {i.because}
                </p>
                <article className="flex flex-col gap-1 rounded-card border border-default bg-page p-4">
                  <p className="type-label-sm text-secondary">{[i.eyebrow, i.meta].filter(Boolean).join(" · ")}</p>
                  <h2 className="type-h4 text-primary">
                    <Link href={i.href} className="hover:underline">
                      {i.title}
                    </Link>
                  </h2>
                </article>
              </li>
            ))}
          </ul>
          <ListPager paged={paged} query={pagingQuery(sp)} className="mt-4" />
        </LiveSection>
        <div className="flex flex-col gap-6 self-start">
          <aside
            aria-label="Your alerts"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
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
          {chapters.length ? (
            <section
              aria-labelledby="h101"
              className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
            >
              <h2 id="h101" className="type-h4 text-primary">
                Hydrogen 101
              </h2>
              <p className="type-body-sm text-body">
                {course.done} of {course.total} chapters done
              </p>
              <div
                role="progressbar"
                aria-label="Chapters done"
                aria-valuemin={0}
                aria-valuemax={course.total}
                aria-valuenow={course.done}
                className="h-1.5 overflow-hidden rounded-pill bg-subtle"
              >
                <div
                  className="h-full rounded-pill bg-accent"
                  style={{ width: `${String(course.total ? (course.done / course.total) * 100 : 0)}%` }}
                />
              </div>
              {nextChapter ? (
                <Link
                  href={`/knowledge/hydrogen-101/${nextChapter.slug}`}
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  {course.done || progress.length ? "Continue" : "Start"} chapter {nextChapter.order}
                </Link>
              ) : null}
            </section>
          ) : null}
          <section
            aria-labelledby="upcoming"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
          >
            <h2 id="upcoming" className="type-h4 text-primary">
              Your upcoming events
            </h2>
            {events.length ? (
              <ul className="flex flex-col gap-3">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="flex h-8 shrink-0 items-center rounded-control bg-mint px-2 type-label text-primary">
                      {dayMonth(e.startsAt)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <Link href={`/events/${e.slug}`} className="type-label text-primary hover:underline">
                        {e.name}
                      </Link>
                      <span className="type-caption text-secondary">
                        {e.attendance === "Online" ? "Online" : (e.city ?? e.attendance)} · registered
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-body">No upcoming events.</p>
            )}
            <Link href="/member/events" className="inline-flex items-center gap-1.5 type-label text-link">
              Event registrations
              <Icon name="arrow-right" size={16} />
            </Link>
            <Link href="/member/applications" className="inline-flex items-center gap-1.5 type-label text-link">
              Job applications
              <Icon name="arrow-right" size={16} />
            </Link>
          </section>
        </div>
      </div>
    </MemberShell>
  );
}
