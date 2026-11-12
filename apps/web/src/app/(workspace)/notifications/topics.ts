import type { NotifyChannel, TopicName } from "@h2india/core/notify";
import type { WorkspaceArea } from "@h2india/ui";

// Which topics each workspace shows in "Email settings", and their words (577:288 for companies, 548:8 for members).
// Mirrors TOPICS in packages/core/src/notify/topics.ts, which this browser file can't import.

export const TOPIC_LABELS: Record<TopicName, { group: string; label: string; hint?: string; locked: NotifyChannel[] }> =
  {
    "quote.sent": {
      group: "RFQs and quotes",
      label: "A supplier sends a quote",
      hint: "Including revised quotes",
      locked: [],
    },
    "quote.expiring": {
      group: "RFQs and quotes",
      label: "A quote is about to expire",
      hint: "48 hours before it ends",
      locked: [],
    },
    "order.approval_needed": {
      group: "Orders",
      label: "An order needs your approval",
      hint: "Only if you're an Approver",
      locked: [],
    },
    "order.status_changed": {
      group: "Orders",
      label: "An order changes status",
      hint: "Accepted, shipped, delivered",
      locked: [],
    },
    "payment.due": { group: "Orders", label: "A payment is due", hint: "Advance and milestone payments", locked: [] },
    "message.received": { group: "Messages and documents", label: "A supplier sends you a message", locked: [] },
    "invoice.ready": {
      group: "Messages and documents",
      label: "An invoice is ready",
      hint: "GST invoice from the supplier",
      locked: [],
    },
    "alert.matches": {
      group: "Notifications",
      label: "Alert matches",
      hint: "When something new matches one of your alerts.",
      locked: [],
    },
    "follow.updates": {
      group: "Notifications",
      label: "Updates from what you follow",
      hint: "New posts from the companies, topics and states you follow.",
      locked: [],
    },
    "event.reminders": {
      group: "Notifications",
      label: "Event reminders",
      hint: "A day before and an hour before events you registered for.",
      locked: [],
    },
    "team.requests": {
      group: "Team",
      label: "Someone asks to join or needs your approval",
      hint: "Join requests and account recoveries in your company",
      locked: [],
    },
    "account.security": {
      group: "Account",
      label: "Account and security",
      hint: "Sign-in codes, new devices and changes to your account. Email can't be turned off.",
      locked: ["email"],
    },
  };

const BY_AREA: Record<WorkspaceArea, TopicName[]> = {
  buyer: [
    "quote.sent",
    "quote.expiring",
    "order.approval_needed",
    "order.status_changed",
    "payment.due",
    "message.received",
    "invoice.ready",
    "team.requests",
    "account.security",
  ],
  supplier: ["order.status_changed", "message.received", "team.requests", "account.security"],
  member: ["alert.matches", "follow.updates", "event.reminders", "account.security"],
  admin: ["account.security"],
};

export function topicsFor(area: WorkspaceArea): TopicName[] {
  return BY_AREA[area];
}
