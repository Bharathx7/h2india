"use server";

import { checkForm, getDb, type FormGuard } from "@h2india/core";
import { identityOf } from "@h2india/core/authz";
import { askQuestion, reportListing } from "@h2india/core/products";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Ask a technical question (402:12544) and Report this listing (755:15048), step 6.4. Both are public forms: the
// server checks the form guard and rate limits first (step 5.9).

export type FormResult = { ok: true } | { ok: false; errors: Record<string, string> };

const BLOCKED: FormResult = { ok: false, errors: { _: "Please wait a moment and try again." } };

export async function askQuestionAction(input: {
  slug: string;
  question: string;
  shareCompany: boolean;
  attachments?: { fileId: string; key?: string }[];
  guard?: FormGuard;
}): Promise<FormResult> {
  const session = await getSession();
  if (!session) return { ok: false, errors: { _: "Sign in to ask the supplier a question." } };
  const context = await requestContext();
  if (!(await checkForm({ form: "product-question", ip: context.ip ?? null, guard: input.guard })).ok) return BLOCKED;
  const db = getDb();
  const company = input.shareCompany ? ((await identityOf(db, session.user.id)).company ?? null) : null;
  return askQuestion(db, {
    slug: input.slug,
    userId: session.user.id,
    question: input.question,
    companyName: company,
    attachments: input.attachments,
    context,
  });
}

export async function reportListingAction(input: {
  slug: string;
  problem: string;
  details: string;
  email: string;
  attachments?: { fileId: string; key?: string }[];
  guard?: FormGuard;
}): Promise<FormResult> {
  const context = await requestContext();
  if (!(await checkForm({ form: "listing-report", ip: context.ip ?? null, guard: input.guard })).ok) return BLOCKED;
  const session = await getSession();
  return reportListing(getDb(), { ...input, userId: session?.user.id ?? null, context });
}
