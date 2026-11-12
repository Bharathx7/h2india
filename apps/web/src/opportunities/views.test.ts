import { describe, expect, it } from "vitest";
import type { Grant, Job, Tender } from "../payload-types";
import {
  filterGrants,
  filterJobs,
  filterTenders,
  grantView,
  jobPostingLd,
  jobView,
  resultRow,
  sortJobs,
  stepStates,
  tenderRow,
  type TenderFilter,
} from "./views";

// Step 5.5: the lists' filters and labels, in India time, without the CMS.

const ist = (s: string) => new Date(`${s}+05:30`);
const now = ist("2026-11-12T12:00");
const iso = (s: string) => ist(s).toISOString();

const tender = (over: Partial<Tender>): Tender => ({
  id: 1,
  slug: "t",
  title: "Compressor package",
  issuer: "BPCL",
  tenderId: "BPCL/1",
  description: "Scope",
  sourceUrl: "https://example.org",
  bidDueAt: iso("2026-11-14T15:00"),
  createdAt: iso("2026-10-01T10:00"),
  updatedAt: iso("2026-10-01T10:00"),
  states: ["madhya-pradesh"],
  ...over,
});

const none: TenderFilter = {
  issuerTypes: [],
  issuer: "",
  sectors: [],
  state: "",
  statuses: [],
  from: "",
  to: "",
  values: [],
  q: "",
};

describe("tenders (455:1621)", () => {
  it("labels the bid due date with days left, amber in the last week", () => {
    const r = tenderRow(tender({}), now);
    expect(r.status.label).toBe("Closing soon");
    expect(r.dueDate).toBe("14 Nov 2026");
    expect(r.left).toEqual({ label: "2 days left", tone: "warning" });
    expect(tenderRow(tender({ bidDueAt: iso("2026-12-04T15:00") }), now).left?.tone).toBe("success");
    expect(tenderRow(tender({ bidDueAt: iso("2026-11-01T15:00") }), now).left).toBeNull();
  });

  it("starts with open, closing soon and extended tenders, and filters on every drawn group", () => {
    const rows = [
      tender({ id: 1, sector: "Equipment", valueBand: "₹10–100 crore", issuerType: "Public sector companies" }),
      tender({
        id: 2,
        bidDueAt: iso("2026-11-30T15:00"),
        extendedFrom: iso("2026-11-20T15:00"),
        sector: "Electrolysers",
        states: ["all-india"],
      }),
      tender({ id: 3, bidDueAt: iso("2026-12-30T15:00"), publishedAt: iso("2026-11-20T10:00"), states: ["kerala"] }),
      tender({ id: 4, bidDueAt: iso("2026-11-01T15:00") }),
    ].map((t) => tenderRow(t, now));
    const ids = (f: Partial<TenderFilter>) => filterTenders(rows, { ...none, ...f }).map((r) => r.id);
    expect(ids({})).toEqual([1, 2]);
    expect(ids({ statuses: ["Upcoming", "Under evaluation"] })).toEqual([3, 4]);
    expect(ids({ sectors: ["Electrolysers"] })).toEqual([2]);
    expect(ids({ values: ["Not published"] })).toEqual([2]);
    expect(ids({ issuerTypes: ["Public sector companies"] })).toEqual([1]);
    // A pan-India tender is open to bidders in every state.
    expect(ids({ state: "kerala" })).toEqual([2]);
    // Bid due dates are compared as India days, inclusive.
    expect(ids({ from: "2026-11-15", to: "2026-11-30" })).toEqual([2]);
    expect(ids({ to: "2026-11-14" })).toEqual([1]);
  });

  it("writes a result row from the declared result", () => {
    const r = resultRow(
      tender({
        sector: "Production",
        result: {
          declaredAt: iso("2025-08-06T00:00"),
          winners: [
            { name: "Deccan Ammonia Works", capacity: "60,000 t/yr", price: "₹52.25 per kg", profileSlug: "deccan" },
          ],
        },
      }),
    );
    expect(r).toMatchObject({
      date: "6 Aug 2025",
      eyebrow: "BPCL · Production",
      bidders: "Not public",
      price: "₹52.25 per kg",
      year: "2025",
      winners: [{ name: "Deccan Ammonia Works", href: "/directory/companies/deccan" }],
    });
    expect(resultRow(tender({}))).toBeNull();
  });
});

const grant = (over: Partial<Grant>): Grant => ({
  id: 1,
  slug: "g",
  title: "Catalysts call",
  funder: "ANRF",
  howToApply: "Submit a proposal.",
  sourceUrl: "https://example.org",
  deadline: iso("2026-11-16T17:00"),
  createdAt: iso("2026-10-01T10:00"),
  updatedAt: iso("2026-10-01T10:00"),
  ...over,
});

