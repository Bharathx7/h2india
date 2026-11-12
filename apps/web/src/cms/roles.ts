import type { Access, FieldAccess, PayloadRequest } from "payload";

// Who may do what in the CMS (step 4.1, A26): operator permissions from our authorisation (step 3.4), copied onto the
// signed-in editor by the sign-in strategy. Content editors write; only content.publish may publish (an
// Editor-in-chief or a Super admin).

export interface EditorUser {
  id: string | number;
  collection: "editors";
  permissions?: string[];
}

export function editorOf(req: Pick<PayloadRequest, "user">): EditorUser | null {
  const user = req.user as EditorUser | null | undefined;
  return user?.collection === "editors" ? user : null;
}

export function has(req: Pick<PayloadRequest, "user">, permission: string): boolean {
  return editorOf(req)?.permissions?.includes(permission) ?? false;
}

export const canView: Access = ({ req }) => has(req, "content.view");
export const canEdit: Access = ({ req }) => has(req, "content.edit");
export const canDelete: Access = ({ req }) => has(req, "content.delete");
export const canPublish = (req: Pick<PayloadRequest, "user">) => has(req, "content.publish");

/** Published documents are public; drafts only for editors. */
export const publishedOrEditor: Access = ({ req }) =>
  has(req, "content.view") ? true : { _status: { equals: "published" } };

export const editorsOnly: FieldAccess = ({ req }) => has(req, "content.view");
