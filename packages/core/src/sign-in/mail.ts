import { parseServerEnv, type ServerEnv } from "@h2india/config";
import { renderSignInCode } from "@h2india/emails";
import nodemailer, { type Transporter } from "nodemailer";
import { formatIstTime } from "../time";
import { SIGN_IN } from "./rules";

// Sends email over SMTP: Mailpit locally and in CI, the provider chosen in decision M6 on the server.

let transport: Transporter | undefined;

function getTransport(env: ServerEnv): Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return transport;
}

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
  await getTransport(env).sendMail({
    from: env.EMAIL_FROM_SECURITY ?? env.EMAIL_FROM,
    to: input.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
