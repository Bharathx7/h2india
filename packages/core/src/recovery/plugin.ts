import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { claimRecoverySession, RecoveryError } from "./recovery";

// Signs a person in once they have given both recovery proofs (step 3.5). The token is the server-side recovery
// cookie; it works once.
export function recoveryPlugin() {
  return {
    id: "h2-recovery",
    endpoints: {
      recoverySession: createAuthEndpoint(
        "/recovery/session",
        { method: "POST", body: z.object({ token: z.string().min(16) }) },
        async (ctx) => {
          let userId: string;
          try {
            userId = await claimRecoverySession(ctx.body.token);
          } catch (error) {
            if (error instanceof RecoveryError)
              throw new APIError("BAD_REQUEST", { code: error.code, message: error.message });
            throw error;
          }
          const session = await ctx.context.internalAdapter.createSession(userId);
          const user = await ctx.context.internalAdapter.findUserById(userId);
          if (!user) throw new APIError("BAD_REQUEST", { code: "NOT_FOUND", message: "No such account" });
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ ok: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
