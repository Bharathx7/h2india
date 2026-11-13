// What a person can switch on or off, per channel (577:288 company notifications, 548:8 member preferences). The
// defaults are the ticks as drawn. Account and security email can't be turned off (548:8).

export type NotifyChannel = "email" | "whatsapp" | "in_app";
export type Category = "quotes" | "orders" | "team" | "alerts" | "account";

export interface Topic {
  label: string;
  hint?: string;
  group: string;
  defaults: Record<NotifyChannel, boolean>;
  /** Channels the person can't turn off. */
  locked?: NotifyChannel[];
  /** Stopped by "Unsubscribe from everything" (548:8): newsletters, alerts and the like, not transactions. */
  marketing?: boolean;
}

const on = { email: true, whatsapp: true, in_app: true };

export const TOPICS = {
  // Buyer company notifications (577:288)
  "quote.sent": {
    group: "RFQs and quotes",
    label: "A supplier sends a quote",
    hint: "Including revised quotes",
    defaults: { email: true, whatsapp: false, in_app: true },
  },
  "quote.expiring": {
    group: "RFQs and quotes",
    label: "A quote is about to expire",
    hint: "48 hours before it ends",
    defaults: on,
  },
  "order.approval_needed": {
    group: "Orders",
    label: "An order needs your approval",
    hint: "Only if you're an Approver",
    defaults: on,
  },
  "order.status_changed": {
    group: "Orders",
    label: "An order changes status",
    hint: "Accepted, shipped, delivered",
    defaults: { email: true, whatsapp: false, in_app: true },
  },
  "payment.due": { group: "Orders", label: "A payment is due", hint: "Advance and milestone payments", defaults: on },
  "message.received": {
    group: "Messages and documents",
    label: "A supplier sends you a message",
    defaults: { email: false, whatsapp: false, in_app: true },
  },
  "invoice.ready": {
    group: "Messages and documents",
    label: "An invoice is ready",
    hint: "GST invoice from the supplier",
    defaults: { email: true, whatsapp: false, in_app: true },
  },
  // Member preferences (548:8)
  "alert.matches": {
    group: "Notifications",
    label: "Alert matches",
    hint: "When something new matches one of your alerts. How often is set on each alert.",
    defaults: on,
    marketing: true,
  },
  "follow.updates": {
    group: "Notifications",
    label: "Updates from what you follow",
    hint: "New posts from the companies, topics and states you follow.",
    defaults: { email: false, whatsapp: false, in_app: true },
    marketing: true,
  },
  "event.reminders": {
    group: "Notifications",
    label: "Event reminders",
    hint: "A day before and an hour before events you registered for.",
    defaults: on,
    marketing: true,
  },
  "account.security": {
    group: "Notifications",
    label: "Account and security",
    hint: "Sign-in codes, new devices and changes to your account. Email can't be turned off.",
    defaults: { email: true, whatsapp: false, in_app: true },
    locked: ["email"],
  },
  // Not drawn (A11): supplier verification and listing reviews (steps 8.2, 8.3), sent to the company's admins.
  "company.verification": {
    group: "Company",
    label: "Verification and listing reviews",
    hint: "Documents about to expire, badges, and decisions on your listings",
    defaults: { email: true, whatsapp: false, in_app: true },
  },
  // Not drawn: join requests and recoveries that need a company admin (A11).
  "team.requests": {
    group: "Team",
    label: "Someone asks to join or needs your approval",
    hint: "Join requests and account recoveries in your company",
    defaults: { email: true, whatsapp: false, in_app: true },
  },
} as const satisfies Record<string, Topic>;

export type TopicName = keyof typeof TOPICS;
