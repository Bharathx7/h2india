import { STATE_OPTIONS } from "../cms/records/states";
import { formatValue, indianNumber, monthYear, rupeesFromPaise } from "../cms/tracker/format";
import { SOURCE_TIERS, STATUS_TONE, STATUSES, type TrackerSlug } from "../cms/tracker/options";

// The tracker's six sub-views as drawn (Projects 738:5437, Manufacturing 738:5994, Pilots 738:6499, Stations 739:8,
// Prices 739:685, State policies 739:1280; step 5.6): their filters, summary tiles, chart, columns and footnote, in one
// place so the page, the CSV and the tests agree. Pure: no CMS access.

export type Row = Record<string, unknown> & {
  id: number;
  slug: string;
  source?: { name?: string | null; url?: string | null; tier?: string | null; asOf?: string | null } | null;
};

export interface Cell {
  text: string;
  /** "status" draws a badge; "link" an outside link; "record" the record's own page. */
  kind?: "status" | "link" | "record" | "spec" | "strong";
  href?: string | null;
}

export interface Filter {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** True when the row passes the chosen value. */
  test: (row: Row, value: string) => boolean;
}

export interface SubView {
  path: string;
  slug: TrackerSlug;
  tab: string;
  title: string;
  /** "projects tracked" */
  noun: string;
  filters: (rows: Row[]) => Filter[];
  tiles: (rows: Row[], now: Date) => { value: string; label: string }[];
  chart: ((rows: Row[]) => { title: string; unit: string; bars: { label: string; value: number }[] }) | null;
  columns: { header: string; cell: (row: Row) => Cell }[];
  footnote: string;
}

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const sum = (rows: Row[], key: string) => rows.reduce((n, r) => n + num(r[key]), 0);

export const stateName = (value: string) => STATE_OPTIONS.find((o) => o.value === value)?.label ?? value;
const stateCell = (r: Row): Cell => ({ text: r.state ? stateName(str(r.state)) : "—" });
const statusCell = (r: Row): Cell => ({ text: str(r.stage) || "—", kind: "status" });
export const toneOfStage = (stage: string) => STATUS_TONE[stage] ?? "neutral";

/** The source column: its type, linking to the source (A34). */
function sourceCell(r: Row): Cell {
  const tier = SOURCE_TIERS.find((t) => t.value === r.source?.tier);
  return { text: tier?.short ?? "Source", kind: "link", href: r.source?.url ?? null };
}

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const distinct = (rows: Row[], key: string) => [...new Set(rows.map((r) => str(r[key])).filter(Boolean))].sort();
const stateFilter = (rows: Row[]): Filter => ({
  name: "state",
  label: "State",
  options: distinct(rows, "state").map((v) => ({ value: v, label: stateName(v) })),
  test: (r, v) => r.state === v,
});
const byField = (name: string, label: string, values: readonly string[], key = name): Filter => ({
  name,
  label,
  options: opts(values),
  test: (r, v) => {
    const x = r[key];
    return Array.isArray(x) ? x.map(String).includes(v) : str(x) === v;
  },
});

/** India's regions for the State policies filter (739:1280). */
export const REGIONS: Record<string, string[]> = {
  North: [
    "delhi",
    "haryana",
    "punjab",
    "himachal-pradesh",
    "jammu-and-kashmir",
    "ladakh",
    "uttarakhand",
    "uttar-pradesh",
    "rajasthan",
    "chandigarh",
  ],
  South: ["andhra-pradesh", "karnataka", "kerala", "tamil-nadu", "telangana", "puducherry", "lakshadweep"],
  East: ["bihar", "jharkhand", "odisha", "west-bengal", "andaman-and-nicobar-islands"],
  West: ["gujarat", "maharashtra", "goa", "dadra-and-nagar-haveli-and-daman-and-diu"],
  Central: ["madhya-pradesh", "chhattisgarh"],
  "North East": ["assam", "arunachal-pradesh", "manipur", "meghalaya", "mizoram", "nagaland", "sikkim", "tripura"],
};

const SIZES = [
  { value: "small", label: "Under 1,000 t/yr", min: 0, max: 999 },
  { value: "medium", label: "1,000–10,000 t/yr", min: 1000, max: 10_000 },
  { value: "large", label: "Over 10,000 t/yr", min: 10_001, max: Number.MAX_SAFE_INTEGER },
];

