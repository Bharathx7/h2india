import { parseServerEnv } from "@h2india/config";
import {
  renderSubmissionReceived,
  renderWebinarRegistered,
  renderWebinarReminder,
  renderWebinarReplay,
  type SubmissionKind,
  type WebinarDetails,
} from "@h2india/emails";
import { deliverEmail, deliverWhatsApp, TemplateNotApprovedError } from "./channels";

// Webinar and submission messages (step 5.7): Webinar registration 676:83 with its reminder and replay variants,
// WhatsApp 676:405 and 676:459, and Submission received 673:352.

export type { SubmissionKind, WebinarDetails };

const appUrl = () => parseServerEnv().APP_URL;

/** WhatsApp needs each template approved (A13); until then the refusal is logged and the email still goes. */
async function whatsApp(input: Parameters<typeof deliverWhatsApp>[0]): Promise<void> {
  try {
    await deliverWhatsApp(input);
  } catch (error) {
    if (!(error instanceof TemplateNotApprovedError)) throw error;
  }
}

interface Recipient {
  email: string;
  mobile?: string | null;
  userId?: string | null;
}

export async function sendWebinarRegistered(to: Recipient, d: WebinarDetails): Promise<void> {
  await deliverEmail({
    template: "email.webinar_registration",
    event: "webinar.registered",
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderWebinarRegistered(appUrl(), d),
  });
  if (to.mobile) {
    await whatsApp({
      template: "whatsapp.webinar_registration",
      event: "webinar.registered",
      userId: to.userId ?? null,
      to: to.mobile,
      data: { name: d.name.split(/\s+/)[0] ?? d.name, title: d.title, date: d.date, time: d.time.replace(" IST", "") },
    });
  }
}

export async function sendWebinarReminder(to: Recipient, d: WebinarDetails, which: "day" | "hour", startTime: string) {
  await deliverEmail({
    template: "email.webinar_registration",
    event: `webinar.reminder.${which}`,
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderWebinarReminder(appUrl(), d, which),
  });
  if (which === "hour" && to.mobile) {
    await whatsApp({
      template: "whatsapp.webinar_reminder",
      event: "webinar.reminder.hour",
      userId: to.userId ?? null,
      to: to.mobile,
      data: { name: d.name.split(/\s+/)[0] ?? d.name, title: d.title, time: startTime },
    });
  }
}

export async function sendWebinarReplay(to: Recipient, input: { name: string; title: string; url: string }) {
  await deliverEmail({
    template: "email.webinar_registration",
    event: "webinar.replay",
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderWebinarReplay(appUrl(), input),
  });
}

export async function sendSubmissionReceived(
  to: Recipient,
  input: Parameters<typeof renderSubmissionReceived>[1],
): Promise<void> {
  await deliverEmail({
    template: "email.submission_received",
    event: `submission.${input.kind}`,
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderSubmissionReceived(appUrl(), input),
  });
}
