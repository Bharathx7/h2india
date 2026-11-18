"use server";

import { getSession } from "@/server/auth";
import { siteViewer } from "@/server/site";

/** After a test account signs in: its own workspace (buyer, supplier or member), never the back office. */
export async function testerLanding(): Promise<string> {
  const session = await getSession();
  if (!session) return "/sign-in/test";
  const viewer = await siteViewer();
  return viewer && !viewer.operator ? viewer.user.workspaceHref : "/";
}
