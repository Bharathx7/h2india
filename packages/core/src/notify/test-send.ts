import { parseServerEnv } from "@h2india/config";
import { renderSample } from "@h2india/emails";
import { TEMPLATES, type TemplateEntry, type TemplateId, type TextTemplateId } from "@h2india/emails/registry";
import { schema } from "@h2india/db";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { deliverEmail, deliverSms, deliverWhatsApp } from "./channels";
import { createInApp } from "./inapp";

// /dev/messages (step 3.9): send any built template, with sample content, to yourself. Goes through the same channels,
// approval checks and delivery log as real messages, and drops a test notification in your bell.

export async function sendTestMessage(userId: string, template: TemplateId): Promise<string> {
  const [me] = await getDb()
    .select({ email: schema.users.email, mobile: schema.users.mobile })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (!me) throw new Error("Sign in first");
  const entry: TemplateEntry = TEMPLATES[template];
  const sample = await renderSample(template, parseServerEnv().APP_URL);
  if (!sample) throw new Error(`${template} is built in step ${entry.step}`);
  const base = { template, event: "test.message", userId };
  if (sample.kind === "email") {
    await deliverEmail({ ...base, to: me.email, mail: sample.mail });
  } else {
    if (!me.mobile) throw new Error("Add a mobile number to your account first");
    const send = entry.channel === "sms" ? deliverSms : deliverWhatsApp;
    await send({ ...base, template: template as TextTemplateId, to: me.mobile, data: { code: "482913" } });
  }
  await createInApp(getDb(), {
    userId,
    event: "test.message",
    category: "account",
    icon: "mail",
    title: `Test sent: ${entry.name}`,
    body: entry.channel === "email" ? `To ${me.email}` : `To ${me.mobile ?? ""}`,
    href: "/dev/messages",
    actionLabel: "Send another",
  });
  return entry.channel === "email" ? me.email : (me.mobile ?? "");
}
