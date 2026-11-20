import { buttonClasses, cx, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cmsSession } from "@/admin/cms/session";
import { ContentFrame } from "@/admin/cms/ContentFrame";
import { requireOperator } from "@/admin/shell";
import { publishingCalendar } from "@/cms/workflow";
import { ARTICLE_TYPES } from "@/cms/types";

// The publishing calendar (626:8, step 4.6): a week at a time in IST, with what is scheduled and published each day,
// and what is waiting in review or legal check.
export const metadata: Metadata = { title: "Publishing calendar · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const IST = 330 * 60_000;
/** Monday 00:00 IST of the week holding `at`, as a UTC instant. */
function weekStart(at: Date): Date {
  const ist = new Date(at.getTime() + IST);
  const dow = (ist.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - dow) - IST);
}
const istDay = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10);
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...o });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const { userId } = await requireOperator("content.view", "/admin/content/calendar");
  const cms = await cmsSession();
  if (!cms) notFound();
  const asked = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? new Date(`${sp.week}T00:00:00+05:30`) : new Date();
  const from = weekStart(asked);
  const to = new Date(from.getTime() + 7 * DAY);
  const items = await publishingCalendar(cms.payload, from, to);
  const days = Array.from({ length: 7 }, (_, i) => new Date(from.getTime() + i * DAY));
  const waiting = items.filter((i) => i.status === "In review" || i.status === "Legal check");
  const dated = items.filter((i) => i.at && (i.status === "Scheduled" || i.status === "Published"));
  const tone = (s: string) => (s === "Published" ? "success" : s === "Legal check" ? "warning" : "progress");
  const typeLabel = (t: string) => ARTICLE_TYPES.find((x) => x.value === t)?.label ?? t;
  const today = istDay(new Date());

  return (
    <ContentFrame userId={userId} current="calendar">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/admin/content" className="inline-flex items-center gap-1 type-label text-secondary">
            <Icon name="arrow-left" size={16} />
            Content home
          </Link>
          <h1 className="type-h2">Publishing calendar</h1>
          <p className="type-body-sm text-secondary">
            Week of {fmt(from, { day: "numeric", month: "long", year: "numeric" })} · times in IST
          </p>
        </div>
        <nav aria-label="Weeks" className="flex gap-2">
          <Link
            href={`/admin/content/calendar?week=${istDay(new Date(from.getTime() - 7 * DAY))}`}
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            <Icon name="chevron-left" size={14} />
            Previous week
          </Link>
          <Link href="/admin/content/calendar" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            This week
          </Link>
          <Link
            href={`/admin/content/calendar?week=${istDay(to)}`}
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            Next week
            <Icon name="chevron-right" size={14} />
          </Link>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        {days.map((d) => {
          const key = istDay(d);
          const list = dated.filter((i) => i.at && istDay(new Date(i.at)) === key);
          return (
            <section
              key={key}
              aria-label={fmt(d, { weekday: "long", day: "numeric", month: "long" })}
              className={cx(
                "flex min-h-40 flex-col gap-2 rounded-card border bg-page p-3",
                key === today ? "border-focus" : "border-default",
              )}
            >
              <h2 className="type-caption text-secondary">
                {fmt(d, { weekday: "short", day: "numeric", month: "short" })}
              </h2>
              {list.length ? (
                list.map((i) => (
                  <Link
                    key={String(i.id)}
                    href={`/admin/content/articles/${String(i.id)}`}
                    className="flex flex-col gap-1 rounded-input bg-subtle p-2 hover:bg-mint"
                  >
                    <span className="type-caption text-secondary">
                      {i.at ? fmt(new Date(i.at), { hour: "numeric", minute: "2-digit" }) : ""} · {typeLabel(i.type)}
                    </span>
                    <span className="line-clamp-3 type-label">{i.title}</span>
                    <StatusBadge status={i.status} tone={tone(i.status)} />
                  </Link>
                ))
              ) : (
                <span className="type-caption text-secondary">Nothing</span>
              )}
            </section>
          );
        })}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="type-h4">Waiting · {waiting.length}</h2>
        {waiting.length ? (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
            {waiting.map((i) => (
              <li key={String(i.id)} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="flex flex-col">
                  <span className="type-label">{i.title}</span>
                  <span className="type-caption text-secondary">{typeLabel(i.type)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={i.status} tone={tone(i.status)} />
                  <Link
                    href={`/admin/content/articles/${String(i.id)}`}
                    className={buttonClasses({ variant: "outline", size: "sm" })}
                  >
                    Open<span className="sr-only"> {i.title}</span>
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="Nothing waiting">Articles in review or legal check show here.</EmptyState>
          </div>
        )}
      </section>
    </ContentFrame>
  );
}
