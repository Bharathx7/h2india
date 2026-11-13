"use server";

import { getDb } from "@h2india/core";
import { ForbiddenError, loadActor } from "@h2india/core/authz";
import type { AttributeInput } from "@h2india/core/catalogue/attributes";
import {
  addAttribute,
  addCategory,
  CatalogueError,
  categoryHistory,
  duplicateCategory,
  moveAttribute,
  moveCategory,
  removeAttribute,
  renameCategory,
  setCategoryApplications,
  setCategoryHidden,
  updateAttribute,
} from "@h2india/core/catalogue/taxonomy";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";
import { historyLine, type HistoryLine } from "./format";

// Admin Catalogue (636:596, 637:417). Every action loads the operator from the session; core checks catalogue.view or
// catalogue.edit, writes the audit log with this request's IP, user agent and ID, and records the change history.

export type ActionResult<T = null> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const PAGE = "/admin/catalogue";

async function run<T>(
  work: (ctx: Awaited<ReturnType<typeof session>>) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const result = await work(await session());
    if (result.ok) revalidatePath(PAGE);
    return result;
  } catch (error) {
    if (error instanceof ForbiddenError)
      return { ok: false, errors: { _: "You don't have access to change the catalogue." } };
    if (error instanceof CatalogueError) return { ok: false, errors: { [error.field]: error.message } };
    throw error;
  }
}

async function session() {
  const s = await getSession();
  if (!s) throw new ForbiddenError("catalogue.view");
  const db = getDb();
  return { db, actor: await loadActor(db, s.user.id), context: await requestContext() };
}

const done = { ok: true as const, value: null };

export async function addAttributeAction(categoryId: string, input: AttributeInput) {
  return run(async ({ db, actor, context }) => addAttribute(db, actor, categoryId, input, { context }));
}

export async function updateAttributeAction(attributeId: string, input: AttributeInput) {
  return run(async ({ db, actor, context }) => updateAttribute(db, actor, attributeId, input, { context }));
}

export async function removeAttributeAction(attributeId: string) {
  return run(async ({ db, actor, context }) => {
    await removeAttribute(db, actor, attributeId, { context });
    return done;
  });
}

export async function moveAttributeAction(attributeId: string, direction: "up" | "down") {
  return run(async ({ db, actor, context }) => {
    await moveAttribute(db, actor, attributeId, direction, { context });
    return done;
  });
}

export async function addCategoryAction(input: { classId: string; parentId: string | null; label: string }) {
  return run(async ({ db, actor, context }) => addCategory(db, actor, input, { context }));
}

export async function renameCategoryAction(categoryId: string, label: string) {
  return run(async ({ db, actor, context }) => renameCategory(db, actor, categoryId, label, { context }));
}

export async function setCategoryHiddenAction(categoryId: string, hidden: boolean) {
  return run(async ({ db, actor, context }) => {
    await setCategoryHidden(db, actor, categoryId, hidden, { context });
    return done;
  });
}

export async function duplicateCategoryAction(categoryId: string) {
  return run(async ({ db, actor, context }) => ({
    ok: true,
    value: await duplicateCategory(db, actor, categoryId, { context }),
  }));
}

export async function moveCategoryAction(categoryId: string, classId: string) {
  return run(async ({ db, actor, context }) => moveCategory(db, actor, categoryId, classId, { context }));
}

export async function setCategoryApplicationsAction(categoryId: string, applicationIds: string[]) {
  return run(async ({ db, actor, context }) =>
    setCategoryApplications(db, actor, categoryId, applicationIds, { context }),
  );
}

/** See full history: every change to the category, newest first. */
export async function fullHistoryAction(categoryId: string): Promise<ActionResult<HistoryLine[]>> {
  try {
    const { db, actor } = await session();
    return { ok: true, value: (await categoryHistory(db, actor, categoryId, 500)).map(historyLine) };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, errors: { _: "You don't have access to the catalogue." } };
    throw error;
  }
}
