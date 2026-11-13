import config from "@payload-config";
import { ALERT_TYPES, type AlertType } from "@h2india/core/alerts/rules";
import { getPayload } from "payload";
import { publicWhere } from "@/cms/sample";
import { STATE_OPTIONS } from "@/cms/records/states";
import type { AlertForm } from "./alert-actions";

// What a "Create alert" or "Track" link opens the modal with (steps 5.4 and 5.5): ?type=tenders, ?tender=slug,
// ?grant=slug, ?scheme=slug. An alert on one record goes straight to channels and frequency.

const TYPE_WORDS: Record<string, AlertType> = {
  tenders: "tenders",
  schemes: "schemes",
  grants: "grants",
  jobs: "jobs",
  news: "articles",
  articles: "articles",
  events: "events",
};

const blank = (type = ""): AlertForm => ({
  label: "",
  type,
  query: "",
  filters: {},
  channels: ["email"],
  frequency: type === "tenders" ? "daily" : "weekly",
});

export function emptyAlert(): AlertForm {
  return blank();
}

export async function prefillAlert(sp: Record<string, string | undefined>): Promise<AlertForm | null> {
  const one = sp.tender
    ? ("tenders" as const)
    : sp.scheme
      ? ("schemes" as const)
      : sp.grant
        ? ("grants" as const)
        : null;
  if (one) {
    const slug = sp.tender ?? sp.scheme ?? sp.grant ?? "";
    const p = await getPayload({ config });
    const doc = (
      await p.find({ collection: one, where: { and: [publicWhere(), { slug: { equals: slug } }] }, limit: 1, depth: 0 })
    ).docs[0];
    if (!doc) return null;
    const title = "name" in doc ? doc.name : doc.title;
    return {
      ...blank(one),
      label: `${ALERT_TYPES[one].label} · ${title}`.slice(0, 120),
      filters: { id: [String(doc.id)] },
      frequency: "instant",
    };
  }
  const type = TYPE_WORDS[sp.type ?? ""];
  if (!type) return null;
  const form = blank(type);
  if (sp.state) {
    const label = STATE_OPTIONS.find((o) => o.value === sp.state)?.label ?? sp.state;
    const field = ALERT_TYPES[type].stateField;
    if (field) form.filters = { [field]: [label] };
  }
  return form;
}
