"use server";

import { audit, getDb } from "@h2india/core";
import { revalidatePath } from "next/cache";
import { APIError } from "payload";
import { requestContext } from "@/server/request-context";
import { isArchivable } from "@/cms/archive";
import { toStored } from "./fields";
import { contentType, settingType } from "./records";
import { cmsSession } from "./session";

// Saving content from the native editors (step 4.6). Saves run as the signed-in editor through Payload's Local API, so
// the CMS access rules, validation and hooks (search, sample, newsroom cache, tracker changes) all run as at /cms.
// Publishing and unpublishing are status changes: they are audited.

export type SaveResult = { ok: true; id: number } | { ok: false; error: string };
type Mode = "draft" | "publish" | "save";

function problem(error: unknown): { ok: false; error: string } {
  if (error instanceof Error && error.name === "ValidationError") {
    const errs = (error as Error & { data?: { errors?: { message: string; label?: string; path?: string }[] } }).data
      ?.errors;
    return {
      ok: false,
      error: errs?.length
        ? errs.map((e) => [e.label ?? e.path, e.message].filter(Boolean).join(": ")).join(". ")
        : "Check the highlighted fields.",
    };
  }
  if (error instanceof APIError || (error instanceof Error && error.name === "Forbidden")) {
    return { ok: false, error: error.message || "Your role can't do this." };
  }
  throw error;
}

export async function saveRecordAction(
  slug: string,
  id: number | null,
  values: Record<string, unknown>,
  mode: Mode,
): Promise<SaveResult> {
  const cms = await cmsSession();
  if (!cms?.can("content.edit")) return { ok: false, error: "Your role can't edit content." };
  const type = contentType(cms.payload, slug);
  if (!type || (type.upload && !id)) return { ok: false, error: "No such content." };
  const data: Record<string, unknown> = toStored(type.fields, values);
  const publish = type.drafts && mode === "publish";
  if (publish) data._status = "published";
  const draft = type.drafts && !publish;
  const common = { collection: slug as "schemes", user: cms.user, overrideAccess: false, draft } as const;
  try {
    const doc = id
      ? await cms.payload.update({ ...common, id, data: data })
      : await cms.payload.create({ ...common, data: data as never });
    if (publish) {
      await audit(getDb(), {
        actorId: cms.userId,
        action: "content.publish",
        resourceType: slug,
        resourceId: String(doc.id),
        after: { status: "published" },
        context: await requestContext(),
      });
    }
    revalidatePath(`/admin/content/${slug}`);
    return { ok: true, id: doc.id };
  } catch (e) {
    return problem(e);
  }
}

/** Takes a published record off the site: it goes back to a draft. */
export async function unpublishRecordAction(slug: string, id: number): Promise<SaveResult> {
  const cms = await cmsSession();
  if (!cms?.can("content.edit")) return { ok: false, error: "Your role can't edit content." };
  const type = contentType(cms.payload, slug);
  if (!type?.drafts) return { ok: false, error: "This content can't be unpublished." };
  try {
    await cms.payload.update({
      collection: slug as "schemes",
      id,
      data: { _status: "draft" } as never,
      user: cms.user,
      overrideAccess: false,
    });
    await audit(getDb(), {
      actorId: cms.userId,
      action: "content.unpublish",
      resourceType: slug,
      resourceId: String(id),
      before: { status: "published" },
      after: { status: "draft" },
      context: await requestContext(),
    });
    revalidatePath(`/admin/content/${slug}`);
    return { ok: true, id };
  } catch (e) {
    return problem(e);
  }
}

/**
 * Archive a record (founder QC, 17 Nov 2026): Payload's trash keeps it with a deletedAt date, so it leaves the site,
 * search and the lists, and can be restored. Needs content.delete; runs as the editor; audited with the reason.
 */
export async function archiveRecordAction(slug: string, id: number, reason: string): Promise<SaveResult> {
  const cms = await cmsSession();
  if (!cms?.can("content.delete")) return { ok: false, error: "Your role can't archive content." };
  if (typeof id !== "number" || !isArchivable(slug) || !contentType(cms.payload, slug))
    return { ok: false, error: "This content can't be archived." };
  const why = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
  if (!why) return { ok: false, error: "Say why it's archived, for the record." };
  try {
    await cms.payload.update({
      collection: slug as "schemes",
      id,
      data: { deletedAt: new Date().toISOString() },
      user: cms.user,
      overrideAccess: false,
    });
    await audit(getDb(), {
      actorId: cms.userId,
      action: "content.archive",
      resourceType: slug,
      resourceId: String(id),
      after: { archived: true },
      reason: why,
      context: await requestContext(),
    });
    revalidatePath(`/admin/content/${slug}`);
    return { ok: true, id };
  } catch (e) {
    return problem(e);
  }
}

/** Restore an archived record. It comes back as it was (a published record is on the site again). Audited. */
export async function restoreRecordAction(slug: string, id: number): Promise<SaveResult> {
  const cms = await cmsSession();
  if (!cms?.can("content.delete")) return { ok: false, error: "Your role can't restore content." };
  if (typeof id !== "number" || !isArchivable(slug) || !contentType(cms.payload, slug))
    return { ok: false, error: "This content can't be restored." };
  try {
    await cms.payload.update({
      collection: slug as "schemes",
      id,
      data: { deletedAt: null },
      trash: true,
      user: cms.user,
      overrideAccess: false,
    });
    await audit(getDb(), {
      actorId: cms.userId,
      action: "content.restore",
      resourceType: slug,
      resourceId: String(id),
      before: { archived: true },
      after: { archived: false },
      context: await requestContext(),
    });
    revalidatePath(`/admin/content/${slug}`);
    return { ok: true, id };
  } catch (e) {
    return problem(e);
  }
}

/** Saves a site setting (a Payload global) as the signed-in editor; audited, since settings drive public pages. */
export async function saveSettingAction(
  slug: string,
  values: Record<string, unknown>,
  mode: Mode,
): Promise<SaveResult> {
  const cms = await cmsSession();
  if (!cms?.can("content.edit")) return { ok: false, error: "Your role can't edit content." };
  const type = settingType(cms.payload, slug);
  if (!type) return { ok: false, error: "No such setting." };
  const data: Record<string, unknown> = toStored(type.fields, values);
  const publish = type.drafts && mode === "publish";
  if (publish) data._status = "published";
  try {
    await cms.payload.updateGlobal({
      slug: slug as "pricing",
      data: data,
      draft: type.drafts && !publish,
      user: cms.user,
      overrideAccess: false,
    });
    await audit(getDb(), {
      actorId: cms.userId,
      action: publish || !type.drafts ? "content.setting.publish" : "content.setting.draft",
      resourceType: "setting",
      resourceId: slug,
      after: data,
      context: await requestContext(),
    });
    revalidatePath(`/admin/content/settings/${slug}`);
    return { ok: true, id: 0 };
  } catch (e) {
    return problem(e);
  }
}