/** Price rows: the latest per product, or the lowest for ammonia as drawn ("lowest, Aug 2025"). */
function priceTiles(rows: Row[]): { value: string; label: string }[] {
  const tiles: { value: string; label: string }[] = [];
  const of = (product: string) => rows.filter((r) => r.product === product && typeof r.pricePaise === "number");
  const latest = (list: Row[]) => [...list].sort((a, b) => str(b.discoveredOn).localeCompare(str(a.discoveredOn)))[0];
  const lowest = (list: Row[]) => [...list].sort((a, b) => num(a.pricePaise) - num(b.pricePaise))[0];
  const h2 = latest(of("Green H₂"));
  if (h2)
    tiles.push({
      value: `₹${rupeesFromPaise(num(h2.pricePaise)).replace(/\.00$/, "")} / kg`,
      label: `Green H₂ · latest, ${monthYear(str(h2.discoveredOn))}`,
    });
  const nh3 = lowest(of("Green NH₃"));
  if (nh3)
    tiles.push({
      value: `₹${rupeesFromPaise(num(nh3.pricePaise))} / kg`,
      label: `Green NH₃ · lowest, ${monthYear(str(nh3.discoveredOn))}`,
    });
  const meoh = latest(of("Methanol"));
  if (meoh)
    tiles.push({
      value: `₹${rupeesFromPaise(num(meoh.pricePaise)).replace(/\.00$/, "")} / kg`,
      label: `Green methanol · ${monthYear(str(meoh.discoveredOn))}`,
    });
  tiles.push({ value: String(rows.length), label: "auctions and tenders tracked" });
  return tiles;
}

