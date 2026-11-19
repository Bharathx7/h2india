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
import { afterSignIn, beforeSignIn, isStaffEmail } from "./hooks";
import { maySignIn } from "./accounts";
import { sendNoAccount, sendPasswordResetLink, sendSignInCode, sendStaffPasswordLink } from "./mail";
import { normaliseEmail, PASSWORD_PAGES, SIGN_IN } from "./rules";

// Sign-in (step 3.2, ADR 0003): email and password for everyone (founder, 19 Nov 2026, A195; staff since 17 Nov 2026,
// A183), with the six-digit email code as the backup and Google. Users and sessions in our PostgreSQL. Server only.
// The web app adds its framework plugin (cookies for Next.js) through `plugins`.

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
        "/sign-in/email": { window: 60, max: 20 },
        "/request-password-reset": { window: 60, max: 10 },
        "/reset-password": { window: 60, max: 10 },
        "/change-password": { window: 60, max: 10 },
      },
    },
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    // Everyone (A195). Better Auth's public sign-up route stays off: an account gets a password only once its email is
    // proved (Join's link opened in the browser that chose the password, setPasswordFromDraft in passwords.ts; a reset
    // link; or Set your password while signed in). requireEmailVerification is a backstop: no path should leave a
    // password on an unconfirmed email, and if one did, its password would not sign in.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true,
      minPasswordLength: SIGN_IN.passwordMinLength,
      maxPasswordLength: SIGN_IN.passwordMaxLength,
      resetPasswordTokenExpiresIn: SIGN_IN.passwordLinkMinutes * 60,
      revokeSessionsOnPasswordReset: true,
      // Staff keep their back-office email; everyone else gets the reset email, landing on /reset-password whichever
      // page asked (the staff page isn't served on the public site).
      sendResetPassword: async ({ user, url }) => {
        const to = normaliseEmail(user.email);
        const name = user.name.trim().split(/\s+/)[0] || undefined;
        if (await isStaffEmail(db, to)) {
          await sendStaffPasswordLink({ to, url, name });
          return;
        }
        const link = new URL(url);
        const asked = link.searchParams.get("callbackURL") ?? "";
        if (asked !== PASSWORD_PAGES.reset && !asked.startsWith(`${PASSWORD_PAGES.reset}?`)) {
          link.searchParams.set("callbackURL", PASSWORD_PAGES.reset);
        }
        await sendPasswordResetLink({ to, url: link.toString(), name });
      },
      // The reset link was opened from the inbox, so the email is proved: an account that never opened Join's
      // confirm link can sign in with its new password.
      onPasswordReset: async ({ user }) => {
        if (user.emailVerified) return;
        await db.update(schema.users).set({ emailVerified: true }).where(eq(schema.users.id, user.id));
      },
    },
    hooks: { before: beforeSignIn, after: afterSignIn },
    // A suspended account gets no session by any route: password, Google, a Join or recovery link (review H1).
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
      // Join never makes a password login before this (A195), so there is nothing for Better Auth to remove here.
      magicLink({
        expiresIn: JOIN.linkHours * 60 * 60,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await sendVerifyEmail(normaliseEmail(email), url);
        },
      }),
      recoveryPlugin(),
      ...(options.plugins ?? []),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export { SIGN_IN } from "./rules";
