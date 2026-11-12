// Jobs (step 5.5): the options drawn on the jobs list (464:6071) and the Post a job form (467:7472), and the rules a
// posted job must meet. Posting is free and any signed-in company user may post (A68); every posted job is a draft
// until an editor publishes it, and only editors make a job Featured.

export const JOB_FUNCTIONS = [
  "Engineering",
  "Operations and maintenance",
  "Safety",
  "Research",
  "Policy and regulation",
  "Sales and business development",
] as const;

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;

export const WORK_MODES = ["On site", "Hybrid", "Remote"] as const;

/** The experience chips as drawn ("3–6 years", "Students"), each with the years it covers. */
export const EXPERIENCE = [
  { value: "Students", min: 0, max: 0 },
  { value: "0–2 years", min: 0, max: 2 },
  { value: "2–4 years", min: 2, max: 4 },
  { value: "3–6 years", min: 3, max: 6 },
  { value: "4–8 years", min: 4, max: 8 },
  { value: "5–8 years", min: 5, max: 8 },
  { value: "6–10 years", min: 6, max: 10 },
  { value: "10+ years", min: 10, max: 60 },
] as const;

/** The Experience filter on the jobs list (464:6071). */
export const EXPERIENCE_FILTERS = [
  { value: "0-2", label: "0–2 years", min: 0, max: 2 },
  { value: "3-6", label: "3–6 years", min: 3, max: 6 },
  { value: "7-plus", label: "7 years or more", min: 7, max: 60 },
] as const;

export type JobFunction = (typeof JOB_FUNCTIONS)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type Experience = (typeof EXPERIENCE)[number]["value"];

/** A job fits a filter when the years it asks for overlap the filter's range. Unknown experience never matches. */
export function experienceFits(experience: string | null | undefined, filter: string): boolean {
  const e = EXPERIENCE.find((x) => x.value === experience);
  const f = EXPERIENCE_FILTERS.find((x) => x.value === filter);
  if (!e || !f) return false;
  return e.min <= f.max && e.max >= f.min;
}

/** "Students and interns" (464:6071): internships and roles for students. */
export function isStudentRole(job: { experience?: string | null; jobType?: string | null }): boolean {
  return job.experience === "Students" || job.jobType === "Internship";
}

/** "12–18" lakh a year → "₹12–18 lakh a year"; text an editor wrote with its own ₹ is kept as written. */
export function salaryLabel(band: string | null | undefined): string | null {
  const b = band?.trim();
  if (!b) return null;
  return b.startsWith("₹") ? b : `₹${b} lakh a year`;
}

/** The limits drawn on the form (467:7472): "196 / 5,000", "Skills (up to 8)", "Up to 60 days from today". */
export const JOB_POST_LIMITS = { roleMax: 120, descriptionMax: 5000, skillsMax: 8, skillMax: 40, closingMaxDays: 60 };

export interface JobPostInput {
  role: string;
  function: string;
  jobType: string;
  experience: string;
  description: string;
  skills: string[];
  location: string;
  workMode: string;
  showSalary: boolean;
  salaryFrom: string;
  salaryTo: string;
  /** "link" only for now: applications in the H2 India inbox arrive with the supplier inbox (A70). */
  applyBy: string;
  careersUrl: string;
  /** YYYY-MM-DD, India time. */
  closesOn: string;
}

export interface JobPostValues {
  role: string;
  function: JobFunction;
  jobType: JobType;
  experience: Experience;
  description: string;
  skills: string[];
  location: string;
  workMode: WorkMode;
  salaryBand: string | null;
  sourceUrl: string;
  /** The end of the closing day in India time, as an ISO time. */
  closesAt: string;
}

export type JobPostErrors = Partial<Record<keyof JobPostInput, string>>;

const IST_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in India, YYYY-MM-DD. */
export const istToday = (now = new Date()) => IST_DAY.format(now);

/** The last day a job may close: today plus 60 days, India time. */
export function latestClosingDay(now = new Date()): string {
  return IST_DAY.format(new Date(now.getTime() + JOB_POST_LIMITS.closingMaxDays * 86_400_000));
}

const pick = <T extends string>(list: readonly T[], v: string): T | undefined => list.find((x) => x === v);