export const SUB_VIEWS: SubView[] = [
  {
    path: "projects",
    slug: "tracker-projects",
    tab: "Projects",
    title: "Green hydrogen projects in India",
    noun: "projects",
    filters: (rows) => [
      stateFilter(rows),
      byField("status", "Status", STATUSES["tracker-projects"], "stage"),
      { name: "company", label: "Company", options: opts(distinct(rows, "company")), test: (r, v) => r.company === v },
      {
        name: "size",
        label: "Size",
        options: SIZES.map((s) => ({ value: s.value, label: s.label })),
        test: (r, v) => {
          const s = SIZES.find((x) => x.value === v);
          const c = num(r.capacityTpa);
          return Boolean(s) && c >= (s?.min ?? 0) && c <= (s?.max ?? 0);
        },
      },
    ],
    tiles: (rows) => [
      { value: indianNumber(rows.length), label: "projects tracked" },
      {
        value: indianNumber(
          sum(
            rows.filter((r) => r.underSight === true),
            "capacityTpa",
          ),
        ),
        label: "t/yr awarded under SIGHT",
      },
      {
        value: indianNumber(
          sum(
            rows.filter((r) => r.stage === "Commissioned"),
            "capacityTpa",
          ),
        ),
        label: "t/yr commissioned",
      },
    ],
    chart: (rows) => ({
      title: "Capacity by status, t/yr",
      unit: "t/yr",
      bars: STATUSES["tracker-projects"]
        .filter((s) => s !== "Cancelled")
        .map((s) => ({
          label: s,
          value: sum(
            rows.filter((r) => r.stage === s),
            "capacityTpa",
          ),
        })),
    }),
    columns: [
      { header: "Company", cell: (r) => ({ text: str(r.company), kind: "strong" }) },
      { header: "Project", cell: (r) => ({ text: str(r.name), kind: "record" }) },
      { header: "State", cell: stateCell },
      { header: "Capacity (t/yr)", cell: (r) => ({ text: formatValue(r.capacityTpa, "number"), kind: "spec" }) },
      { header: "Technology", cell: (r) => ({ text: str(r.technology) || "—" }) },
      { header: "Status", cell: statusCell },
      { header: "Source", cell: sourceCell },
    ],
    footnote: "Capacity is hydrogen in tonnes a year; ammonia projects are converted at 0.18 t H₂ per t NH₃.",
  },
  {
    path: "manufacturing",
    slug: "tracker-factories",
    tab: "Manufacturing",
    title: "Electrolyser and fuel cell manufacturing in India",
    noun: "factories",
    filters: (rows) => [
      byField("technology", "Technology", distinct(rows, "technology")),
      byField("tranche", "Tranche", distinct(rows, "tranche")),
      stateFilter(rows),
    ],
    tiles: (rows) => [
      {
        value: indianNumber(
          sum(
            rows.filter((r) => r.tranche && r.tranche !== "Not under SIGHT"),
            "capacityMwPerYear",
          ),
        ),
        label: "MW/yr awarded under SIGHT",
      },
      { value: indianNumber(rows.length), label: "factories tracked" },
      { value: indianNumber(rows.filter((r) => r.stage === "Operating").length), label: "operating" },
    ],
    chart: (rows) => ({
      title: "Capacity by company, MW/yr",
      unit: "MW/yr",
      bars: [...rows]
        .sort((a, b) => num(b.capacityMwPerYear) - num(a.capacityMwPerYear))
        .slice(0, 8)
        .map((r) => ({ label: str(r.company), value: num(r.capacityMwPerYear) })),
    }),
    columns: [
      { header: "Company", cell: (r) => ({ text: str(r.company), kind: "record" }) },
      { header: "Product", cell: (r) => ({ text: str(r.product) }) },
      { header: "Capacity (MW/yr)", cell: (r) => ({ text: formatValue(r.capacityMwPerYear, "number"), kind: "spec" }) },
      { header: "Technology", cell: (r) => ({ text: str(r.technology) || "—" }) },
      { header: "Tranche", cell: (r) => ({ text: str(r.tranche) || "—" }) },
      { header: "Location", cell: (r) => ({ text: str(r.location) || (r.state ? stateName(str(r.state)) : "—") }) },
      { header: "Status", cell: statusCell },
    ],
    footnote: "Capacity is the nameplate a year the company has stated or been awarded.",
  },
  {
    path: "pilots",
    slug: "tracker-pilots",
    tab: "Pilots",
    title: "Hydrogen pilots in India",
    noun: "pilots",
    filters: (rows) => [byField("sector", "Sector", distinct(rows, "sector")), stateFilter(rows)],
    tiles: (rows) => [
      { value: indianNumber(rows.length), label: "pilots tracked" },
      {
        value: indianNumber(
          sum(
            rows.filter((r) => r.sector === "Mobility"),
            "vehicles",
          ),
        ),
        label: "mobility pilot vehicles",
      },
      { value: indianNumber(new Set(rows.map((r) => r.sector)).size), label: "sectors" },
    ],
    chart: null,
    columns: [
      { header: "Sector", cell: (r) => ({ text: str(r.sector), kind: "strong" }) },
      { header: "Lead partner", cell: (r) => ({ text: str(r.leadPartner), kind: "record" }) },
      { header: "Route or site", cell: (r) => ({ text: str(r.routeOrSite) }) },
      { header: "Vehicles or units", cell: (r) => ({ text: str(r.units) || "—" }) },
      { header: "Funding", cell: (r) => ({ text: str(r.funding) || "—" }) },
      { header: "Status", cell: statusCell },
    ],
    footnote: "Routes and sites are as the lead partner describes them.",
  },
  {
    path: "stations",
    slug: "tracker-stations",
    tab: "Stations",
    title: "Hydrogen refuelling stations in India",
    noun: "stations",
    filters: (rows) => [
      stateFilter(rows),
      byField("status", "Status", STATUSES["tracker-stations"], "stage"),
      {
        name: "pressure",
        label: "Pressure",
        options: [...new Set(rows.flatMap((r) => (Array.isArray(r.pressures) ? r.pressures.map(Number) : [])))]
          .sort((a, b) => a - b)
          .map((p) => ({ value: String(p), label: `${String(p)} bar` })),
        test: (r, v) => Array.isArray(r.pressures) && r.pressures.map(String).includes(v),
      },
    ],
    tiles: (rows) => {
      const operating = rows.filter((r) => r.stage === "Operating");
      return [
        { value: indianNumber(rows.length), label: "stations tracked" },
        { value: indianNumber(operating.length), label: "operating" },
        { value: indianNumber(sum(operating, "capacityKgPerDay")), label: "kg/day at operating stations" },
      ];
    },
    chart: null,
    columns: [
      { header: "Location", cell: (r) => ({ text: str(r.name), kind: "record" }) },
      { header: "Operator", cell: (r) => ({ text: str(r.operator) }) },
      { header: "Pressure (bar)", cell: (r) => ({ text: formatValue(r.pressures, "list"), kind: "spec" }) },
      { header: "Capacity (kg/day)", cell: (r) => ({ text: formatValue(r.capacityKgPerDay, "number"), kind: "spec" }) },
      { header: "Status", cell: statusCell },
      { header: "Vehicles served", cell: (r) => ({ text: str(r.vehiclesServed) || "—" }) },
    ],
    footnote: "Capacity is the station's stated dispensing capacity.",
  },
  {
    path: "prices",
    slug: "tracker-prices",
    tab: "Prices",
    title: "Price discovery: green hydrogen and derivatives",
    noun: "auctions and tenders",
    filters: (rows) => [
      byField("product", "Product", distinct(rows, "product")),
      {
        name: "date",
        label: "Date",
        options: [
          { value: "24", label: "last 24 months" },
          { value: "12", label: "last 12 months" },
        ],
        test: (r, v) => {
          const since = new Date();
          since.setMonth(since.getMonth() - Number(v));
          return str(r.discoveredOn) >= since.toISOString();
        },
      },
    ],
    tiles: (rows) => priceTiles(rows),
    chart: null,
    columns: [
      { header: "Auction or tender", cell: (r) => ({ text: str(r.name), kind: "record" }) },
      { header: "Product", cell: (r) => ({ text: str(r.product) }) },
      { header: "Price (₹/kg)", cell: (r) => ({ text: formatValue(r.pricePaise, "paise"), kind: "spec" }) },
      { header: "GST basis", cell: (r) => ({ text: str(r.gstBasis) || "—" }) },
      { header: "Date", cell: (r) => ({ text: r.discoveredOn ? monthYear(str(r.discoveredOn)) : "—" }) },
      { header: "Winner", cell: (r) => ({ text: str(r.winner) || "—" }) },
      { header: "Source", cell: sourceCell },
    ],
    footnote: "Prices are as discovered in the auction, before GST, per kg of product delivered.",
  },
  {
    path: "state-policies",
    slug: "tracker-policies",
    tab: "State policies",
    title: "State hydrogen policies compared",
    noun: "policies",
    filters: () => [
      {
        name: "region",
        label: "Region",
        options: Object.keys(REGIONS).map((v) => ({ value: v, label: v })),
        test: (r, v) => (REGIONS[v] ?? []).includes(str(r.state)),
      },
      byField("type", "Type", ["Dedicated", "Provisions"]),
    ],
    tiles: (rows) => [
      { value: indianNumber(new Set(rows.map((r) => r.state)).size), label: "states with a policy or provisions" },
      { value: indianNumber(rows.filter((r) => r.type === "Dedicated").length), label: "dedicated hydrogen policies" },
    ],
    chart: null,
    columns: [
      { header: "State", cell: (r) => ({ text: stateName(str(r.state)), kind: "strong" }) },
      { header: "Policy", cell: (r) => ({ text: str(r.policy), kind: "record" }) },
      { header: "Type", cell: (r) => ({ text: str(r.type) }) },
      { header: "Key incentives", cell: (r) => ({ text: str(r.keyIncentives) || "—" }) },
      { header: "Year", cell: (r) => ({ text: str(r.year) }) },
      { header: "Link", cell: (r) => ({ text: "Official", kind: "link", href: str(r.officialUrl) || null }) },
    ],
    footnote: "Summaries are ours; always read the policy on the state's website.",
  },
];

