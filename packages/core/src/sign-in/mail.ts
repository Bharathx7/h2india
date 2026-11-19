import { parseServerEnv } from "@h2india/config";
import { renderNoAccount, renderPasswordResetLink, renderSignInCode, renderStaffPasswordLink } from "@h2india/emails";
import { deliverEmail } from "../notify/channels";
import { formatIstTime } from "../time";
import { ACCOUNT_PAGES, SIGN_IN } from "./rules";

export async function sendSignInCode(input: { to: string; code: string; name?: string }): Promise<void> {
  const env = parseServerEnv();
  const expires = new Date(Date.now() + SIGN_IN.codeMinutes * 60_000);
  const mail = await renderSignInCode({
    appUrl: env.APP_URL,
    code: input.code,
    name: input.name,
    expiresIn: `${String(SIGN_IN.codeMinutes)} minutes`,
    expiresAt: `${formatIstTime(expires)} IST`,
  });
  await deliverEmail({
    template: "email.sign_in_code",
    event: "account.sign_in_code",
    to: input.to,
    mail,
    security: true,
  });
}

/** Instead of a code, to an email with no account: the ways to create one (public QC 2, 16 Nov 2026). */
export async function sendNoAccount(to: string): Promise<void> {
  const env = parseServerEnv();
  const link = (path: string) => `${env.APP_URL}${path}`;
  await deliverEmail({
    template: "email.no_account",
    event: "account.no_account",
    to,
    mail: await renderNoAccount(env.APP_URL, {
      email: to,
      links: {
        buyer: link(ACCOUNT_PAGES.buyer.join),
        supplier: link(ACCOUNT_PAGES.supplier.join),
        member: link(ACCOUNT_PAGES.member.join),
      },
    }),
    security: true,
  });
}

/** The back-office "set your password" link (17 Nov 2026). Only ever sent to staff; see auth.ts sendResetPassword. */
export async function sendStaffPasswordLink(input: { to: string; url: string; name?: string }): Promise<void> {
  const env = parseServerEnv();
  await deliverEmail({
    template: "email.staff_password_link",
    event: "account.staff_password_link",
    to: input.to,
    mail: await renderStaffPasswordLink(env.APP_URL, {
      url: input.url,
      name: input.name,
      minutes: SIGN_IN.passwordLinkMinutes,
    }),
    security: true,
  });
}

/** "Reset your password" for buyers, suppliers and members (A195). Staff get sendStaffPasswordLink instead. */
export async function sendPasswordResetLink(input: { to: string; url: string; name?: string }): Promise<void> {
  const env = parseServerEnv();
  await deliverEmail({
    template: "email.password_reset",
    event: "account.password_reset",
    to: input.to,
    mail: await renderPasswordResetLink(env.APP_URL, {
      url: input.url,
      name: input.name,
      minutes: SIGN_IN.passwordLinkMinutes,
    }),
    security: true,
  });
}
