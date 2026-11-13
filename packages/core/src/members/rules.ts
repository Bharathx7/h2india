// Member onboarding and follows (steps 7.1, 7.2). Pure and safe in the browser.

/** 1 · Pick your persona (531:9). */
export const PERSONAS = [
  { value: "enthusiast", label: "Enthusiast", text: "Curious about hydrogen and following the industry.", icon: "zap" },
  { value: "student", label: "Student", text: "Studying, and looking for courses and internships.", icon: "file-text" },
  {
    value: "researcher",
    label: "Researcher",
    text: "Working in a lab or institute, publishing and collaborating.",
    icon: "bar-chart",
  },
  {
    value: "professional",
    label: "Professional or expert",
    text: "Working in the industry, and open to speaking or consulting.",
    icon: "user",
  },
] as const;
export type Persona = (typeof PERSONAS)[number]["value"];

/**
 * 2 · Topics (531:101), and what each covers: newsroom topic slugs, words matched in titles and categories, and the
 * kinds of records (tender, scheme, grant, job) it brings to the feed and to alerts.
 */
export const TOPICS = [
  { value: "electrolysers", label: "Electrolysers", news: ["technology"], words: ["electrolys"], kinds: [] },
  { value: "fuel-cells", label: "Fuel cells", news: [], words: ["fuel cell"], kinds: [] },
  { value: "green-ammonia", label: "Green ammonia", news: ["green-ammonia"], words: ["ammonia"], kinds: [] },
  {
    value: "mobility",
    label: "Hydrogen mobility",
    news: ["mobility"],
    words: ["mobility", "refuelling", "bus", "truck"],
    kinds: [],
  },
  {
    value: "storage-transport",
    label: "Storage and transport",
    news: [],
    words: ["storage", "cylinder", "pipeline", "transport"],
    kinds: [],
  },
  {
    value: "policy-schemes",
    label: "Policy and schemes",
    news: ["policy"],
    words: ["policy", "scheme", "mission"],
    kinds: ["scheme"],
  },
  { value: "tenders", label: "Tenders", news: ["tenders-awards"], words: ["tender", "bid"], kinds: ["tender"] },
  { value: "research", label: "Research and patents", news: [], words: ["research", "patent"], kinds: ["grant"] },
  {
    value: "safety-standards",
    label: "Safety and standards",
    news: [],
    words: ["safety", "standard", "peso"],
    kinds: [],
  },
  { value: "jobs", label: "Jobs", news: [], words: [], kinds: ["job"] },
] as const;
export type Topic = (typeof TOPICS)[number]["value"];

/** 2 · States (531:101) as drawn; "All of India" follows national news only. */
export const STATES = [
  "Gujarat",
  "Maharashtra",
  "Tamil Nadu",
  "Karnataka",
  "Odisha",
  "Andhra Pradesh",
  "Rajasthan",
  "Kerala",
  "All of India",
] as const;

export const FOLLOW_TYPES = ["topic", "state", "company", "scheme", "tender", "event", "person"] as const;
export type FollowType = (typeof FOLLOW_TYPES)[number];

export interface FollowTarget {
  targetType: FollowType;
  targetId: string;
  label: string;
  href?: string | null;
}

export const topicLabel = (value: string) => TOPICS.find((t) => t.value === value)?.label ?? value;

export interface SuggestedAlert {
  key: string;
  label: string;
  detail: string;
  indexUid: "tenders" | "schemes" | "grants" | "jobs" | "articles";
  query: string;
  filters: Record<string, string[]>;
  frequency: "instant" | "daily" | "weekly";
  /** On by default in step 3 (531:178). */
  on: boolean;
}

/**
 * 3 · Suggested alerts (531:178) from the persona and topics: researchers get research calls and grants (instant),
 * the tenders and jobs topics their own alerts, and the other topics one weekly news digest.
 */
export function suggestAlerts(persona: string | null, topics: readonly string[]): SuggestedAlert[] {
  const out: SuggestedAlert[] = [];
  if (persona === "researcher" || topics.includes("research")) {
    out.push({
      key: "grants",
      label: "Research calls and grants",
      detail: "Matches calls for researchers · instant email",
      indexUid: "grants",
      query: "",
      filters: {},
      frequency: "instant",
      on: true,
    });
  }
  if (topics.includes("tenders")) {
    out.push({
      key: "tenders",
      label: "New hydrogen tenders",
      detail: "Daily email",
      indexUid: "tenders",
      query: "",
      filters: {},
      frequency: "daily",
      on: true,
    });
  }
  if (topics.includes("policy-schemes")) {
    out.push({
      key: "schemes",
      label: "Scheme updates",
      detail: "Weekly email digest",
      indexUid: "schemes",
      query: "",
      filters: {},
      frequency: "weekly",
      on: false,
    });
  }
  if (topics.includes("jobs") || persona === "student") {
    out.push({
      key: "jobs",
      label: "New jobs and internships",
      detail: "Weekly email digest",
      indexUid: "jobs",
      query: "",
      filters: {},
      frequency: "weekly",
      on: persona === "student",
    });
  }
  const news = topics.filter((t) => !["tenders", "jobs", "policy-schemes"].includes(t));
  if (news.length) {
    const labels = news.map(topicLabel);
    const words = news.flatMap((t) => TOPICS.find((x) => x.value === t)?.words ?? []);
    out.push({
      key: "news",
      label: `News · ${labels.length > 2 ? `${labels.slice(0, 2).join(", ")} and more` : labels.join(" and ")}`,
      detail: "Weekly email digest",
      indexUid: "articles",
      query: words.join(" "),
      filters: {},
      frequency: "weekly",
      on: false,
    });
  }
  return out;
}

/** Manage follows levels (543:8), safe in the browser. */
export const FOLLOW_LEVEL_OPTIONS = [
  { value: "all", label: "All updates" },
  { value: "digest", label: "Digest only" },
  { value: "none", label: "None" },
] as const;
