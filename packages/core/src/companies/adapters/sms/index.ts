import { parseServerEnv } from "@h2india/config";
import { mailTransport } from "../../../mail/transport";

// SMS behind one interface. The provider and its DLT templates are decision M5; until then every SMS is delivered
// to Mailpit as an email to sms-<number>@sms.h2india.local, so people and tests read it like any other message.

export interface SmsSender {
  send(message: { to: string; text: string }): Promise<void>;
}

const mailpitSms: SmsSender = {
  async send({ to, text }) {
    const env = parseServerEnv();
    const digits = to.replace(/\D/g, "");
    await mailTransport(env).sendMail({
      from: env.EMAIL_FROM,
      to: `sms-${digits}@sms.h2india.local`,
      subject: `SMS to ${to}`,
      text,
    });
  },
};

export function smsSender(): SmsSender {
  return mailpitSms;
}

/** Figma 668:194, the registered (DLT) template. */
export function verificationSms(code: string): string {
  return `${code} is your H2 India sign-in code. It expires in 10 minutes. Never share this code with anyone, including H2 India staff. -H2 India`;
}
