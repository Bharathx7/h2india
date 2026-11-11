import { parseServerEnv, type ServerEnv } from "@h2india/config";
import nodemailer, { type Transporter } from "nodemailer";

// One SMTP connection for every email: Mailpit locally and in CI, the provider chosen in decision M6 on the server.

let transport: Transporter | undefined;

export function mailTransport(env: ServerEnv = parseServerEnv()): Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return transport;
}
