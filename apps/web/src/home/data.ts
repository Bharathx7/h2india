import config from "@payload-config";
import { getDb } from "@h2india/core";
import { listedBrands } from "@h2india/core/companies";
import { isEnabled } from "@h2india/config";
import type { CardStatus, MarqueeBrand } from "@h2india/ui";
import { getPayload, type Where } from "payload";
import { publicWhere, showSample } from "@/cms/sample";
import { STATE_OPTIONS } from "@/cms/records/common";
import { schemeStatus, tenderStatus } from "@/cms/records/status";
import { dayMonthYear, indianNumber } from "@/cms/tracker/format";
import { typeBadge } from "@/cms/types";
import type { Article, Event, HomeFigure, Scheme, Tender, Topic, TrackerHub } from "@/payload-types";

// Each home module loads its own data (playbook step 5.1), so one failing query never blanks the page. Only published,
// non-sample items reach readers (sample ones too where FLAG_SAMPLE_CONTENT is on, A37).

const DAY = 86_400_000;
const IST = "Asia/Kolkata";

/** Modules a developer can force to fail with ?fail=… (development and dev pages only), to see their error states. */
export const HOME_MODULES = ["brands", "figures", "tenders", "schemes", "news", "sight", "events", "hubs"] as const;
export type HomeModule = (typeof HOME_MODULES)[number];

export function forcedFailures(param: string | string[] | undefined): Set<HomeModule> {
  if (process.env.NODE_ENV !== "development" && !isEnabled("devPages")) return new Set();
  const values = (Array.isArray(param) ? param : [param ?? ""]).flatMap((v) => v.split(","));
  return new Set(HOME_MODULES.filter((m) => values.includes(m)));
}

export type Result<T> = { ok: true; data: T } | { ok: false };

/** Runs one module's query; a failure is logged and shown as that module's error state. */
export async function settle<T>(name: HomeModule, fail: Set<HomeModule>, load: () => Promise<T>): Promise<Result<T>> {
  try {
    if (fail.has(name)) throw new Error(`Forced failure of the ${name} module (?fail=${name})`);
    return { ok: true, data: await load() };
  } catch (error) {
    console.error(`[home] ${name} failed`, error);
    return { ok: false };
  }
}

const payload = () => getPayload({ config });
const and = (...parts: Where[]): Where => ({ and: [publicWhere(), ...parts] });

const ist = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...opts }).format(new Date(iso));

/** "5 days left", "1 day left", "Closes today". */
function daysLeft(iso: string, now: Date): string {
  const days = Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY);
  return days <= 0 ? "closes today" : `${String(days)} ${days === 1 ? "day" : "days"} left`;
}

const stateLabel = (value: string) => STATE_OPTIONS.find((o) => o.value === value)?.label ?? value;

function toneOf(status: string): CardStatus["tone"] {
  if (status === "Closing soon") return "warning";
  if (status === "Open") return "success";
  if (status === "Closed" || status === "Awarded") return "neutral";
  return "progress";
}

// ---------- 02 Trust strip

export async function loadBrands(): Promise<MarqueeBrand[]> {
  const brands = await listedBrands(getDb(), { includeSample: showSample() });
  return brands.map((b) => ({ name: b.name, href: `/directory/companies/${b.slug}` }));
}

// ---------- 03 Live ecosystem and 10 SIGHT snapshot (A45)

export interface Figure {
  value: string;
  label: string;
  source: string;
}

async function homeFigures(): Promise<HomeFigure | null> {
  const doc = await (await payload()).findGlobal({ slug: "home-figures", depth: 0 });
  if (doc.sample && !showSample()) return null;
  return doc;
}

/** Open tenders: bid due in the future and no result declared. */
function openTenders(now: Date): Where {
  return and(
    { bidDueAt: { greater_than: now.toISOString() } },
    { or: [{ "result.declaredAt": { exists: false } }, { "result.declaredAt": { greater_than: now.toISOString() } }] },
  );
}

export async function loadFigures(now = new Date()): Promise<Figure[]> {
  const [doc, open] = await Promise.all([
    homeFigures(),
    (await payload()).count({ collection: "tenders", where: openTenders(now) }),
  ]);
  const entered = (doc?.figures ?? []).map((f) => ({
    value: f.value,
    label: f.label,
    source: `${f.source} · as of ${dayMonthYear(f.asOf)}`,
  }));
  return [
    ...entered,
    {
      value: indianNumber(open.totalDocs),
      label: "hydrogen tenders open this month",
      source: `H2 India tracker · as of ${dayMonthYear(now)}`,
    },
    // "Verified supplier listings" joins when Stage 6 has real listings (A45).
  ];
}

export interface SightBar {
  label: string;
  value: number;
  shown: string;
}

export interface SightChart {
  title: string;
  bars: SightBar[];
  total: string;
}

export interface Sight {
  charts: SightChart[];
  source: string | null;
}

