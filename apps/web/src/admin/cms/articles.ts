import config from "@payload-config";
import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { getPayload } from "payload";
import type { Actor as WorkflowActor } from "@/cms/workflow";
import { operatorSession } from "@/server/auth";
import { lexicalToBlocks, type BodyBlock } from "./body";

// The H2 India article editor's data (step 4.6): the article as our form, the choices for its pickers, and the editor
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
}

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
};

const ids = (v: unknown): number[] =>
  Array.isArray(v)
    ? v
        .map((x) => (typeof x === "object" && x ? (x as { id: number }).id : (x as number)))
        .filter((x) => typeof x === "number")
    : [];
const s = (v: unknown) => (typeof v === "string" ? v : "");

/** The signed-in operator as the workflow sees them: their content permissions and their editor record. */
export async function editorActor(): Promise<{ actor: WorkflowActor; canEdit: boolean; canPublish: boolean } | null> {
  const session = await operatorSession();
  if (!session) return null;
  const actor = await loadActor(getDb(), session.user.id);
  const permissions = [...actor.operator].filter((p) => p.startsWith("content."));
  const payload = await getPayload({ config });
  const editor = (
    await payload.find({
      collection: "editors",
      where: { h2UserId: { equals: session.user.id } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0];
  return {
    actor: { editorId: editor?.id ?? null, h2UserId: session.user.id, permissions },
    canEdit: permissions.includes("content.edit"),
    canPublish: permissions.includes("content.publish"),
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

/** The pickers' choices: topics, tags, authors and editors. */
export async function articleChoices() {
  const payload = await getPayload({ config });
  const [topics, tags, authors, editors] = await Promise.all([
    payload.find({ collection: "topics", limit: 500, depth: 0, overrideAccess: true, sort: "name" }),
    payload.find({ collection: "tags", limit: 1000, depth: 0, overrideAccess: true, sort: "name" }),
    payload.find({ collection: "authors", limit: 500, depth: 0, overrideAccess: true, sort: "name" }),
    payload.find({ collection: "editors", limit: 200, depth: 0, overrideAccess: true, sort: "name" }),
  ]);
  const opt = (docs: { id: number; name?: string | null; title?: string | null }[]) =>
    docs.map((x) => ({ id: x.id, label: x.name ?? x.title ?? String(x.id) }));
  return { topics: opt(topics.docs), tags: opt(tags.docs), authors: opt(authors.docs), editors: opt(editors.docs) };
}
