// Notifications (step 3.9): one service for email, SMS, WhatsApp and in-app messages.
export {
  deliverEmail,
  deliverSms,
  deliverWhatsApp,
  sendDueDeliveries,
  setTemplateApproval,
  TemplateNotApprovedError,
  templateStatus,
} from "./channels";
export type { ApprovalStatus, RenderedEmail } from "./channels";
export { createInApp, KEEP_DAYS, listNotifications, markRead, pruneNotifications, unreadCount } from "./inapp";
export type { InAppInput, InboxFilter } from "./inapp";
export { notify } from "./notify";
export type { NotifyInput, Outcome } from "./notify";
export { getChoices, getNotifySettings, quietUntil, setChoices, setNotifySettings } from "./preferences";
export type { Choices, QuietSettings } from "./preferences";
export { TOPICS } from "./topics";
export type { Category, NotifyChannel, Topic, TopicName } from "./topics";
export { sendTestMessage } from "./test-send";
export { TEMPLATES } from "@h2india/emails/registry";
export type { TemplateEntry, TemplateId } from "@h2india/emails/registry";
