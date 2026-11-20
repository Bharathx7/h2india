import { ALWAYS_LEGAL } from "../../cms/types";
import type { ArticleForm } from "./articles";

// Guidance for the article editor (founder, 20 Nov 2026: make the CMS easy to follow). Pure, so the checklist and the
// "next step" words are unit-tested. The checklist mirrors what the CMS itself refuses (required fields and the
// type rules in cms/collections/Articles.ts) plus the newsroom rule that every article has sources before it's
// published; "Nice to have" items never block.

export interface CheckItem {
  key: string;
  label: string;
  done: boolean;
  /** Required items block Submit for review; the rest are advice. */
  required: boolean;
}

const filled = (s: string) => s.trim().length > 0;

export function bodyWords(form: Pick<ArticleForm, "body">): number {
  return form.body
    .map((b) => ("text" in b ? b.text : "items" in b ? JSON.stringify(b.items) : ""))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function articleChecklist(form: ArticleForm): CheckItem[] {
  const items: CheckItem[] = [
    { key: "title", label: "Headline", done: filled(form.title), required: true },
    { key: "dek", label: "Standfirst (the line under the headline)", done: filled(form.dek), required: true },
    { key: "body", label: "Body text", done: bodyWords(form) > 0, required: true },
    { key: "authors", label: "At least one author", done: form.authors.length > 0, required: true },
    {
      key: "sources",
      label: "At least one source",
      done: form.sources.some((x) => filled(x.title)),
      required: true,
    },
  ];
  if (form.type === "press_release")
    items.push({ key: "issuer", label: "Who issued the press release", done: filled(form.issuer), required: true });
  if (form.type === "sponsored") {
    items.push({ key: "sponsor", label: "Sponsor's name", done: filled(form.sponsor.name), required: true });
    items.push({
      key: "disclosure",
      label: "Sponsor disclosure",
      done: filled(form.sponsor.disclosure),
      required: true,
    });
  }
  items.push(
    { key: "hero", label: "Picture at the top", done: form.heroImage !== null, required: false },
    {
      key: "topics",
      label: "A topic, so it shows in the right section",
      done: form.topics.length > 0,
      required: false,
    },
    {
      key: "seo",
      label: "Search description",
      done: filled(form.seo.description),
      required: false,
    },
  );
  return items;
}

/** What still has to be done before Submit for review. */
export function missingForReview(form: ArticleForm): string[] {
  return articleChecklist(form)
    .filter((i) => i.required && !i.done)
    .map((i) => i.label);
}

export interface NextStep {
  title: string;
  text: string;
}

/** The next step in words, for the person looking at the article now. */
export function nextStep(input: {
  status: string;
  saved: boolean;
  type: string;
  legalFlagged: boolean;
  legalPassed: boolean;
  canPublish: boolean;
}): NextStep {
  const legal = ALWAYS_LEGAL.includes(input.type) || input.legalFlagged;
  if (!input.saved)
    return { title: "Write, then save a draft", text: "Nothing goes live until it is reviewed and published." };
  switch (input.status) {
    case "Draft":
      return {
        title: "Finish the checklist, then Submit for review",
        text: "An Editor-in-chief reviews it. You can keep editing until then.",
      };
    case "In review":
      if (legal && !input.legalPassed)
        return { title: "Send to legal check", text: "This piece needs a legal check before it can be published." };
      return input.canPublish
        ? {
            title: "Publish now, or schedule it",
            text: "Pick a time in the side panel to schedule (IST), or send it back to draft.",
          }
        : { title: "Waiting for the Editor-in-chief", text: "They publish it or send it back to you." };
    case "Legal check":
      return input.canPublish
        ? { title: "Pass the legal check", text: "Or return it to the writer with what to change." }
        : { title: "In legal check", text: "The Editor-in-chief checks it, then it can be published." };
    case "Scheduled":
      return input.canPublish
        ? {
            title: "Scheduled",
            text: "It publishes on its own at the set time. Publish now or unschedule to change that.",
          }
        : { title: "Scheduled", text: "It publishes on its own at the set time." };
    case "Published":
      return input.canPublish
        ? {
            title: "Live on the site",
            text: "Fix a mistake with a correction (it is logged for readers), or unpublish it.",
          }
        : { title: "Live on the site", text: "An Editor-in-chief makes corrections to published articles." };
    default:
      return { title: input.status, text: "" };
  }
}

/** A field's value counts as filled: text with characters, a list with items, a number, a chosen record. */
export function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  if (typeof v === "boolean") return true;
  if (typeof v === "object") return "root" in v || "id" in v || Object.values(v).some(isFilled);
  return true;
}

interface FieldLike {
  name: string;
  label: string;
  kind: string;
  required: boolean;
  readOnly: boolean;
  fields?: FieldLike[];
}

/** The required fields of a record form and whether each is filled (group fields are checked inside). */
export function requiredFields(fields: FieldLike[], values: Record<string, unknown>): CheckItem[] {
  const out: CheckItem[] = [];
  for (const f of fields) {
    if (f.readOnly) continue;
    if (f.kind === "group" && f.fields) {
      const inner = (values[f.name] ?? {}) as Record<string, unknown>;
      for (const c of requiredFields(f.fields, inner))
        out.push({ ...c, key: `${f.name}.${c.key}`, label: `${f.label}: ${c.label}` });
      continue;
    }
    if (f.required) out.push({ key: f.name, label: f.label, done: isFilled(values[f.name]), required: true });
  }
  return out;
}
