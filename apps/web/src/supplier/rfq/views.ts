import { daysUntil } from "@h2india/core/time";

// What the supplier inbox (615:8) shows for each RFQ: which tab it sits in and the Your quote badge. Pure.

export type InboxTab = "all" | "quote" | "quoted" | "accepted" | "closed";

export interface InboxFacts {
  rfqStatus: string;
  recipient: string;
  quoteStatus: string | null;
  sentVersion: number | null;
  offerDeadline: Date | null;
  validUntil: Date | null;
}

export function inboxTab(f: InboxFacts): Exclude<InboxTab, "all"> {
  if (f.quoteStatus === "Accepted") return "accepted";
  if (f.rfqStatus === "Closed" || f.recipient === "Declined" || f.recipient === "Expired") return "closed";
  if (f.quoteStatus === "Withdrawn" || f.quoteStatus === "Not selected") return "closed";
  if (f.sentVersion !== null) return "quoted";
  return "quote";
}

export function quoteBadge(
  f: InboxFacts,
  now = new Date(),
): { label: string; tone: "neutral" | "success" | "warning" | "error" } {
  if (f.recipient === "Declined") return { label: "Declined", tone: "neutral" };
  switch (f.quoteStatus) {
    case null:
      return { label: "Not started", tone: "neutral" };
    case "Draft":
      return { label: "Draft", tone: "neutral" };
    case "Accepted":
      return { label: "Accepted", tone: "success" };
    case "Not selected":
      return { label: "Not selected", tone: "neutral" };
    case "Withdrawn":
      return { label: "Withdrawn", tone: "neutral" };
    case "Expired":
      return { label: "Expired", tone: "error" };
    default: {
      const left = f.validUntil ? daysUntil(f.validUntil.toISOString(), now) : null;
      if (left !== null && left <= 3)
        return { label: `Expires in ${String(left)} ${left === 1 ? "day" : "days"}`, tone: "warning" };
      return { label: f.quoteStatus === "Revised" ? "Revised" : "Sent", tone: "success" };
    }
  }
}

export function dueBadge(
  deadline: Date | null,
  now = new Date(),
): { label: string; tone: "neutral" | "warning" } | null {
  if (!deadline) return null;
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return null;
  const hours = ms / 3_600_000;
  if (hours < 24) return { label: `Due in ${String(Math.max(1, Math.floor(hours)))} h`, tone: "warning" };
  const days = daysUntil(deadline.toISOString(), now);
  return { label: `${String(days)} ${days === 1 ? "day" : "days"} left`, tone: "neutral" };
}
