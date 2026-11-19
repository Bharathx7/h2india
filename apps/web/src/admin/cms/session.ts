import config from "@payload-config";
import { getPayload } from "payload";
import { editorUserFor } from "@/cms/auth-strategy";
import { operatorSession } from "@/server/auth";

// The signed-in operator as a CMS editor (step 4.6). The native content screens call Payload's Local API as this user
// (overrideAccess: false), so every access rule and hook of the CMS applies exactly as it does at /cms.

export async function cmsSession() {
  const session = await operatorSession();
  if (!session) return null;
  const payload = await getPayload({ config });
  const user = await editorUserFor(payload, session.user);
  if (!user) return null;
  const can = (
    p: "content.view" | "content.edit" | "content.delete" | "content.publish" | "content.purge" | "settings.edit",
  ) => user.permissions.includes(p);
  return { payload, user, userId: session.user.id, can };
}
