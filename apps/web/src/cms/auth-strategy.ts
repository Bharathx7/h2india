import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import type { AuthStrategy } from "payload";
import { auth } from "@/server/auth";

// Editors sign in to the CMS with their H2 India account (step 4.1, ADR 0004): our session cookie is read here, and only
// operators with Content access get in. Their permissions (content.view/edit/delete/publish) ride on the user.

function roleOf(permissions: string[]): string {
  if (permissions.includes("content.publish")) return "Editor-in-chief";
  if (permissions.includes("content.edit")) return "Content editor";
  return "Viewer";
}

export const h2indiaStrategy: AuthStrategy = {
  name: "h2india",
  authenticate: async ({ headers, payload }) => {
    const session = await auth.api.getSession({ headers }).catch(() => null);
    if (!session) return { user: null };
    const actor = await loadActor(getDb(), session.user.id);
    // settings.edit lets a Super admin keep the Pre-launch allow-list (A44).
    const permissions = [...actor.operator].filter((p) => p.startsWith("content.") || p === "settings.edit");
    if (!permissions.includes("content.view")) return { user: null };
    const found = await payload.find({
      collection: "editors",
      where: { h2UserId: { equals: session.user.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const role = roleOf(permissions);
    const name = session.user.name || session.user.email;
    let doc = found.docs[0];
    if (!doc) {
      doc = await payload.create({
        collection: "editors",
        data: { h2UserId: session.user.id, name, email: session.user.email, role },
        overrideAccess: true,
      });
    } else if (doc.role !== role || doc.name !== name || doc.email !== session.user.email) {
      doc = await payload.update({
        collection: "editors",
        id: doc.id,
        data: { name, email: session.user.email, role },
        overrideAccess: true,
      });
    }
    return { user: { ...doc, collection: "editors", permissions } };
  },
};
