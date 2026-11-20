import { schema, type Database, type Executor } from "@h2india/db";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { audit, type RequestContext } from "../audit";
import { loadActor, type Actor } from "../authz/actor";
import { attachFile, fileLink } from "../files/files";

// The profile picture (founder, 20 Nov 2026: "idk where to upload a profile picture"). One picture per person, set on
// /account for buyers, suppliers, members and staff; it shows on their own avatar (workspace frame and site header).
// The member profile uses the same picture: saving one keeps the other in step. The file goes through the normal
// upload (profile_photo kind: JPG or PNG, private, virus-checked); only the person and support can open it.

const u = schema.users;
const mp = schema.memberProfiles;

/** Sets (a newly uploaded file) or removes (null) the person's picture. The user id comes from the session. */
export async function setAccountPhoto(
  db: Database,
  userId: string,
  fileId: string | null,
  context?: RequestContext,
): Promise<void> {
  if (fileId) {
    await attachFile(db, {
      actor: await loadActor(db, userId),
      fileId,
      kind: "profile_photo",
      attachedType: "user",
      attachedId: userId,
    });
  }
  await db.transaction(async (tx) => {
    const [before] = await tx.select({ photoFileId: u.photoFileId }).from(u).where(eq(u.id, userId));
    if (!before) return;
    await tx.update(u).set({ photoFileId: fileId, updatedAt: new Date() }).where(eq(u.id, userId));
    await syncMemberPhoto(tx, userId, fileId);
    await audit(tx, {
      actorId: userId,
      action: fileId ? "account.photo_set" : "account.photo_removed",
      resourceType: "user",
      resourceId: userId,
      before: { photoFileId: before.photoFileId },
      after: { photoFileId: fileId },
      context,
    });
  });
}

/** The member profile's photo follows the account picture (when the person has a member profile). */
async function syncMemberPhoto(ex: Executor, userId: string, fileId: string | null) {
  const [profile] = await ex.select({ profile: mp.profile }).from(mp).where(eq(mp.userId, userId));
  if (!profile) return;
  const next = { ...profile.profile };
  if (fileId) next.photoFileId = fileId;
  else delete next.photoFileId;
  await ex.update(mp).set({ profile: next, updatedAt: new Date() }).where(eq(mp.userId, userId));
}

/** The member profile's photo changed (member Profile page): the account picture follows. */
export async function followMemberPhoto(ex: Executor, userId: string, fileId: string | null): Promise<void> {
  await ex.update(u).set({ photoFileId: fileId }).where(eq(u.id, userId));
}

/** A short-lived link to the person's own picture, or null when there is none (or it can't be opened). */
export async function accountPhotoUrl(db: Database, userId: string): Promise<string | null> {
  const [row] = await db.select({ photoFileId: u.photoFileId }).from(u).where(eq(u.id, userId));
  if (!row?.photoFileId) return null;
  try {
    return (await fileLink({ actor: await loadActor(db, userId), fileId: row.photoFileId })).url;
  } catch {
    return null;
  }
}

/**
 * Short-lived links to several people's pictures, for back-office lists (founder, 20 Nov 2026: the Super admin couldn't
 * see users' pictures). fileLink() checks the reader: staff with users.view may open profile photos. A picture that
 * can't be opened is simply left out, so the initials show.
 */
export async function userPhotoLinks(
  db: Database,
  actor: Actor,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(userIds)];
  if (!ids.length) return out;
  const rows = await db
    .select({ id: u.id, photoFileId: u.photoFileId })
    .from(u)
    .where(and(inArray(u.id, ids), isNotNull(u.photoFileId)));
  await Promise.all(
    rows.map(async (r) => {
      if (!r.photoFileId) return;
      try {
        out.set(r.id, (await fileLink({ actor, fileId: r.photoFileId })).url);
      } catch {
        // No access or the file is gone: initials instead.
      }
    }),
  );
  return out;
}
