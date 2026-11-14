import { getDb } from "@h2india/core";
import { viewAsGrant } from "@h2india/core/admin/users";
import { createAuth } from "@h2india/core/auth";
import { nextCookies } from "better-auth/next-js";
import { cookies, headers } from "next/headers";

// The one sign-in instance for the web app (step 3.2). Server code only.
export const auth = createAuth({ plugins: [nextCookies()] });

/** The read-only View as cookie (step 11.4). The proxy refuses every write while it is set. */
export const VIEW_AS_COOKIE = "h2_view_as";

async function realSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * The signed-in person for this request, or null. While an operator views as someone (657:486), pages see that person,
 * read-only: the proxy refuses every write, and the grant expires in minutes.
 */
export async function getSession() {
  const session = await realSession();
  if (!session) return null;
  const token = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!token) return session;
  const grant = await viewAsGrant(getDb(), token, session.user.id);
  if (!grant) return session;
  return {
    session: { ...session.session, userId: grant.grant.userId },
    user: { ...session.user, id: grant.grant.userId, name: grant.name, email: grant.email },
  };
}

/** The operator's own session, never the viewed person's (admin screens and ending view-as). */
export async function operatorSession() {
  return realSession();
}
