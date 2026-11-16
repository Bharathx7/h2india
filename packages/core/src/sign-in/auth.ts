import { passkey } from "@better-auth/passkey";
import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, magicLink } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { sendVerifyEmail } from "../companies/notify";
import { JOIN } from "../companies/rules";
import { getDb } from "../db";
import { recoveryPlugin } from "../recovery/plugin";
import { afterSignIn, beforeSignIn } from "./hooks";
import { maySignIn } from "./accounts";
import { sendNoAccount, sendSignInCode } from "./mail";
import { normaliseEmail, SIGN_IN } from "./rules";

// Sign-in (step 3.2, ADR 0003): passkey, six-digit email code and Google, with users and sessions in our
// PostgreSQL. Server only. The web app adds its framework plugin (cookies for Next.js) through `plugins`.

export function createAuth(options: { plugins?: BetterAuthPlugin[] } = {}) {
  const env = parseServerEnv();
  const db = getDb();
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account" as const,
          },
        }
      : {};

  return betterAuth({
    appName: "H2 Economy",
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    telemetry: { enabled: false },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        passkey: schema.passkeys,
        rateLimit: schema.rateLimits,
      },
    }),
    advanced: {
      database: { generateId: () => uuidv7() },
      cookiePrefix: "h2",
      useSecureCookies: env.APP_URL.startsWith("https://"),
      defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
      ipAddress: { ipAddressHeaders: [env.AUTH_IP_HEADER] },
    },
    // Keep expired codes until they are checked, so the screen can say "expired" rather than "wrong".
    // Old rows are cleared by the scheduled clean-up (step 3.8).
    verification: { disableCleanup: true },
    session: { expiresIn: SIGN_IN.sessionDays * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    // Per IP. Offices share one IP, so these are looser than the per-email rules in hooks.ts.
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/email-otp/send-verification-otp": { window: 60, max: 10 },
        "/sign-in/email-otp": { window: 60, max: 20 },
      },
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    hooks: { before: beforeSignIn, after: afterSignIn },
    // A suspended account gets no session by any route: passkey, Google, a Join or recovery link (review H1).
    // beforeSignIn also refuses email codes early, with the message the design asks for.
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const [user] = await db
              .select({ suspendedAt: schema.users.suspendedAt })
              .from(schema.users)
              .where(eq(schema.users.id, session.userId));
            return user?.suspendedAt ? false : undefined;
          },
        },
      },
    },
    socialProviders: google,
    plugins: [
      emailOTP({
        otpLength: SIGN_IN.codeLength,
        expiresIn: SIGN_IN.codeMinutes * 60,
        allowedAttempts: SIGN_IN.wrongCodesBeforePause,
        storeOTP: "hashed",
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "sign-in") return;
          const to = normaliseEmail(email);
          // No account and no invitation: say so by email instead of sending a code (public QC 2). The page shows
          // "Check your email" either way.
          if (!(await maySignIn(db, to))) {
            await sendNoAccount(to);
            return;
          }
          const [user] = await db
            .select({ name: schema.users.name })
            .from(schema.users)
            .where(eq(schema.users.email, to));
          const first = user?.name.trim().split(/\s+/)[0];
          await sendSignInCode({ to, code: otp, name: first || undefined });
        },
      }),
      // The Verify email link of the Join flow (365:27778, decision A7). Confirms the email and signs the person in.
      magicLink({
        expiresIn: JOIN.linkHours * 60 * 60,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await sendVerifyEmail(normaliseEmail(email), url);
        },
      }),
      passkey({
        rpID: new URL(env.APP_URL).hostname,
        rpName: "H2 Economy",
        origin: env.APP_URL,
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
      }),
      recoveryPlugin(),
      ...(options.plugins ?? []),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export { SIGN_IN } from "./rules";
