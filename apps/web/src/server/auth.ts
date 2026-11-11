import { createAuth } from "@h2india/core/auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";

// The one sign-in instance for the web app (step 3.2). Server code only.
export const auth = createAuth({ plugins: [nextCookies()] });

/** The signed-in person for this request, or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
