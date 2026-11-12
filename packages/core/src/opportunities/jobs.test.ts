import { describe, expect, it } from "vitest";
import { checkJobPost, experienceFits, isStudentRole, latestClosingDay, salaryLabel, type JobPostInput } from "./jobs";

const now = new Date("2026-11-12T06:30:00Z"); // 12 Nov 2026, 12:00 IST

const filled: JobPostInput = {
  role: "Electrolyser commissioning engineer",
  function: "Engineering",
  jobType: "Full-time",
  experience: "3–6 years",
  description: "You'll lead site commissioning of our PEM electrolyser systems.",
  skills: ["Commissioning", "PEM electrolysers", "Commissioning", " "],
  location: "Ratnagiri, Maharashtra",
  workMode: "On site",
  showSalary: true,
  salaryFrom: "12",
  salaryTo: "18",
  applyBy: "link",
  careersUrl: "https://careers.example.org/commissioning-engineer",
  closesOn: "2026-11-30",
};

describe("posting a job (467:7472)", () => {
  it("accepts a complete job and closes it at the end of the day, India time", () => {
    const r = checkJobPost(filled, { now });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.closesAt).toBe("2026-11-30T18:29:00.000Z");
    expect(r.values.salaryBand).toBe("12–18");
    expect(r.values.skills).toEqual(["Commissioning", "PEM electrolysers"]);
  });

  it("allows closing dates from tomorrow up to 60 days from today", () => {
    expect(latestClosingDay(now)).toBe("2027-01-11");
    expect(checkJobPost({ ...filled, closesOn: "2026-11-12" }, { now }).ok).toBe(false);
    expect(checkJobPost({ ...filled, closesOn: "2026-11-13" }, { now }).ok).toBe(true);
    expect(checkJobPost({ ...filled, closesOn: "2027-01-11" }, { now }).ok).toBe(true);
    const late = checkJobPost({ ...filled, closesOn: "2027-01-12" }, { now });
    expect(late.ok ? null : late.errors.closesOn).toBe("Choose a date up to 60 days from today");
  });

  it("names every missing field, but lets a draft be incomplete", () => {
    const empty = {
      ...filled,
      role: "",
      function: "",
      description: "",
      careersUrl: "",
      closesOn: "",
      showSalary: false,
    };
    const r = checkJobPost(empty, { now });
    expect(r.ok ? [] : Object.keys(r.errors).sort()).toEqual(
      ["careersUrl", "closesOn", "description", "function", "role"].sort(),
    );
    expect(checkJobPost(empty, { now, complete: false }).ok).toBe(true);
  });

  it("checks the salary band, skills, link and the apply route", () => {
    const low = checkJobPost({ ...filled, salaryFrom: "18", salaryTo: "12" }, { now });
    expect(low.ok ? null : low.errors.salaryTo).toBe("The highest salary can't be below the lowest");
    const many = checkJobPost(
      { ...filled, skills: Array.from({ length: 9 }, (_, i) => `Skill ${String(i)}`) },
      { now },
    );
    expect(many.ok ? null : many.errors.skills).toBe("Add up to 8 skills");
    expect(checkJobPost({ ...filled, careersUrl: "http://example.org" }, { now }).ok).toBe(false);
    expect(checkJobPost({ ...filled, applyBy: "inbox" }, { now }).ok).toBe(false);
    const hidden = checkJobPost({ ...filled, showSalary: false, salaryFrom: "x" }, { now });
    expect(hidden.ok && hidden.values.salaryBand).toBeNull();
  });
});

describe("job filters (464:6071)", () => {
  it("matches experience by overlapping years", () => {
    expect(experienceFits("3–6 years", "3-6")).toBe(true);
    expect(experienceFits("5–8 years", "7-plus")).toBe(true);
    expect(experienceFits("2–4 years", "0-2")).toBe(true);
    expect(experienceFits("2–4 years", "7-plus")).toBe(false);
    expect(experienceFits(null, "0-2")).toBe(false);
  });

  it("finds student roles and writes salaries as drawn", () => {
    expect(isStudentRole({ experience: "Students" })).toBe(true);
    expect(isStudentRole({ experience: "0–2 years", jobType: "Internship" })).toBe(true);
    expect(isStudentRole({ experience: "0–2 years", jobType: "Full-time" })).toBe(false);
    expect(salaryLabel("12–18")).toBe("₹12–18 lakh a year");
    expect(salaryLabel("₹30,000 a month stipend")).toBe("₹30,000 a month stipend");
    expect(salaryLabel("")).toBeNull();
  });
});
