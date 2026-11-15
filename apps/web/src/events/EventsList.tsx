import { buttonClasses, cx, EmptyState, Icon } from "@h2india/ui";
import Link from "next/link";
import { EVENT_TYPES } from "@/cms/records/collections";
import { forcedState } from "@/lib/dev-state";
import { ListFilters, type FilterGroupSpec } from "@/opportunities/filters";
import { CardsLoading, Crumbs, LoadError, wrap } from "@/opportunities/parts";
import { allEvents } from "./data";
import {
  byMonth,
  calendarMonth,
  eventCard,
  filterEvents,
  monthKey,
  monthLabel,
  shiftMonth,
  upcoming,
  type EventCard,
} from "./views";

// Upcoming events, as a list or a calendar (729:10714, 824:12976, calendar 827:13689, no results 827:14280; step
// 5.7). Every listing is checked before it goes live. Webinars, training and past events are the same list with a
// preset.

type Params = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";

export interface Preset {
  path: string;
  crumb: string;
  title: string;
  types?: string[];
  past?: boolean;
}

function DateTile({ e }: { e: EventCard }) {
  return (
    <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-control bg-mint py-2">
      <span className="type-h4 text-primary">{e.days}</span>
      <span className="type-eyebrow text-secondary">{e.month}</span>
    </span>
  );
}

function Card({ e }: { e: EventCard }) {
  return (
    <Link
      href={e.href}
      className="group flex h-full gap-3 rounded-card border border-default bg-page p-4 hover:border-focus"
    >
      <DateTile e={e} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="type-eyebrow text-secondary">{e.eyebrow}</span>
        <span className="type-label text-primary group-hover:underline">{e.title}</span>
        <span className="type-caption text-secondary">{e.meta}</span>
        <span className="inline-flex items-center gap-1 type-label-sm text-link">
          {e.status === "Past" ? "See coverage" : "Register"} <Icon name="arrow-right" size={14} />
        </span>
      </span>
    </Link>
  );
}

function SubmitBand() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-subtle p-5">
      <div className="flex flex-col gap-1">
        <h2 className="type-label-lg text-primary">Organising a hydrogen event?</h2>
        <p className="type-body-sm text-body">
          Listing is free. We review every event within 1 working day before it goes live.
        </p>
      </div>
      <Link href="/events/submit" className={buttonClasses({ size: "sm" })}>
        Submit an event
      </Link>
    </div>
  );
}

