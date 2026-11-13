import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import type { AuthStrategy, Payload } from "payload";
import type { Editor } from "@/payload-types";
import { auth } from "@/server/auth";

// Editors sign in to the CMS with their H2 India account (step 4.1, ADR 0004): our session cookie is read here, and only
// operators with Content access get in. Their permissions (content.view/edit/delete/publish) ride on the user.

function roleOf(permissions: string[]): string {
  if (permissions.includes("content.publish")) return "Editor-in-chief";
  if (permissions.includes("content.edit")) return "Content editor";
  return "Viewer";
}

/** The editor record and CMS permissions for an H2 India user, made on first use; null without Content access. */
export async function editorUserFor(
  payload: Payload,
  user: { id: string; name?: string | null; email: string },
): Promise<(Editor & { collection: "editors"; permissions: string[] }) | null> {
  const actor = await loadActor(getDb(), user.id);
  // settings.edit lets a Super admin keep the Pre-launch allow-list (A44).
  const permissions = [...actor.operator].filter((p) => p.startsWith("content.") || p === "settings.edit");
  if (!permissions.includes("content.view")) return null;
  const found = await payload.find({
    collection: "editors",
    where: { h2UserId: { equals: user.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const role = roleOf(permissions);
  const name = user.name || user.email;
  let doc = found.docs[0];
  if (!doc) {
    doc = await payload.create({
      collection: "editors",
      data: { h2UserId: user.id, name, email: user.email, role },
      overrideAccess: true,
    });
  } else if (doc.role !== role || doc.name !== name || doc.email !== user.email) {
    doc = await payload.update({
      collection: "editors",
      id: doc.id,
      data: { name, email: user.email, role },
      overrideAccess: true,
    });
  }
  return { ...doc, collection: "editors", permissions };
}

export const h2indiaStrategy: AuthStrategy = {
  name: "h2india",
  authenticate: async ({ headers, payload }) => {
    const session = await auth.api.getSession({ headers }).catch(() => null);
    if (!session) return { user: null };
    return { user: await editorUserFor(payload, session.user) };
  },
};
