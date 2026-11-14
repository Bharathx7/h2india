// The scheme eligibility checker (step 5.4, frames 749:4946 to 750:464). Six questions, as drawn; the rules live on each
// scheme record (Eligibility rules in the CMS), never here. A scheme is matched only when an editor has ticked "rules
// checked" (M25): with no checked rules, the checker says so instead of guessing. Results are indicative, never advice.
//
// Strong match: every rule the scheme sets is met by a definite answer, and the scheme is taking applications now.
// Possible match: no rule fails, but an answer is uncertain ("Not sure", "applied and waiting", another state) or the
// scheme isn't open yet (announced, next round expected). Any rule that fails, or a closed scheme, is not a match.

export const ORGANISATIONS = [
  { value: "producer", label: "Producer or project developer" },
  { value: "manufacturer", label: "Equipment manufacturer" },
  { value: "startup", label: "Start-up" },
  { value: "research", label: "Research institution or university" },
  { value: "industrial", label: "Industrial buyer or user" },
  { value: "state-agency", label: "State agency or PSU" },
  { value: "transport", label: "Transport operator" },
  { value: "other", label: "Something else" },
] as const;

export const ACTIVITIES = [
  { value: "production", label: "Hydrogen production" },
  { value: "electrolysers", label: "Electrolysers and stacks" },
  { value: "fuel-cells", label: "Fuel cells" },
  { value: "storage", label: "Storage and transport" },
  { value: "refuelling", label: "Refuelling stations" },
  { value: "industry", label: "Hydrogen use in industry" },
  { value: "research", label: "Research and testing" },
  { value: "services", label: "Services and EPC" },
] as const;

export const SIZES = [
  { value: "micro", label: "Micro (MSME registered)" },
  { value: "small", label: "Small (MSME registered)" },
  { value: "medium", label: "Medium (MSME registered)" },
  { value: "large", label: "Large" },
  { value: "not-sure", label: "Not sure" },
] as const;

export const STARTUP = [
  { value: "yes", label: "Yes, we're recognised" },
  { value: "applied", label: "We've applied and are waiting" },
  { value: "no", label: "No" },
] as const;

export const STAGES = [
  { value: "idea", label: "Idea or research" },
  { value: "pilot", label: "Pilot or prototype" },
  { value: "first-plant", label: "First commercial plant" },
  { value: "expanding", label: "Expanding an operating plant" },
] as const;

type Values<T extends readonly { value: string }[]> = T[number]["value"];
export type Organisation = Values<typeof ORGANISATIONS>;
export type Activity = Values<typeof ACTIVITIES>;
export type Size = Values<typeof SIZES>;
export type StartupStatus = Values<typeof STARTUP>;
export type Stage = Values<typeof STAGES>;

/** The six answers (questions 749:5257 to 749:6797). */
export interface Answers {
  organisation: Organisation;
  /** A state value as stored on records, for example "uttar-pradesh". */
  state: string;
  /** "We also invest in other states". */
  otherStates: boolean;
  activity: Activity;
  size: Size;
  startup: StartupStatus;
  stage: Stage;
}

/** What an editor stores on a scheme. An empty list means "any". */
export interface EligibilityRules {
  checked?: boolean | null;
  organisations?: string[] | null;
  /** State values; empty or "all-india" means any state. */
  states?: string[] | null;
  activities?: string[] | null;
  sizes?: string[] | null;
  /** True when only DPIIT-recognised start-ups can apply. */
  dpiitOnly?: boolean | null;
  stages?: string[] | null;
  /** "What to check next" (750:8), in the editor's words. */
  checkNext?: string[] | null;
}

export interface SchemeForMatching {
  id: string | number;
  /** The scheme's status as shown on its badge: Open, Closing soon, Announced, Next round expected, Closed… */
  status: string;
  rules: EligibilityRules | null | undefined;
}

export type Strength = "strong" | "possible";

export interface Match<T extends SchemeForMatching = SchemeForMatching> {
  scheme: T;
  strength: Strength;
  /** "Why it matches": one line per rule the answers meet. */
  why: string[];
  /** "What to check next": uncertain answers first, then the editor's notes. */
  checkNext: string[];
}

export interface EligibilityResult<T extends SchemeForMatching> {
  /** How many schemes have checked rules; 0 means the checker can't match anything yet (M25). */
  ruled: number;
  matches: Match<T>[];
}

