import { playbackFor } from "@h2india/core/media";
import { joinOpensAt, readRegistrationToken, WEBINAR_CONSENT } from "@h2india/core/events";
import { buttonClasses, cx, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { companiesBySlug } from "@/opportunities/data";
import { Crumbs, wrap } from "@/opportunities/parts";
import { appUrl, getEvent, replayAccess, seatsLeft } from "@/events/data";
import { calendarLinks, clock, dayMonthYear, isWebinar, multiDay, timeRange } from "@/events/views";
import { ReplayRequest, WebinarFlow } from "@/events/Webinar";
import { ShareButton, WeeklyBox } from "@/news/client";
import { getSession } from "@/server/auth";
import type { Article, Event } from "@/payload-types";

// An event (expo 729:11207 and 824:13453, live day 733:493; webinar 732:521 and 824:13975, full 827:14696, registered
// 732:939, replay 733:22 and 824:14435; step 5.7). Organisers' events link to their own registration; H2 India
// webinars take registrations here. Replays open only for people who registered (signed in, or through the signed
// link in their email).

type Params = Promise<{ slug: string }>;
type Search = Promise<{ t?: string; details?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const e = await getEvent((await params).slug);
  if (!e) return { title: "Not found · H2 India" };
  return {
    title: `${e.name} · Events · H2 India`,
    description: e.description?.slice(0, 200) ?? `${e.eventType} · ${dayMonthYear(e.startsAt)}`,
    alternates: { canonical: `/events/${e.slug}` },
  };
}
export const dynamic = "force-dynamic";

function Box({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-card border border-default p-5">
      <div>
        <h2 id={id} className="type-h4 text-primary">
          {title}
        </h2>
        {sub ? <p className="type-caption text-secondary">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Agenda({ e }: { e: Event }) {
  const items = e.agenda ?? [];
  if (!items.length) return null;
  const groups = new Map<string, typeof items>();
  for (const a of items) {
    const key = a.day
      ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })
          .format(new Date(a.day))
          .replace(",", "")
          .toUpperCase()
      : "";
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return (
    <Box
      id="agenda"
      title={isWebinar(e) ? "Agenda" : "Agenda highlights"}
      sub={isWebinar(e) ? "Times in IST." : "Times in IST. The full programme is on the organiser's site."}
    >
      {[...groups].map(([day, list]) => (
        <div key={day || "all"} className="flex flex-col">
          {day ? <p className="border-b border-default pb-1 type-eyebrow text-secondary">{day}</p> : null}
          <ul className="flex flex-col">
            {list.map((a) => (
              <li
                key={a.id ?? `${a.time}-${a.title}`}
                className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-default py-2.5 last:border-b-0"
              >
                <span className="type-spec text-secondary">{a.time}</span>
                <span className="type-body-sm text-primary">{a.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Box>
  );
}

function Speakers({ e }: { e: Event }) {
  const list = e.speakers ?? [];
  if (!list.length) return null;
  return (
    <Box
      id="speakers"
      title={list.length === 1 ? "Speaker" : "Speakers"}
      sub={isWebinar(e) ? undefined : "From the H2 India people directory."}
    >
      <ul className="grid gap-4 sm:grid-cols-3">
        {list.map((s) => (
          <li key={s.id ?? s.name} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
              {initials(s.name)}
            </span>
            <span className="flex flex-col">
              <span className="type-label text-link">{s.name}</span>
              {s.role ? <span className="type-caption text-secondary">{s.role}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

async function Exhibitors({ e }: { e: Event }) {
  const list = e.exhibitors ?? [];
  if (!list.length) return null;
  const profiles = await companiesBySlug(list.map((x) => x.profileSlug ?? ""));
  return (
    <Box
      id="exhibitors"
      title={`Exhibitors on H2 India${e.exhibitorCount ? ` · ${String(list.length)} of ${String(e.exhibitorCount)}` : ""}`}
      sub="Open a profile to see products, certificates and contacts."
    >
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {list.map((x) => {
          const p = x.profileSlug ? profiles.get(x.profileSlug) : undefined;
          return (
            <li key={x.id ?? x.name} className="flex items-center gap-3 border-b border-default py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
                {initials(x.name)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                {p ? (
                  <Link href={p.href} className="type-label text-link hover:underline">
                    {x.name}
                  </Link>
                ) : (
                  <span className="type-label text-primary">{x.name}</span>
                )}
                {x.stall ? <span className="type-caption text-secondary">Stall {x.stall}</span> : null}
              </span>
              {p?.verified ? <StatusBadge status="Verified" tone="success" /> : null}
            </li>
          );
        })}
      </ul>
    </Box>
  );
}

function Coverage({ e }: { e: Event }) {
  const articles = (e.coverage?.articles ?? []).filter(
    (a): a is Article => typeof a === "object" && a._status === "published",
  );
  if (!e.coverage?.note && !articles.length) return null;
  return (
    <section aria-labelledby="coverage" className="flex flex-col gap-2 rounded-card border border-default p-5">
      <h2 id="coverage" className="type-h4 text-primary">
        H2 India coverage
      </h2>
      {e.coverage?.note ? <p className="type-body-sm text-body">{e.coverage.note}</p> : null}
      {articles.map((a) => (
        <Link key={a.id} href={`/news/${a.slug}`} className="type-label-sm text-link hover:underline">
          {a.title}
        </Link>
      ))}
    </section>
  );
}

function SponsorBar({ e }: { e: Event }) {
  const s = e.webinar?.sponsor;
  if (!s?.name) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card bg-subtle p-4">
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-page px-2.5 py-1 type-label-sm text-body">
        <span aria-hidden="true" className="size-1.5 rounded-pill bg-ink-500" /> Sponsored
      </span>
      <p className="min-w-0 flex-1 type-body-sm text-body">{s.disclosure ?? `${s.name} paid for this webinar.`}</p>
      <span className="flex items-center gap-2 type-label-sm text-link">
        <span className="flex size-7 items-center justify-center rounded-pill bg-page type-label-sm text-primary">
          {initials(s.name)}
        </span>
        {s.name}
      </span>
    </div>
  );
}

export default async function EventPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { t, details } = await searchParams;
  const e = await getEvent(slug);
  if (!e) notFound();
  const now = new Date();
  const ended = new Date(e.endsAt ?? e.startsAt) <= now;
  const page = `${appUrl()}/events/${e.slug}`;
  const calendar = calendarLinks(e, page);
  const session = await getSession().catch(() => null);
  const crumbs = (last: string, middle?: { label: string; href: string }) => (
    <Crumbs items={[{ label: "Events", href: "/events" }, ...(middle ? [middle] : []), { label: last }]} />
  );
  const dates = multiDay(e)
    ? `${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" }).format(new Date(e.startsAt))}–${dayMonthYear(e.endsAt ?? e.startsAt)}`
    : dayMonthYear(e.startsAt);

  // ---- webinars
  if (isWebinar(e)) {
    const webinarCrumb = { label: "Webinars", href: "/events/webinars" };
    const when = `${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(e.startsAt)).replace(",", "")} · ${timeRange(e.startsAt, e.endsAt)}`;
    const replay = e.webinar?.replay;
    if (ended && replay?.url) {
      const access = await replayAccess(e, {
        email: session?.user.email,
        registrationId: readRegistrationToken(t, "replay"),
      });
      const play = playbackFor(replay.url);
      return (
        <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
          <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
            {crumbs(e.name, webinarCrumb)}
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="type-h1 text-primary">{e.name}</h1>
                <p className="type-body text-body">
                  Webinar replay · recorded {dayMonthYear(e.startsAt)}
                  {replay.minutes ? ` · ${String(replay.minutes)} min` : ""}
                  {e.host ? ` · ${e.host}` : ""}
                </p>
              </div>
              <ShareButton title={e.name} />
            </div>
          </div>
          <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {access ? (
                play?.kind === "video-file" ? (
                  <video controls preload="metadata" className="aspect-video w-full rounded-card bg-inverse">
                    <source src={play.src} />
                    <track kind="captions" />
                  </video>
                ) : (
                  <a
                    href={replay.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex aspect-video w-full items-center justify-center rounded-card bg-inverse text-inverse"
                  >
                    <span className="flex items-center gap-2 type-label">
                      <span className="flex size-14 items-center justify-center rounded-pill bg-accent text-primary">
                        <Icon name="play" size={24} />
                      </span>
                      Watch on {play?.kind === "external" ? play.host : "the host"} ↗
                      <span className="sr-only"> (opens in a new tab)</span>
                    </span>
                  </a>
                )
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-card bg-inverse p-4">
                  <div className="w-full max-w-90">
                    <ReplayRequest slug={e.slug} state="replay" />
                  </div>
                </div>
              )}
              {(replay.chapters ?? []).length ? (
                <Box id="chapters" title="Chapters" sub={access ? undefined : "Jump to a part once you're in."}>
                  <ol className="flex flex-col">
                    {(replay.chapters ?? []).map((c) => (
                      <li
                        key={c.id ?? c.at}
                        className="grid grid-cols-[4rem_1fr] gap-3 border-t border-default py-2 type-body-sm text-body"
                      >
                        <span className="type-spec text-link">{c.at}</span>
                        {c.title}
                      </li>
                    ))}
                  </ol>
                </Box>
              ) : null}
              {(replay.qa ?? []).length ? (
                <Box
                  id="qa"
                  title="Q&A summary"
                  sub="The questions asked most, answered by the speakers. Not legal advice."
                >
                  <dl className="flex flex-col">
                    {(replay.qa ?? []).map((q) => (
                      <div key={q.id ?? q.question} className="flex flex-col gap-1 border-t border-default py-2.5">
                        <dt className="type-label text-primary">{q.question}</dt>
                        <dd className="type-body-sm text-body">{q.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </Box>
              ) : null}
            </div>
            <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
              {replay.slidesUrl ? (
                <Box id="slides" title="Slides">
                  <p className="flex items-center gap-3 type-body-sm text-body">
                    <Icon name="file-text" size={18} />
                    <span className="flex flex-1 flex-col">
                      <span className="type-label text-primary">{e.name.split(":")[0]} · slides</span>
                      <span className="type-caption text-secondary">
                        {replay.slidesNote ?? "PDF"} · unlocks with the replay
                      </span>
                    </span>
                    {access ? (
                      <a
                        href={replay.slidesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Download the slides"
                        className="flex size-8 items-center justify-center rounded-pill border border-control"
                      >
                        <Icon name="download" size={16} />
                      </a>
                    ) : null}
                  </p>
                </Box>
              ) : null}
              <Speakers e={e} />
            </aside>
          </div>
        </main>
      );
    }

    const left = await seatsLeft(e);
    const state: "open" | "full" | "closed" = ended || e.webinar?.closed ? "closed" : left === 0 ? "full" : "open";
    const sponsor = e.webinar?.sponsor?.name?.trim() || null;
    const header = (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 text-primary">{e.name}</h1>
          <p className="type-body text-body">
            Webinar · {when} · online{e.tickets === "Free" ? " · free" : ""}
          </p>
        </div>
        <ShareButton title={e.name} />
      </div>
    );
    const body = (
      <>
        <SponsorBar e={e} />
        {(e.webinar?.learn ?? []).length ? (
          <Box id="learn" title="What you'll learn">
            <ul className="flex flex-col gap-2.5">
              {(e.webinar?.learn ?? []).map((l) => (
                <li key={l.id ?? l.point} className="flex items-start gap-2.5 type-body-sm text-body">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-icon-primary" />
                  {l.point}
                </li>
              ))}
            </ul>
          </Box>
        ) : null}
        {e.description ? <p className="type-body text-body">{e.description}</p> : null}
        <Agenda e={e} />
        <Speakers e={e} />
      </>
    );
    const opens = joinOpensAt(new Date(e.startsAt));
    return (
      <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
        <div className={cx(wrap, "pt-6 md:pt-8")}>{crumbs(e.name, webinarCrumb)}</div>
        <div className={cx(wrap, "pb-16 pt-4")}>
          <WebinarFlow
            info={{
              slug: e.slug,
              title: e.name,
              when,
              joinOpens: `${clock(opens.toISOString())} IST on ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(opens).replace(",", "")}`,
              hourBefore: clock(new Date(new Date(e.startsAt).getTime() - 3_600_000).toISOString()),
              calendar,
              pageUrl: page,
              sponsor,
              consentText: sponsor ? WEBINAR_CONSENT(sponsor) : null,
            }}
            member={Boolean(session)}
            memberName={session ? `${session.user.name || session.user.email} (${session.user.email})` : null}
            header={header}
            body={body}
            state={state}
          />
        </div>
      </main>
    );
  }

  // ---- live coverage (733:493)
  if (e.live?.on && details !== "1") {
    const updates = [...(e.live.updates ?? [])].sort((a, b) => b.at.localeCompare(a.at));
    const last = updates[0];
    const profiles = await companiesBySlug((e.exhibitors ?? []).map((x) => x.profileSlug ?? ""));
    return (
      <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
        <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
          <Crumbs
            items={[
              { label: "Events", href: "/events" },
              { label: "Event coverage", href: "/events/past" },
              { label: e.name },
            ]}
          />
          <p className="mt-2 flex items-center gap-2">
            <StatusBadge status="Live" tone="error" />
            <span className="type-eyebrow text-secondary">UPDATED EVERY FEW MINUTES DURING THE EXPO</span>
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="type-h1 text-primary">{e.name}: live coverage</h1>
              <p className="type-body text-body">
                {[e.live.dayLabel, e.venue, last ? `last update ${clock(last.at)} IST` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/events/${e.slug}?details=1`} className={buttonClasses({ variant: "outline" })}>
                Event details
              </Link>
              <ShareButton title={e.name} />
            </div>
          </div>
        </div>
        <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {(e.live.announcements ?? []).length ? (
              <Box
                id="announcements"
                title="Key announcements"
                sub="From exhibitors' own statements. We link to the source for each."
              >
                <ul className="flex flex-col">
                  {(e.live.announcements ?? []).map((a) => (
                    <li key={a.id ?? a.text} className="grid grid-cols-[4rem_1fr] gap-3 border-t border-default py-2.5">
                      <span className="type-eyebrow text-secondary">{a.day.toUpperCase()}</span>
                      <span className="flex flex-col">
                        <span className="type-label text-link">{a.company}</span>
                        <span className="type-body-sm text-body">{a.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Box>
            ) : null}
            <Box id="updates" title="Live updates" sub="Newest first. Times in IST.">
              <ul className="flex flex-col">
                {updates.map((u) => (
                  <li key={u.id ?? u.at} className="grid grid-cols-[5rem_1fr] gap-3 border-t border-default py-2.5">
                    <span className="type-spec text-secondary">{clock(u.at)}</span>
                    <span className="flex flex-col">
                      <span className="type-label text-primary">{u.title}</span>
                      {u.text ? <span className="type-body-sm text-body">{u.text}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </Box>
          </div>
          <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
            {(e.exhibitors ?? []).length ? (
              <Box
                id="directory"
                title="Exhibitor directory"
                sub={`${String(e.exhibitorCount ?? (e.exhibitors ?? []).length)} exhibitors · ${String((e.exhibitors ?? []).filter((x) => x.profileSlug).length)} have H2 India profiles`}
              >
                <ul className="flex flex-col">
                  {(e.exhibitors ?? []).map((x) => {
                    const p = x.profileSlug ? profiles.get(x.profileSlug) : undefined;
                    return (
                      <li key={x.id ?? x.name} className="flex items-center gap-2 border-t border-default py-2">
                        <span className="flex size-7 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
                          {initials(x.name)}
                        </span>
                        <span className="flex flex-col">
                          {p ? (
                            <Link href={p.href} className="type-label-sm text-link hover:underline">
                              {x.name}
                            </Link>
                          ) : (
                            <span className="type-label-sm text-primary">{x.name}</span>
                          )}
                          <span className="type-caption text-secondary">
                            {[x.stall ? `Stall ${x.stall}` : null, x.about].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Box>
            ) : null}
            <WeeklyBox tone="tint" />
          </aside>
        </div>
      </main>
    );
  }

  // ---- an event listed by its organiser (729:11207)
  const facts = [
    { label: "Dates", value: `${dates}${multiDay(e) ? "" : ` · ${timeRange(e.startsAt, e.endsAt)}`}` },
    ...(e.venue ? [{ label: "Venue", value: e.venue }] : []),
    ...(e.priceText ? [{ label: "Tickets", value: e.priceText }] : []),
    { label: "Listed by", value: e.listedBy ?? "The organiser · checked by H2 India" },
  ];
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        {crumbs(e.name)}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">{e.name}</h1>
            <p className="type-body text-body">{[e.eventType, dates, e.venue].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={calendar.ics} className={buttonClasses({ variant: "outline" })}>
              <Icon name="calendar" size={18} /> Add to calendar
            </a>
            {e.registrationUrl && !ended ? (
              <a
                href={e.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: "primary" })}
              >
                <Icon name="external-link" size={18} /> Register on organiser&apos;s site
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        </div>
        <p className="flex flex-wrap gap-2">
          {e.featured ? <StatusBadge status="Featured" tone="neutral" /> : null}
          <StatusBadge status={e.attendance} tone="neutral" />
          {e.verification?.at ? (
            <StatusBadge status={`Details checked ${dayMonthYear(e.verification.at)}`} tone="success" />
          ) : null}
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {e.description ? (
            <Box id="about" title="About this event">
              <p className="type-body text-body">{e.description}</p>
            </Box>
          ) : null}
          <Agenda e={e} />
          <Speakers e={e} />
          <Exhibitors e={e} />
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section aria-labelledby="facts" className="flex flex-col gap-3 rounded-card border border-default p-5">
            <h2 id="facts" className="type-h4 text-primary">
              Key facts
            </h2>
            <dl className="flex flex-col">
              {facts.map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5 border-t border-default py-2.5">
                  <dt className="type-caption text-secondary">{f.label}</dt>
                  <dd className="type-body-sm text-primary">{f.value}</dd>
                </div>
              ))}
            </dl>
            {e.venue ? (
              <>
                <div
                  role="img"
                  aria-label={`Map of ${e.venue}. The map comes later.`}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-control bg-subtle"
                >
                  <Icon name="building" size={20} className="text-icon-secondary" />
                  <p className="type-caption text-secondary">Map · {e.venue}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 type-label-sm text-primary hover:underline"
                >
                  <Icon name="external-link" size={16} /> Get directions
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </>
            ) : null}
          </section>
          <Coverage e={e} />
        </aside>
      </div>
    </main>
  );
}
