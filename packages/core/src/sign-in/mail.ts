import { parseServerEnv } from "@h2india/config";
import { renderSignInCode } from "@h2india/emails";
import { deliverEmail } from "../notify/channels";
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
  await deliverEmail({
    template: "email.sign_in_code",
    event: "account.sign_in_code",
    to: input.to,
    mail,
    security: true,
  });
}
