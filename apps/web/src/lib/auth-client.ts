"use client";

import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser side of sign-in (step 3.2). Talks to /api/auth on this site. Email codes for everyone; email and password for
// staff on the back office (A183). Passkeys were removed on 17 Nov 2026.
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });

/** Fields our sign-in rules add to an error (packages/core/src/sign-in/hooks.ts). */
export interface SignInErrorDetail {
  code?: string;
  status?: number;
  triesLeft?: number;
  until?: string;
  retryAt?: string;
}
