import { parseServerEnv } from "@h2india/config";
import {
  renderChangesNeeded,
  renderEventLive,
  renderGrievance,
  renderOpsAlarm,
  renderJobLive,
  renderSubmissionReceived,
  renderWebinarRegistered,
  renderWebinarReminder,
  renderWebinarReplay,
  type GrievanceDetails,
  type SubmissionKind,
  type WebinarDetails,
} from "@h2india/emails";
import { deliverEmail, deliverWhatsApp, TemplateNotApprovedError } from "./channels";

// Webinar and submission messages (step 5.7): Webinar registration 676:83 with its reminder and replay variants,
// WhatsApp 676:405 and 676:459, and Submission received 673:352.

export type { GrievanceDetails, SubmissionKind, WebinarDetails };

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

/** Grievance acknowledgement (676:154, step 5.8): a copy when the complaint is raised, and again when acknowledged. */
export async function sendGrievance(to: Recipient, d: GrievanceDetails): Promise<void> {
  await deliverEmail({
    template: "email.grievance_acknowledgement",
    event: d.acknowledged ? "grievance.acknowledged" : "grievance.raised",
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderGrievance(appUrl(), d),
  });
}

/** Moderation outcomes (step 11.2): sent to the person who submitted, once, after the decision is recorded. */
export async function sendEventLive(to: Recipient, input: Parameters<typeof renderEventLive>[1]): Promise<void> {
  await deliverEmail({
    template: "email.event_live",
    event: "queue.event_live",
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderEventLive(appUrl(), input),
  });
}
export async function sendChangesNeeded(
  to: Recipient,
  input: Parameters<typeof renderChangesNeeded>[1],
): Promise<void> {
  await deliverEmail({
    template: "email.changes_needed",
    event: "queue.changes_needed",
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderChangesNeeded(appUrl(), input),
  });
}
export async function sendJobLive(to: Recipient, input: Parameters<typeof renderJobLive>[1]): Promise<void> {
  await deliverEmail({
    template: "email.job_live",
    event: "queue.job_live",
    userId: to.userId ?? null,
    to: to.email,
    mail: await renderJobLive(appUrl(), input),
  });
}

/** The operations alarm (step 13.3) to the on-call addresses: failing alarms, or an all-clear when the list is empty. */
export async function sendOpsAlarm(
  to: string[],
  failing: { severity: "critical" | "warning"; label: string; value: string; runbook: string }[],
): Promise<void> {
  const at = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
  const mail = await renderOpsAlarm(appUrl(), {
    failing,
    at: `${at} IST`,
    healthUrl: new URL("/admin/settings", appUrl()).toString(),
  });
  for (const address of to) await deliverEmail({ template: "email.ops_alarm", event: "ops.alarm", to: address, mail });
}
