// Article types (A28) and their labels. The label belongs to the type, so a sponsored or press-release piece can never
// be shown without it (playbook 4.1 WATCH OUT). Header variants: 437:3709 to 437:4387.

export const ARTICLE_TYPES = [
  { value: "news", label: "News", badge: null },
  { value: "analysis", label: "Analysis", badge: null },
  { value: "explainer", label: "Explainer", badge: null },
  { value: "interview", label: "Interview", badge: null },
  { value: "press_release", label: "Press release", badge: "Press release" },
  { value: "sponsored", label: "Sponsored", badge: "Sponsored" },
] as const;

export type ArticleType = (typeof ARTICLE_TYPES)[number]["value"];

/** The label a reader always sees on this type, or null. */
export function typeBadge(type: string): string | null {
  return ARTICLE_TYPES.find((t) => t.value === type)?.badge ?? null;
}

/** Sponsored and press-release pieces always need a legal check before publishing (A27). */
export const ALWAYS_LEGAL: readonly string[] = ["sponsored", "press_release"];

/** The editorial statuses (Content library 638:8, editor 639:8, calendar 626:8). */
export const WORKFLOW = ["Draft", "In review", "Legal check", "Scheduled", "Published"] as const;
export type WorkflowStatus = (typeof WORKFLOW)[number];