export async function EventsList({ preset, params }: { preset: Preset; params: Params }) {
  const forced = forcedState(one(params.view));
  const view = one(params.as) === "calendar" ? "calendar" : "list";
  const head = (
    <div className={cx(wrap, "flex flex-col gap-3 pt-6 md:pt-8")}>
      <Crumbs items={[{ label: "Events", href: "/events" }, { label: preset.crumb }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-h1 text-primary">{preset.title}</h1>
          <p className="type-body text-body">
            Summits, expos, webinars and training for India&apos;s hydrogen industry. Every listing is checked before it
            goes live.
          </p>
        </div>
        <Link href="/events/submit" className={buttonClasses({ variant: "outline", size: "lg" })}>
          Submit an event
        </Link>
      </div>
    </div>
  );
  if (forced === "loading") {
    return (
      <>
        {head}
        <div className={cx(wrap, "py-6")}>
          <CardsLoading label="Loading events" />
        </div>
      </>
    );
  }
  let events;
  try {
    if (forced === "error") throw new Error("Forced error (?view=error)");
    events = await allEvents();
  } catch (error) {
    console.error("[events] list failed", error);
    return (
      <>
        {head}
        <div className={cx(wrap, "py-6")}>
          <LoadError what="events" retry={preset.path} />
        </div>
      </>
    );
  }
  const now = new Date();
  const cards = events.map((e) => eventCard(e, now));
  const pool = preset.past
    ? cards.filter((e) => e.status === "Past").sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    : upcoming(cards);
  const filter = {
    types: all(params.type).length ? all(params.type) : (preset.types ?? []),
    online: one(params.online) === "1",
    city: one(params.city),
    month: view === "calendar" ? "" : one(params.month),
    organiser: one(params.organiser),
  };
  let list = filterEvents(pool, filter);
  if (forced === "empty") list = [];
  const months = [...new Set(pool.map((e) => monthKey(e.startsAt)))].sort();
  const groups: FilterGroupSpec[] = [
    {
      kind: "checks",
      name: "type",
      title: "Type",
      options: EVENT_TYPES.map((v) => ({ value: v, label: v })),
      defaults: preset.types,
    },
    { kind: "toggle", name: "online", title: "Format", label: "Online only" },
    {
      kind: "select",
      name: "city",
      title: "City",
      placeholder: "Any city",
      options: [...new Set(pool.map((e) => e.city).filter(Boolean))].sort().map((v) => ({ value: v, label: v })),
    },
    {
      kind: "select",
      name: "month",
      title: "Month",
      placeholder: "Any month",
      options: months.map((m) => ({ value: m, label: monthLabel(m) })),
    },
    {
      kind: "select",
      name: "organiser",
      title: "Organiser",
      placeholder: "Any organiser",
      options: [...new Set(pool.map((e) => e.organiser))].sort().map((v) => ({ value: v, label: v })),
    },
  ];
  const query = (change: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (k !== "view" && !(k in change)) for (const x of all(v)) q.append(k, x);
    for (const [k, v] of Object.entries(change)) if (v) q.set(k, v);
    const s = q.toString();
    return `${preset.path}${s ? `?${s}` : ""}#list`;
  };
  const featured = !preset.past ? list.find((e) => e.featured) : undefined;
  const month = /^\d{4}-\d{2}$/.test(one(params.month)) ? one(params.month) : monthKey(now.toISOString());
  const inMonth = list.filter((e) => monthKey(e.startsAt) === month || monthKey(e.endsAt) === month);
  const grid = calendarMonth(month, list, now);
  const later = list.filter((e) => monthKey(e.startsAt) > month);
  const laterMonths = [...new Set(later.map((e) => monthLabel(monthKey(e.startsAt))))].slice(0, 2);

  return (
    <>
      {head}
      <div
        id="list"
        className={cx(wrap, "flex scroll-mt-24 flex-col gap-6 pb-16 pt-6 lg:flex-row lg:items-start lg:gap-8")}
      >
        <div className="lg:w-60 lg:shrink-0">
          <ListFilters groups={groups} count={list.length} noun="events" keep={["as"]} />
        </div>
        <section aria-label="Events" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-label-lg text-primary" role="status">
              {view === "calendar"
                ? `${String(inMonth.length)} ${inMonth.length === 1 ? "event" : "events"} in ${monthLabel(month)}`
                : `${String(list.length)} ${preset.past ? "past" : "upcoming"} ${list.length === 1 ? "event" : "events"}`}
            </p>
            <nav aria-label="View" className="flex gap-2">
              {(["list", "calendar"] as const).map((v) => (
                <Link
                  key={v}
                  href={query({ as: v === "calendar" ? "calendar" : null, month: v === "calendar" ? month : null })}
                  scroll={false}
                  aria-current={view === v ? "page" : undefined}
                  className={cx(
                    "inline-flex h-8 items-center gap-1.5 rounded-pill border-[1.5px] px-2.75 type-label",
                    view === v
                      ? "border-transparent bg-inverse text-inverse"
                      : "border-control bg-page text-primary hover:border-focus",
                  )}
                >
                  {v === "calendar" ? <Icon name="calendar" size={14} /> : null}
                  {v === "list" ? "List" : "Calendar"}
                </Link>
              ))}
            </nav>
          </div>

          {list.length === 0 ? (
            <div className="rounded-card border border-default bg-page py-8">
              <EmptyState
                kind={pool.length ? "no-results" : "first-use"}
                title={pool.length ? "No events match these filters" : "No events listed yet"}
                action={
                  pool.length ? (
                    <Link href={`${preset.path}#list`} className={buttonClasses({ variant: "outline" })}>
                      Clear filters
                    </Link>
                  ) : (
                    <Link href="/events/submit" className={buttonClasses({ variant: "primary" })}>
                      Submit an event
                    </Link>
                  )
                }
              >
                {pool.length
                  ? "Try another city, month or type, or switch off Online only."
                  : "Know of one? Listing is free."}
              </EmptyState>
            </div>
          ) : view === "calendar" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={query({ as: "calendar", month: shiftMonth(month, -1) })}
                    scroll={false}
                    aria-label="Previous month"
                    className="flex size-8 items-center justify-center rounded-pill border border-control hover:border-focus"
                  >
                    <Icon name="arrow-left" size={16} />
                  </Link>
                  <span className="type-h4 text-primary">{monthLabel(month)}</span>
                  <Link
                    href={query({ as: "calendar", month: shiftMonth(month, 1) })}
                    scroll={false}
                    aria-label="Next month"
                    className="flex size-8 items-center justify-center rounded-pill border border-control hover:border-focus"
                  >
                    <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
                <p className="flex gap-4 type-caption text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-pill border border-(color:--border-color-accent) bg-mint"
                    />{" "}
                    Conference, expo or workshop
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-2 rounded-pill bg-tint" /> Webinar
                  </span>
                </p>
              </div>
              <div className="overflow-x-auto rounded-card border border-default">
                <table className="w-full min-w-170 table-fixed">
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <th key={d} scope="col" className="px-2 py-2 text-left font-semibold">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }, (_, w) => (
                      <tr key={w}>
                        {grid.slice(w * 7, w * 7 + 7).map((d) => (
                          <td
                            key={d.date}
                            className={cx(
                              "h-24 border-t border-l border-default p-1.5 align-top first:border-l-0",
                              !d.inMonth && "bg-subtle",
                              d.today && "outline-2 -outline-offset-2 outline-(color:--border-color-focus)",
                            )}
                          >
                            <span className={cx("type-label-sm", d.inMonth ? "text-primary" : "text-secondary")}>
                              {d.day}
                              {d.today ? <span className="ml-1 type-caption text-link">Today</span> : null}
                            </span>
                            <ul className="mt-1 flex flex-col gap-1">
                              {d.items.map((i) => (
                                <li key={i.slug}>
                                  <Link
                                    href={`/events/${i.slug}`}
                                    className={cx(
                                      "block truncate rounded-control px-1.5 py-0.5 type-caption text-primary hover:underline",
                                      i.webinar ? "bg-tint" : "border border-(color:--border-color-accent) bg-mint",
                                    )}
                                  >
                                    {i.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="type-caption text-secondary">
                Times in IST. Select an event to open it.
                {laterMonths.length
                  ? ` Later: ${laterMonths.join(" and ")}; use the arrows to move between months.`
                  : ""}
              </p>
            </>
          ) : (
            <>
              {featured ? (
                <Link
                  href={featured.href}
                  className="flex flex-wrap items-center gap-4 rounded-card bg-mint p-5 hover:outline-2 hover:outline-(color:--border-color-focus)"
                >
                  <span className="flex flex-col items-center rounded-control bg-page px-3 py-2">
                    <span className="type-h4 text-primary">{featured.days}</span>
                    <span className="type-eyebrow text-secondary">{featured.month}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 type-eyebrow text-secondary">
                      <span className="inline-flex items-center gap-1 rounded-pill bg-page px-2 py-0.5 type-label-sm text-body">
                        <span aria-hidden="true" className="size-1.5 rounded-pill bg-ink-500" /> Featured
                      </span>
                      {featured.eyebrow}
                    </span>
                    <span className="type-h4 text-primary">{featured.title}</span>
                    <span className="type-caption text-secondary">{featured.meta}</span>
                  </span>
                  <span className={buttonClasses({ size: "sm" })}>View event</span>
                </Link>
              ) : null}
              {byMonth(list).map((g) => (
                <section key={g.month} aria-label={g.month} className="flex flex-col gap-3">
                  <h2 className="type-eyebrow text-secondary">{g.month}</h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {g.items.map((e) => (
                      <li key={e.id}>
                        <Card e={e} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
          {!preset.past ? <SubmitBand /> : null}
        </section>
      </div>
    </>
  );
}