/** Checks a posted job; drafts may be incomplete, so `complete: false` only checks what was filled in. */
export function checkJobPost(
  input: JobPostInput,
  { now = new Date(), complete = true }: { now?: Date; complete?: boolean } = {},
): { ok: true; values: JobPostValues } | { ok: false; errors: JobPostErrors; values: Partial<JobPostValues> } {
  const errors: JobPostErrors = {};
  const need = (key: keyof JobPostInput, filled: boolean, message: string) => {
    if (!filled && complete) errors[key] = message;
  };
  const role = input.role.trim();
  need("role", Boolean(role), "Enter the job title");
  if (role.length > JOB_POST_LIMITS.roleMax)
    errors.role = `Keep the job title under ${String(JOB_POST_LIMITS.roleMax)} characters`;
  const fn = pick(JOB_FUNCTIONS, input.function);
  need("function", Boolean(fn), "Choose a function");
  const jobType = pick(JOB_TYPES, input.jobType);
  need("jobType", Boolean(jobType), "Choose a job type");
  const experience = EXPERIENCE.find((x) => x.value === input.experience)?.value;
  need("experience", Boolean(experience), "Choose the experience needed");
  const description = input.description.trim();
  need("description", Boolean(description), "Describe the role");
  if (description.length > JOB_POST_LIMITS.descriptionMax)
    errors.description = `Keep the description under ${JOB_POST_LIMITS.descriptionMax.toLocaleString("en-IN")} characters`;
  const skills = [...new Set(input.skills.map((x) => x.trim()).filter(Boolean))];
  if (skills.length > JOB_POST_LIMITS.skillsMax)
    errors.skills = `Add up to ${String(JOB_POST_LIMITS.skillsMax)} skills`;
  else if (skills.some((x) => x.length > JOB_POST_LIMITS.skillMax)) errors.skills = "Keep each skill short";
  const location = input.location.trim();
  need("location", Boolean(location), "Enter the city");
  const workMode = pick(WORK_MODES, input.workMode);
  need("workMode", Boolean(workMode), "Choose a work mode");

  let salaryBand: string | null = null;
  if (input.showSalary) {
    const from = Number(input.salaryFrom);
    const to = Number(input.salaryTo);
    const valid = (n: number) => Number.isFinite(n) && n > 0 && n <= 1000 && Math.round(n * 10) === n * 10;
    if (!input.salaryFrom.trim() || !valid(from)) errors.salaryFrom = "Enter the lowest salary in lakh a year";
    else if (!input.salaryTo.trim() || !valid(to)) errors.salaryTo = "Enter the highest salary in lakh a year";
    else if (to < from) errors.salaryTo = "The highest salary can't be below the lowest";
    else salaryBand = from === to ? String(from) : `${String(from)}–${String(to)}`;
  }

  if (input.applyBy !== "link") errors.applyBy = "Link to your careers page for now";
  const url = input.careersUrl.trim();
  need("careersUrl", Boolean(url), "Enter your careers page link");
  if (url && !/^https:\/\/[^\s/]+\.[^\s]+$/.test(url))
    errors.careersUrl = "Enter the full link, starting with https://";

  let closesAt: string | undefined;
  const day = input.closesOn.trim();
  need("closesOn", Boolean(day), "Choose a closing date");
  if (day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T23:59:00+05:30`)))
      errors.closesOn = "Choose a closing date";
    else if (day <= istToday(now)) errors.closesOn = "Choose a date after today";
    else if (day > latestClosingDay(now))
      errors.closesOn = `Choose a date up to ${String(JOB_POST_LIMITS.closingMaxDays)} days from today`;
    else closesAt = new Date(`${day}T23:59:00+05:30`).toISOString();
  }

  const values: Partial<JobPostValues> = {
    role,
    ...(fn ? { function: fn } : {}),
    ...(jobType ? { jobType } : {}),
    ...(experience ? { experience } : {}),
    description,
    skills: skills.slice(0, JOB_POST_LIMITS.skillsMax),
    location,
    ...(workMode ? { workMode } : {}),
    salaryBand,
    sourceUrl: url,
    ...(closesAt ? { closesAt } : {}),
  };
  if (Object.keys(errors).length) return { ok: false, errors, values };
  return { ok: true, values: values as JobPostValues };
}
