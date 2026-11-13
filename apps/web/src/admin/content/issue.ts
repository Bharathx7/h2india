import { getDb } from "@h2india/core";
import type { IssueChart, IssueContent } from "@h2india/core/newsletter/sends";

import { newListings } from "@h2india/core/products";
import { formatIstDate } from "@h2india/core/time";
import type { Payload } from "payload";
import { publicWhere, showSample } from "@/cms/sample";
import { trackerRecords } from "@/tracker/data";
import { dataAsOf, SUB_VIEWS, type Row } from "@/tracker/views";
import { ARTICLE_TYPES } from "@/cms/types";
import { absolute } from "@/seo/site";

// What an India H₂ Weekly issue holds (composer 648:312, step 11.3), auto-filled from published items of the week
// before the send: top stories, tenders and grants closing in the week after, and events coming up. No prices.

const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "";

/** The charts an editor can pick for Chart of the week: each India Hydrogen Tracker view that draws one. */
export const NEWSLETTER_CHARTS = SUB_VIEWS.filter((v) => v.chart).map((v) => ({ value: v.path, label: v.tab }));

/** A tracker view's chart from its published records, with the source and as-of date readers need. */
export async function trackerChart(key: string | null | undefined): Promise<IssueChart | null> {
  const view = SUB_VIEWS.find((v) => v.path === key);
  if (!view?.chart) return null;
  const rows = (await trackerRecords(view.slug)) as unknown as Row[];
  const c = view.chart(rows);
  const bars = c.bars.filter((b) => b.value > 0);
  if (!bars.length) return null;
  const asOf = dataAsOf(rows);
  return {
    title: c.title,
    unit: c.unit,
    bars,
    source: `H2 India · India Hydrogen Tracker${asOf ? `, as of ${formatIstDate(new Date(asOf))}` : ""}`,
  };
}

export async function issueContent(
  payload: Payload,
  issue: { title: string; number: number; sentOn?: string | null },
  at: Date,
  opts: { chart?: string | null } = {},
): Promise<IssueContent> {
  const weekAgo = new Date(at.getTime() - 7 * 86_400_000).toISOString();
  const weekOn = new Date(at.getTime() + 7 * 86_400_000).toISOString();
  const now = at.toISOString();
  const where = publicWhere();
  const [chart, listings, articles, tenders, grants, events] = await Promise.all([
    trackerChart(opts.chart),
    newListings(getDb(), { since: new Date(weekAgo), until: at, includeSample: showSample() }),
    payload.find({
      collection: "articles",
      where: { and: [where, { publishedAt: { greater_than_equal: weekAgo } }, { type: { not_in: ["sponsored"] } }] },
      sort: "-publishedAt",
      limit: 3,
      depth: 0,
    }),
    payload.find({
      collection: "tenders",
      where: { and: [where, { bidDueAt: { greater_than_equal: now } }, { bidDueAt: { less_than: weekOn } }] },
      sort: "bidDueAt",
      limit: 3,
      depth: 0,
    }),
    payload.find({
      collection: "grants",
      where: { and: [where, { deadline: { greater_than_equal: now } }, { deadline: { less_than: weekOn } }] },
      sort: "deadline",
      limit: 2,
      depth: 0,
    }),
    payload.find({
      collection: "events",
      where: { and: [where, { startsAt: { greater_than_equal: now } }, { startsAt: { less_than: weekOn } }] },
      sort: "startsAt",
      limit: 3,
      depth: 0,
    }),
  ]);
  return {
    title: issue.title,
    masthead: `India H₂ Weekly · #${String(issue.number)} · ${day(issue.sentOn ?? at.toISOString())}`,
    sections: [
      {
        heading: "Top stories",
        items: articles.docs.map((a) => ({
          title: a.title,
          href: absolute(`/news/${a.slug}`),
          meta: `${ARTICLE_TYPES.find((t) => t.value === a.type)?.label ?? "News"} · ${day(a.publishedAt)}`,
        })),
      },
      {
        heading: "Closing this week",
        items: [
          ...tenders.docs.map((t) => ({
            title: t.title,
            href: absolute(`/opportunities/tenders/${t.slug}`),
            meta: `Tender · bid due ${day(t.bidDueAt)}`,
          })),
          ...grants.docs.map((g) => ({
            title: g.title,
            href: absolute(`/opportunities/grants/${g.slug}`),
            meta: `Grant · closes ${day(g.deadline)}`,
          })),
        ],
      },
      {
        heading: "Events",
        items: events.docs.map((e) => ({
          title: e.name,
          href: absolute(`/events/${e.slug}`),
          meta: [day(e.startsAt), e.city].filter(Boolean).join(" · "),
        })),
      },
      {
        heading: "New listings",
        late: true,
        items: listings.map((l) => ({ title: l.name, href: absolute(l.href), meta: l.supplier })),
      },
    ],
    chart,
  };
}