export const subView = (path: string) => SUB_VIEWS.find((v) => v.path === path) ?? null;
export const subViewOf = (slug: string) => SUB_VIEWS.find((v) => v.slug === slug) ?? null;

/** Applies the chosen filters (?state=gujarat&status=Awarded); unknown values are ignored. */
export function applyFilters(view: SubView, rows: Row[], chosen: Record<string, string>): Row[] {
  const filters = view.filters(rows);
  return rows.filter((r) =>
    filters.every((f) => {
      const v = chosen[f.name];
      return !v || !f.options.some((o) => o.value === v) || f.test(r, v);
    }),
  );
}

/** The newest as-of date among the rows' sources ("Data as of"). */
export function dataAsOf(rows: Row[]): string | null {
  const dates = rows.map((r) => r.source?.asOf).filter((d): d is string => Boolean(d));
  return dates.length ? (dates.sort().at(-1) ?? null) : null;
}

/** The CSV of a sub-view: the drawn columns plus each row's source and as-of date (A34). */
export function toCsv(view: SubView, rows: Row[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = [...view.columns.map((c) => c.header), "Source name", "Source link", "As of"];
  const lines = rows.map((r) => [
    ...view.columns.map((c) => {
      const cell = c.cell(r);
      return cell.kind === "link" ? (cell.href ?? "") : cell.text;
    }),
    r.source?.name ?? "",
    r.source?.url ?? "",
    r.source?.asOf ? r.source.asOf.slice(0, 10) : "",
  ]);
  return [header, ...lines].map((l) => l.map((x) => esc(x)).join(",")).join("\n") + "\n";
}