export async function loadSight(): Promise<Sight | null> {
  const doc = await homeFigures();
  const sight = doc?.sight;
  if (!sight) return null;
  const chart = (
    title: string,
    rows: { label: string; value: number }[] | null | undefined,
    show: (n: number) => string,
  ) => {
    const bars = (rows ?? []).map((r) => ({ label: r.label, value: r.value, shown: show(r.value) }));
    return { title, bars, total: show(bars.reduce((sum, b) => sum + b.value, 0)) };
  };
  const charts = [
    chart("Green hydrogen production · lakh t a year", sight.production, (n) => n.toFixed(2)),
    chart("Electrolyser manufacturing · MW a year", sight.manufacturing, (n) => indianNumber(n)),
  ].filter((c) => c.bars.length > 0);
  if (!charts.length) return null;
  const source = sight.source
    ? `Source: ${sight.source.replace(/\.$/, "")}.${sight.asOf ? ` As of ${dayMonthYear(sight.asOf)}.` : ""}`
    : null;
  return { charts, source };
}

// ---------- 09 Opportunities

export interface TenderView {
  issuer: string;
  status: CardStatus;
  title: string;
  tenderId: string;
  place: string;
  due: string;
  money: string;
  category: string;
  href: string;
  documentsHref: string;
  trackHref: string;
}

function placeOf(states: string[] | null | undefined): string {
  const list = (states ?? []).filter(Boolean);
  if (!list.length || list.includes("all-india")) return "Pan-India";
  return list.map(stateLabel).join(", ");
}

export async function loadTenders(now = new Date(), limit = 3): Promise<TenderView[]> {
  const res = await (
    await payload()
  ).find({
    collection: "tenders",
    where: openTenders(now),
    sort: "bidDueAt",
    limit,
    depth: 0,
  });
  return res.docs.map((t: Tender) => {
    const status = tenderStatus({ bidDueAt: t.bidDueAt, result: t.result ?? null }, now);
    const page = `/opportunities/tenders/${t.slug}`;
    return {
      issuer: t.issuer,
      status: { label: status, tone: toneOf(status) },
      title: t.title,
      tenderId: t.tenderId,
      place: placeOf(t.states),
      due: `Bid due ${dayMonthYear(t.bidDueAt)} · ${daysLeft(t.bidDueAt, now)}`,
      money: `Est. value: ${t.value?.trim() || "not published"} · EMD: ${t.emd?.trim() || "not published"}`,
      category: t.category?.replace(/\s*›\s*/g, " · ") ?? "",
      href: page,
      documentsHref: t.sourceUrl,
      trackHref: `${page}#track`,
    };
  });
}

export interface SchemeView {
  level: string;
  status: CardStatus;
  title: string;
  benefit: string;
  who: string[];
  deadline: string;
  verified: string | null;
  href: string;
}

export async function loadSchemes(now = new Date(), limit = 3): Promise<SchemeView[]> {
  const res = await (
    await payload()
  ).find({
    collection: "schemes",
    where: and(
      { statusOverride: { not_equals: "Closed" } },
      { or: [{ nextDeadline: { exists: false } }, { nextDeadline: { greater_than: now.toISOString() } }] },
    ),
    sort: "nextDeadline",
    limit,
    depth: 0,
  });
  return res.docs.map((s: Scheme) => {
    const status = schemeStatus({ nextDeadline: s.nextDeadline, override: s.statusOverride }, now);
    const states = (s.states ?? []).filter((v) => v !== "all-india");
    const agency = s.ministry && s.ministry !== s.runBy ? `${s.ministry} / ${s.runBy}` : s.runBy;
    // "CENTRAL · MNRE / SECI", "STATE · GUJARAT" (375:7251).
    const level = states.length ? `State · ${states.map(stateLabel).join(", ")}` : `Central · ${agency}`;
    const deadline = s.nextDeadline
      ? `Next deadline ${dayMonthYear(s.nextDeadline)} · ${daysLeft(s.nextDeadline, now)}`
      : s.deadlineNote?.trim() || "No deadline published";
    return {
      level,
      status: { label: status, tone: toneOf(status) },
      title: s.name,
      benefit: s.summary,
      who: s.whoCanApply ?? [],
      deadline,
      verified: s.verification?.at ? dayMonthYear(s.verification.at) : null,
      href: `/opportunities/schemes/${s.slug}`,
    };
  });
}

// ---------- 10 Insights and news

export interface ArticleView {
  section: string;
  title: string;
  href: string;
  readLabel: string;
  badge: string | null;
}

/** Words in a Lexical body, for the reading time ("Read · 7 min"). */
function wordsIn(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const n = node as { text?: unknown; children?: unknown[]; root?: unknown };
  let count = typeof n.text === "string" ? n.text.split(/\s+/).filter(Boolean).length : 0;
  if (n.root) count += wordsIn(n.root);
  for (const c of n.children ?? []) count += wordsIn(c);
  return count;
}

function articleView(a: Article): ArticleView {
  const topic = (a.topics ?? []).find((t): t is Topic => typeof t === "object");
  const date = ist(a.publishedAt ?? a.createdAt, { day: "numeric", month: "short", year: "numeric" });
  const minutes = Math.max(1, Math.ceil(wordsIn(a.body) / 200));
  return {
    section: topic ? `${topic.name} · ${date}` : date,
    title: a.title,
    href: `/news/${a.slug}`,
    readLabel: `Read · ${String(minutes)} min`,
    badge: typeBadge(a.type),
  };
}

