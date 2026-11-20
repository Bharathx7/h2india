import config from "@payload-config";
import { getPayload } from "payload";
import type { Actor as WorkflowActor } from "@/cms/workflow";
import { cmsSession } from "./session";
import { lexicalToBlocks, type BodyBlock } from "./body";

// The H2 Economy article editor's data (step 4.6): the article as our form, the choices for its pickers, and the editor
// acting, in the shape the editorial workflow (cms/workflow.ts) checks.

export interface ArticleForm {
  type: string;
  title: string;
  dek: string;
  whyItMatters: string;
  body: BodyBlock[];
  topics: number[];
  tags: number[];
  states: string[];
  featured: boolean;
  authors: number[];
  editor: number | null;
  sources: { title: string; url: string; note: string; internal: boolean }[];
  interviewee: { name: string; role: string; organisation: string };
  issuer: string;
  sponsor: { name: string; about: string; disclosure: string };
  legal: { flagged: boolean; note: string };
  seo: { title: string; description: string };
  /** The picture at the top (media library). */
  heroImage: number | null;
  /** Live explainer (801:7492, A61): updates newest first; "Publish live update" sends only this part live. */
  live: LiveForm;
}

export interface LiveForm {
  status: "off" | "live" | "ended";
  summary: string[];
  /** When the summary last changed (set by the editor when the summary is edited). */
  summaryAt: string | null;
  keyNumbers: { value: string; label: string }[];
  keyNumbersSource: string;
  meaning: string[];
  updates: { at: string; title: string; text: string; document: { title: string; url: string; note: string } }[];
}

export const EMPTY_LIVE: LiveForm = {
  status: "off",
  summary: [],
  summaryAt: null,
  keyNumbers: [],
  keyNumbersSource: "",
  meaning: [],
  updates: [],
};

export const EMPTY_ARTICLE: ArticleForm = {
  type: "news",
  title: "",
  dek: "",
  whyItMatters: "",
  body: [{ kind: "paragraph", text: "" }],
  topics: [],
  tags: [],
  states: [],
  featured: false,
  authors: [],
  editor: null,
  sources: [],
  interviewee: { name: "", role: "", organisation: "" },
  issuer: "",
  sponsor: { name: "", about: "", disclosure: "" },
  legal: { flagged: false, note: "" },
  seo: { title: "", description: "" },
  heroImage: null,
  live: EMPTY_LIVE,
};

const ids = (v: unknown): number[] =>
  Array.isArray(v)
    ? v
        .map((x) => (typeof x === "object" && x ? (x as { id: number }).id : (x as number)))
        .filter((x) => typeof x === "number")
    : [];
const s = (v: unknown) => (typeof v === "string" ? v : "");

/** The signed-in operator as the workflow sees them: their content permissions and their editor record. */
export async function editorActor(): Promise<{
  actor: WorkflowActor;
  canEdit: boolean;
  canPublish: boolean;
  canPurge: boolean;
  /** The Articles section is theirs (or they have every section). */
  inSection: boolean;
} | null> {
  const cms = await cmsSession();
  if (!cms) return null;
  return {
    actor: { editorId: cms.user.id, h2UserId: cms.userId, permissions: cms.user.permissions },
    canEdit: cms.can("content.edit") && cms.mayChange("articles"),
    canPublish: cms.can("content.publish") && cms.mayChange("articles"),
    inSection: cms.mayChange("articles"),
    canPurge: cms.can("content.purge"),
  };
}

export async function articleForm(id: number) {
  const payload = await getPayload({ config });
  const d = await payload
    .findByID({ collection: "articles", id, draft: true, depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!d) return null;
  const form: ArticleForm = {
    type: d.type,
    title: d.title,
    dek: d.dek,
    whyItMatters: s(d.whyItMatters),
    body: lexicalToBlocks(d.body),
    topics: ids(d.topics),
    tags: ids(d.tags),
    states: d.states ?? [],
    featured: Boolean(d.featured),
    authors: ids(d.authors),
    editor: typeof d.editor === "number" ? d.editor : null,
    sources: (d.sources ?? []).map((x) => ({
      title: x.title,
      url: s(x.url),
      note: s(x.note),
      internal: Boolean(x.internal),
    })),
    interviewee: {
      name: s(d.interviewee?.name),
      role: s(d.interviewee?.role),
      organisation: s(d.interviewee?.organisation),
    },
    issuer: s(d.issuer),
    sponsor: { name: s(d.sponsor?.name), about: s(d.sponsor?.about), disclosure: s(d.sponsor?.disclosure) },
    legal: { flagged: Boolean(d.legal?.flagged), note: s(d.legal?.note) },
    seo: { title: s(d.seo?.title), description: s(d.seo?.description) },
    heroImage: typeof d.heroImage === "number" ? d.heroImage : null,
    live: {
      status: d.live?.status === "live" || d.live?.status === "ended" ? d.live.status : "off",
      summary: (d.live?.summary ?? []).map((x) => x.point),
      summaryAt: d.live?.summaryAt ?? null,
      keyNumbers: (d.live?.keyNumbers ?? []).map((x) => ({ value: x.value, label: x.label })),
      keyNumbersSource: s(d.live?.keyNumbersSource),
      meaning: (d.live?.meaning ?? []).map((x) => x.point),
      updates: (d.live?.updates ?? []).map((u) => ({
        at: u.at,
        title: u.title,
        text: s(u.text),
        document: { title: s(u.document?.title), url: s(u.document?.url), note: s(u.document?.note) },
      })),
    },
  };
  return {
    form,
    meta: {
      id: d.id,
      slug: d.slug,
      workflow: d.workflow ?? "Draft",
      publishAt: d.publishAt ?? null,
      publishedAt: d.publishedAt ?? null,
      updatedAt: d.updatedAt,
      corrections: (d.corrections ?? []).map((c) => ({ date: c.date, note: c.note })),
      legalPassed: d.legal?.passedAt ?? null,
      hero: typeof d.heroImage === "number" ? d.heroImage : null,
    },
  };
}

/** The pickers' choices: topics, tags, authors, editors and the pictures in the media library. */
export async function articleChoices() {
  const payload = await getPayload({ config });
  const [topics, tags, authors, editors, media] = await Promise.all([
    payload.find({ collection: "topics", limit: 500, depth: 0, overrideAccess: true, sort: "name" }),
    payload.find({ collection: "tags", limit: 1000, depth: 0, overrideAccess: true, sort: "name" }),
    payload.find({ collection: "authors", limit: 500, depth: 0, overrideAccess: true, sort: "name" }),
    payload.find({ collection: "editors", limit: 200, depth: 0, overrideAccess: true, sort: "name" }),
    mediaChoices(payload),
  ]);
  const opt = (docs: { id: number; name?: string | null; title?: string | null }[]) =>
    docs.map((x) => ({ id: x.id, label: x.name ?? x.title ?? String(x.id) }));
  return {
    topics: opt(topics.docs),
    tags: opt(tags.docs),
    authors: opt(authors.docs),
    editors: opt(editors.docs),
    media,
  };
}

/** Pictures for Image blocks and hero pickers, newest first, labelled by their alt text. */
export async function mediaChoices(payload: Awaited<ReturnType<typeof getPayload>>) {
  const res = await payload.find({
    collection: "media",
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    sort: "-createdAt",
    select: { alt: true, filename: true },
  });
  return res.docs.map((m) => ({ id: m.id, label: m.alt || m.filename || `Picture ${String(m.id)}` }));
}
