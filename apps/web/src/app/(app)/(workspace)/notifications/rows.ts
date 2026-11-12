import { formatIstClock, formatIstDayMonth, istDate } from "@h2india/core/companies/client";
import type { IconName } from "@h2india/ui";

// Display rows for the bell and the centre: time today ("10:06"), date before ("3 Nov"), and the day group.

export interface Row {
  id: string;
  icon: IconName;
  title: string;
  body: string | null;
  href: string | null;
  actionLabel: string | null;
  unread: boolean;
  time: string;
  group: "Today" | "Earlier this week" | "Older";
  category: string;
}

const ICONS = new Set<string>([
  "file-text",
  "clipboard-check",
  "truck",
  "shield-check",
  "alert-triangle",
  "bell",
  "users",
  "check-circle",
  "lock",
  "shopping-bag",
  "mail",
  "message-square",
  "package",
  "calendar",
  "building",
  "info",
]);

export function toRows(
  items: {
    id: string;
    icon: string;
    title: string;
    body: string | null;
    href: string | null;
    actionLabel: string | null;
    readAt: Date | null;
    visibleAt: Date;
    category: string;
  }[],
  now: Date = new Date(),
): Row[] {
  const today = istDate(now);
  return items.map((n) => {
    const day = istDate(n.visibleAt);
    const ageDays = (now.getTime() - n.visibleAt.getTime()) / 86_400_000;
    return {
      id: n.id,
      icon: (ICONS.has(n.icon) ? n.icon : "bell") as IconName,
      title: n.title,
      body: n.body,
      href: n.href,
      actionLabel: n.actionLabel,
      unread: n.readAt === null,
      time: day === today ? formatIstClock(n.visibleAt) : formatIstDayMonth(n.visibleAt),
      group: day === today ? "Today" : ageDays < 7 ? "Earlier this week" : "Older",
      category: n.category,
    };
  });
}
