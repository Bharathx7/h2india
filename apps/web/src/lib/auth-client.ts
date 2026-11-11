"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser side of sign-in (step 3.2). Talks to /api/auth on this site.
export const authClient = createAuthClient({ plugins: [emailOTPClient(), passkeyClient()] });

/** Fields our sign-in rules add to an error (packages/core/src/sign-in/hooks.ts). */
export interface SignInErrorDetail {
  code?: string;
  status?: number;
  triesLeft?: number;
  until?: string;
  retryAt?: string;
}