describe("grants (462:4609)", () => {
  it("writes the deadline line for open, announced and closed calls", () => {
    expect(grantView(grant({}), now).deadline).toBe("Proposals due 16 Nov 2026 · 4 days left");
    expect(
      grantView(
        grant({ statusOverride: "Announced", nextCallExpected: "Jan 2027", deadline: iso("2027-01-31T17:00") }),
        now,
      ).deadline,
    ).toBe("Call expected Jan 2027");
    const closed = grantView(grant({ deadline: iso("2026-11-01T17:00"), nextCallExpected: "mid-2027" }), now);
    expect(closed.status.label).toBe("Closed");
    expect(closed.statusKey).toBe("Next round expected");
  });

  it("lists open and announced calls until a status is chosen", () => {
    const list = [
      grantView(grant({ id: 1, whoCanApply: ["Researchers"] }), now),
      grantView(grant({ id: 2, statusOverride: "Announced", deadline: iso("2027-01-31T17:00") }), now),
      grantView(grant({ id: 3, deadline: iso("2026-11-01T17:00"), nextCallExpected: "mid-2027" }), now),
    ];
    expect(filterGrants(list, { funders: [], themes: [], who: [], statuses: [] }).map((g) => g.id)).toEqual([1, 2]);
    expect(
      filterGrants(list, { funders: [], themes: [], who: [], statuses: ["Next round expected"] }).map((g) => g.id),
    ).toEqual([3]);
    expect(
      filterGrants(list, { funders: [], themes: [], who: ["Researchers"], statuses: [] }).map((g) => g.id),
    ).toEqual([1]);
  });

  it("marks steps before the next date as done", () => {
    const steps = [{}, { at: iso("2026-11-16T00:00") }, { at: iso("2027-02-10T00:00") }];
    expect(stepStates(steps, now)).toEqual(["done", "current", "next"]);
    expect(stepStates(steps, ist("2027-03-01T00:00"))).toEqual(["done", "done", "done"]);
  });
});

const job = (over: Partial<Job>): Job => ({
  id: 1,
  slug: "j",
  role: "Commissioning engineer",
  company: "Konkan Hydrogen Tech",
  location: "Ratnagiri, Maharashtra",
  states: ["maharashtra"],
  workMode: "On site",
  description: "Lead commissioning.",
  howToApply: "link",
  sourceUrl: "https://example.org/careers",
  postedAt: iso("2026-11-06T10:00"),
  closesAt: iso("2026-11-30T23:59"),
  createdAt: iso("2026-11-06T10:00"),
  updatedAt: iso("2026-11-06T10:00"),
  ...over,
});

describe("jobs (464:6071)", () => {
  it("shows live jobs only, featured first, and filters as drawn", () => {
    const list = [
      jobView(job({ id: 1, experience: "3–6 years", function: "Engineering" }), now),
      jobView(
        job({
          id: 2,
          experience: "Students",
          jobType: "Internship",
          postedAt: iso("2026-11-01T10:00"),
          featured: true,
        }),
        now,
      ),
      jobView(job({ id: 3, closesAt: iso("2026-11-10T23:59") }), now),
      jobView(job({ id: 4, states: ["gujarat"], workMode: "Remote", experience: "10+ years" }), now),
    ];
    const f = { students: false, functions: [], location: "", modes: [], experience: "" };
    expect(sortJobs(filterJobs(list, f), "").map((j) => j.id)).toEqual([2, 1, 4]);
    expect(filterJobs(list, { ...f, students: true }).map((j) => j.id)).toEqual([2]);
    expect(filterJobs(list, { ...f, location: "gujarat" }).map((j) => j.id)).toEqual([4]);
    expect(filterJobs(list, { ...f, experience: "7-plus" }).map((j) => j.id)).toEqual([4]);
    expect(filterJobs(list, { ...f, modes: ["Remote"] }).map((j) => j.id)).toEqual([4]);
    expect(list[0]?.dates).toBe("Posted 6 Nov · closes 30 Nov");
  });

  it("describes a live job for search engines, with the salary band in rupees a year", () => {
    const ld = jobPostingLd(
      job({ salaryBand: "12–18", jobType: "Full-time", skills: ["HAZOP"] }),
      "https://h2.example/j",
      {
        name: "Konkan Hydrogen Tech",
      },
    );
    expect(ld).toMatchObject({
      "@type": "JobPosting",
      employmentType: "FULL_TIME",
      validThrough: iso("2026-11-30T23:59"),
      jobLocation: { address: { addressLocality: "Ratnagiri", addressRegion: "Maharashtra", addressCountry: "IN" } },
      baseSalary: { currency: "INR", value: { minValue: 1_200_000, maxValue: 1_800_000, unitText: "YEAR" } },
    });
    // A stipend written in words isn't a band, so no salary is claimed.
    expect(jobPostingLd(job({ salaryBand: "₹30,000 a month stipend" }), "u", { name: "x" })).not.toHaveProperty(
      "baseSalary",
    );
  });
});
