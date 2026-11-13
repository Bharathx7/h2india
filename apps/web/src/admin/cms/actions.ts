"use server";

import config from "@payload-config";
import { revalidatePath } from "next/cache";
import { APIError, getPayload } from "payload";
import { RULES, transitionArticle, type Action } from "@/cms/workflow";
import { ARTICLE_TYPES } from "@/cms/types";
import { editorActor, type ArticleForm } from "./articles";
import { blocksToLexical } from "./body";
import type { Article } from "@/payload-types";

// Saving an article from the H2 India editor (step 4.6). Saving always writes a draft version; publishing and every
// other status change goes through the editorial workflow (transitionArticle), which checks the rule and the role.

export type ArticleResult = { ok: true; id: number } | { ok: false; error: string };

const clean = (s: string) => s.trim();

function data(form: ArticleForm) {
  if (!ARTICLE_TYPES.some((t) => t.value === form.type)) throw new APIError("Pick a type.", 400, null, true);
  return {
    type: form.type as Article["type"],
    title: clean(form.title),
    dek: clean(form.dek),
    whyItMatters: clean(form.whyItMatters) || null,
    body: blocksToLexical(form.body) as unknown as Article["body"],
    topics: form.topics,
    tags: form.tags,
    states: form.states,
    featured: form.featured,
    authors: form.authors,
    editor: form.editor,
    sources: form.sources
      .filter((x) => x.title.trim() || x.url.trim())
      .map((x) => ({
        title: clean(x.title),
        url: clean(x.url) || null,
        note: clean(x.note) || null,
        internal: x.internal,
      })),
    interviewee: form.interviewee,
    issuer: clean(form.issuer) || null,
    sponsor: form.sponsor,
    legal: { flagged: form.legal.flagged, note: clean(form.legal.note) || null },
    seo: { title: clean(form.seo.title) || null, description: clean(form.seo.description) || null },
  };
}

const fail = (error: unknown): { ok: false; error: string } => {
  if (error instanceof APIError) return { ok: false, error: error.message };
  if (error instanceof Error && error.name === "ValidationError") {
    const errs = (error as Error & { data?: { errors?: { message: string; label?: string; path?: string }[] } }).data
      ?.errors;
    return {
      ok: false,
      error: errs?.length
        ? errs.map((e) => `${e.label ?? e.path ?? ""}: ${e.message}`).join(". ")
        : "Check the fields.",
    };
  }
  throw error;
};

/** Save draft: creates the article on its first save, then saves a new draft version. */
export async function saveArticleAction(id: number | null, form: ArticleForm): Promise<ArticleResult> {
  const who = await editorActor();
  if (!who?.canEdit) return { ok: false, error: "Your role can't edit articles." };
  if (!form.title.trim()) return { ok: false, error: "Add a headline before saving." };
  const payload = await getPayload({ config });
  try {
    const values = data(form) as unknown as Article;
    const doc = id
      ? await payload.update({ collection: "articles", id, data: values, draft: true, overrideAccess: true })
      : await payload.create({
          collection: "articles",
          data: {
            ...values,
            editor: values.editor ?? (typeof who.actor.editorId === "number" ? who.actor.editorId : null),
          },
          draft: true,
          overrideAccess: true,
        });
    revalidatePath("/admin/content");
    return { ok: true, id: doc.id };
  } catch (e) {
    return fail(e);
  }
}

/** A workflow button: Submit for review, Send to legal, Pass legal, Schedule, Publish, Unpublish, Back to draft. */
export async function moveArticleAction(
  id: number,
  action: Action,
  opts: { publishAt?: string; note?: string } = {},
): Promise<ArticleResult> {
  if (!(action in RULES)) return { ok: false, error: "Unknown action." };
  const who = await editorActor();
  if (!who) return { ok: false, error: "Sign in again." };
  const payload = await getPayload({ config });
  try {
    await transitionArticle(payload, { id, action, actor: who.actor, ...opts });
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/articles/${String(id)}`);
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}