export interface News {
  lead: ArticleView | null;
  explainer: ArticleView | null;
  more: ArticleView[];
}

export async function loadNews(): Promise<News> {
  const p = await payload();
  const latest = await p.find({ collection: "articles", where: and(), sort: "-publishedAt", limit: 6, depth: 1 });
  const explainer = await p.find({
    collection: "articles",
    where: and({ type: { equals: "explainer" } }),
    sort: "-publishedAt",
    limit: 1,
    depth: 1,
  });
  const explainerDoc = explainer.docs[0] ?? null;
  const rest = latest.docs.filter((a) => a.id !== explainerDoc?.id);
  const [lead, ...more] = rest;
  return {
    lead: lead ? articleView(lead) : null,
    explainer: explainerDoc ? articleView(explainerDoc) : null,
    more: more.slice(0, 4).map(articleView),
  };
}

// ---------- 12 Events and learning

export interface EventView {
  day: string;
  month: string;
  kind: string;
  title: string;
  meta: string;
  href: string;
  sponsored: boolean;
}

function timeRange(start: string, end: string | null | undefined): string {
  const t = (iso: string) => ist(iso, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const a = t(start);
  if (!end) return `${a} IST`;
  const b = t(end);
  const [aTime, aHalf] = a.split(" ");
  const [, bHalf] = b.split(" ");
  return aHalf === bHalf ? `${aTime ?? a}–${b} IST` : `${a}–${b} IST`;
}

export async function loadEvents(now = new Date(), limit = 4): Promise<EventView[]> {
  const res = await (
    await payload()
  ).find({
    collection: "events",
    where: and({
      or: [
        { startsAt: { greater_than_equal: now.toISOString() } },
        { endsAt: { greater_than_equal: now.toISOString() } },
      ],
    }),
    sort: "startsAt",
    limit,
    depth: 0,
  });
  return res.docs.map((e: Event) => {
    const online = e.format.toLowerCase().includes("online");
    const city = e.venue?.split(",").pop()?.trim() ?? "";
    const where = online ? "Online" : city || "In person";
    const startDay = ist(e.startsAt, { year: "numeric", month: "2-digit", day: "2-digit" });
    const endDay = e.endsAt ? ist(e.endsAt, { year: "numeric", month: "2-digit", day: "2-digit" }) : startDay;
    const days = Math.round((new Date(e.endsAt ?? e.startsAt).getTime() - new Date(e.startsAt).getTime()) / DAY) + 1;
    const price = e.tickets ?? "Free";
    const meta =
      endDay !== startDay
        ? `${String(days)} days · ${where} · ${price}`
        : `${timeRange(e.startsAt, e.endsAt)} · ${price}`;
    return {
      day: ist(e.startsAt, { day: "numeric" }),
      month: ist(e.startsAt, { month: "short" }).toUpperCase(),
      kind: `${e.format.split("·")[0]?.trim() ?? e.format} · ${where}`,
      title: e.name,
      meta,
      href: `/events/${e.slug}`,
      sponsored: Boolean(e.sponsoredPlacement),
    };
  });
}

export interface HubPin {
  name: string;
  /** Position in the teaser box, 0 to 100. */
  x: number;
  y: number;
}

export interface Hubs {
  pins: HubPin[];
  legend: string;
}

// The teaser box frames India roughly as drawn (376:7131); the real map with India-compliant tiles comes with the tracker.
const BOX = { west: 66, east: 95, north: 31, south: 4 };
const clamp = (n: number) => Math.min(90, Math.max(4, n));

export async function loadHubs(): Promise<Hubs | null> {
  const res = await (
    await payload()
  ).find({
    collection: "tracker-hubs",
    where: and({ kind: { equals: "Hub" } }),
    sort: "name",
    limit: 12,
    depth: 0,
  });
  const hubs: TrackerHub[] = res.docs;
  if (!hubs.length) return null;
  const pins = hubs
    .filter((h) => typeof h.latitude === "number" && typeof h.longitude === "number")
    .map((h) => ({
      name: h.name,
      x: clamp((((h.longitude ?? 0) - BOX.west) / (BOX.east - BOX.west)) * 100),
      y: clamp(((BOX.north - (h.latitude ?? 0)) / (BOX.north - BOX.south)) * 100),
    }));
  const newest = hubs.reduce<TrackerHub | null>(
    (best, h) => (!best || h.source.asOf > best.source.asOf ? h : best),
    null,
  );
  const count = `${String(hubs.length)} green hydrogen ${hubs.length === 1 ? "hub" : "hubs"}`;
  const asOf = newest?.source.asOf ? ` · Data as of ${dayMonthYear(newest.source.asOf)}` : "";
  const source = newest?.source.name ? ` · Source: ${newest.source.name}` : "";
  return { pins, legend: `${count}${asOf}${source}` };
}
