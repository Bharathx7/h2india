import config from "@payload-config";
import { getDb } from "@h2india/core";
import { myRegistrations } from "@h2india/core/members";
import { buttonClasses, EmptyState, Icon, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPayload } from "payload";
import { ListPager } from "@/components/ListPager";
import { LiveSection } from "@/components/LiveSection";
import { timeRange } from "@/events/views";
import { forcedState } from "@/lib/dev-state";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";
import { CancelRegistration } from "@/member/RegistrationRow";
import { MemberShell, requireMember } from "@/member/shell";
import { dayMonthYear } from "@/news/format";
import type { Event } from "@/payload-types";

// Event registrations (725:667; phones 726:256; empty and error 726:5662), step 7.5: the webinars a member registered
// for (step 5.7), upcoming and past. A new registration shows straight away (the page reads the registrations table).
export const metadata: Metadata = { title: "Event registrations · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" }).format(new Date(iso));
const month = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short" }).format(new Date(iso)).toUpperCase();
const weekday = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" }).format(new Date(iso));

export default async function EventRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const userId = await requireMember("/member/events");
  const regs = await myRegistrations(getDb(), userId);
  const ids = [...new Set(regs.map((r) => r.eventId))];
  const events = ids.length
    ? (
        await (
          await getPayload({ config })
        ).find({ collection: "events", where: { id: { in: ids } }, limit: ids.length, depth: 0 })
      ).docs
    : [];
  const byId = new Map<number, Event>(events.map((e) => [e.id, e]));
  const now = new Date().getTime();
  const rows = regs
    .map((r) => ({ r, e: byId.get(r.eventId) }))
    .filter((x): x is { r: (typeof regs)[number]; e: Event } => Boolean(x.e));
  const end = (e: Event) => Date.parse(e.endsAt ?? e.startsAt);
  const upcoming = rows.filter((x) => end(x.e) >= now).sort((a, b) => a.e.startsAt.localeCompare(b.e.startsAt));
  const past = rows.filter((x) => end(x.e) < now).sort((a, b) => b.e.startsAt.localeCompare(a.e.startsAt));
  // One page across both lists (upcoming first); the headings keep the full counts.
  const paged = pageOf([...upcoming, ...past], pageRequest(sp));
  const pageUpcoming = paged.rows.filter((x) => end(x.e) >= now);
  const pagePast = paged.rows.filter((x) => end(x.e) < now);
  const eyebrow = (e: Event) =>
    [e.eventType === "Webinar" ? "Webinar" : e.eventType, e.attendance === "Online" ? "Online" : e.city, e.organiser]
      .filter(Boolean)
      .join(" · ");
  const Row = ({ e, children, line }: { e: Event; children: React.ReactNode; line: string }) => (
    <li className="flex flex-wrap items-center gap-4 border-t border-default py-4">
      <span className="flex w-14 flex-col items-center rounded-control bg-mint py-2">
        <span className="type-h4 text-primary">{day(e.startsAt)}</span>
        <span className="type-eyebrow text-secondary">{month(e.startsAt)}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="type-eyebrow text-secondary">{eyebrow(e)}</p>
        <Link href={`/events/${e.slug}`} className="type-label text-primary hover:underline">
          {e.name}
        </Link>
        <p className="type-caption text-secondary">{line}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );
  return (
    <MemberShell userId={userId} current="/member/events">
      <div>
        <h1 className="type-h2">Event registrations</h1>
        <p className="type-body-sm text-secondary">
          Webinars and events you've signed up for. Join links open 15 minutes before the start.
        </p>
      </div>
      <LiveSection
        label="Event registrations"
        state={forcedState(sp.state) ?? (rows.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-3 rounded-card border border-default bg-page p-6">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        errorTitle="We couldn't load your registrations"
        errorText="Your registrations are safe. Check your connection and try again."
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState
              title="No registrations yet"
              action={
                <Link href="/events" className={buttonClasses({})}>
                  Browse events
                </Link>
              }
            >
              Register for a webinar or event and it shows up here, with the join link and a calendar invite.
            </EmptyState>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {pageUpcoming.length ? (
            <section className="rounded-card border border-default bg-page p-5 md:p-6">
              <h2 className="type-h4 pb-3">Upcoming · {upcoming.length}</h2>
              <ul>
                {pageUpcoming.map(({ r, e }) => (
                  <Row
                    key={r.id}
                    e={e}
                    line={`${weekday(e.startsAt)} ${dayMonthYear(e.startsAt)} · ${timeRange(e.startsAt, e.endsAt)}`}
                  >
                    <a href={`/events/${e.slug}/ics`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                      <Icon name="calendar" size={16} />
                      Add to calendar
                    </a>
                    <CancelRegistration id={r.id} title={e.name} />
                  </Row>
                ))}
              </ul>
            </section>
          ) : null}
          {pagePast.length ? (
            <section className="rounded-card border border-default bg-page p-5 md:p-6">
              <h2 className="type-h4 pb-3">Past · {past.length}</h2>
              <ul>
                {pagePast.map(({ r, e }) => (
                  <Row key={r.id} e={e} line={`${weekday(e.startsAt)} ${dayMonthYear(e.startsAt)}`}>
                    {e.webinar?.replay?.url ? (
                      <Link href={`/events/${e.slug}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
                        <Icon name="external-link" size={16} />
                        Watch the replay
                      </Link>
                    ) : null}
                  </Row>
                ))}
              </ul>
            </section>
          ) : null}
          <ListPager paged={paged} query={pagingQuery(sp)} />
        </div>
      </LiveSection>
    </MemberShell>
  );
}