const OPEN = ["Open", "Closing soon"];
const NOT_YET = ["Announced", "Next round expected", "Results declared"];

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((x) => x.value === value)?.label ?? value;

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "uttar-pradesh" → "Uttar Pradesh" (the record's state values are slugs of the GST state names). */
export function stateName(value: string): string {
  return value
    .split("-")
    .map((w) => (w === "and" ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

const set = (list: string[] | null | undefined) => (list ?? []).filter(Boolean);

type Outcome = { kind: "pass"; why: string } | { kind: "unsure"; check: string } | { kind: "fail" };

function judge(rules: EligibilityRules, a: Answers): Outcome[] {
  const out: Outcome[] = [];
  const orgs = set(rules.organisations);
  if (orgs.length) {
    out.push(
      orgs.includes(a.organisation)
        ? { kind: "pass", why: `Open to ${lower(labelOf(ORGANISATIONS, a.organisation))}s` }
        : { kind: "fail" },
    );
  }
  const states = set(rules.states).filter((s) => s !== "all-india");
  if (states.length) {
    if (states.includes(a.state)) out.push({ kind: "pass", why: `Your plant is in ${stateName(a.state)}` });
    else if (a.otherStates) {
      out.push({ kind: "unsure", check: `Whether you invest in ${states.map(stateName).join(" or ")}` });
    } else out.push({ kind: "fail" });
  }
  const activities = set(rules.activities);
  if (activities.length) {
    out.push(
      activities.includes(a.activity)
        ? { kind: "pass", why: `Your work is on ${lower(labelOf(ACTIVITIES, a.activity))}` }
        : { kind: "fail" },
    );
  }
  const sizes = set(rules.sizes);
  if (sizes.length) {
    if (a.size === "not-sure") out.push({ kind: "unsure", check: "Whether your company's size qualifies" });
    else
      out.push(
        sizes.includes(a.size)
          ? { kind: "pass", why: `Open to ${lower(labelOf(SIZES, a.size).replace(/ \(MSME registered\)/, " MSMEs"))}` }
          : { kind: "fail" },
      );
  }
  if (rules.dpiitOnly) {
    if (a.startup === "yes") out.push({ kind: "pass", why: "You're a DPIIT-recognised start-up" });
    else if (a.startup === "applied")
      out.push({ kind: "unsure", check: "Your DPIIT recognition must come through first" });
    else out.push({ kind: "fail" });
  }
  const stages = set(rules.stages);
  if (stages.length) {
    out.push(
      stages.includes(a.stage) ? { kind: "pass", why: `${labelOf(STAGES, a.stage)} projects fit` } : { kind: "fail" },
    );
  }
  return out;
}

/** Matches the answers against every scheme with checked rules. Strong matches first, then possible. */
export function matchSchemes<T extends SchemeForMatching>(answers: Answers, schemes: T[]): EligibilityResult<T> {
  const ruled = schemes.filter((s) => s.rules?.checked);
  const matches: Match<T>[] = [];
  for (const scheme of ruled) {
    if (scheme.status === "Closed") continue;
    const rules = scheme.rules as EligibilityRules;
    const outcomes = judge(rules, answers);
    if (outcomes.some((o) => o.kind === "fail")) continue;
    const why = outcomes.flatMap((o) => (o.kind === "pass" ? [o.why] : []));
    const unsure = outcomes.flatMap((o) => (o.kind === "unsure" ? [o.check] : []));
    const open = OPEN.includes(scheme.status);
    if (!open && !NOT_YET.includes(scheme.status)) continue;
    const notYet = open ? [] : ["The next round isn't open yet; set an alert for it"];
    matches.push({
      scheme,
      strength: open && unsure.length === 0 ? "strong" : "possible",
      why,
      checkNext: [...unsure, ...notYet, ...set(rules.checkNext)],
    });
  }
  matches.sort((x, y) => (x.strength === y.strength ? 0 : x.strength === "strong" ? -1 : 1));
  return { ruled: ruled.length, matches };
}

/** Reads answers from a query string, or null if any is missing or not one of the drawn options. */
export function parseAnswers(q: Record<string, string | undefined>): Answers | null {
  const pick = <V extends string>(list: readonly { value: V }[], v: string | undefined) =>
    list.find((x) => x.value === v)?.value;
  const organisation = pick(ORGANISATIONS, q.organisation);
  const activity = pick(ACTIVITIES, q.activity);
  const size = pick(SIZES, q.size);
  const startup = pick(STARTUP, q.startup);
  const stage = pick(STAGES, q.stage);
  const state = q.state && /^[a-z-]{2,60}$/.test(q.state) ? q.state : undefined;
  if (!organisation || !activity || !size || !startup || !stage || !state) return null;
  return { organisation, state, otherStates: q.otherStates === "yes", activity, size, startup, stage };
}
