import { parseServerEnv } from "@h2india/config";
import { renderSignInCode } from "@h2india/emails";
import { mailTransport } from "../mail/transport";
import { formatIstTime } from "../time";
import { SIGN_IN } from "./rules";

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
  await mailTransport(env).sendMail({
    from: env.EMAIL_FROM_SECURITY ?? env.EMAIL_FROM,
    to: input.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
