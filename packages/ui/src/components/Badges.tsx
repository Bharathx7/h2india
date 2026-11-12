import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Status badge" (20:96): one badge for every status in the database, using the exact status words.

export type BadgeTone = "neutral" | "progress" | "success" | "warning" | "error";

/** Status words from the Figma component description, grouped by tone. */
export const STATUS_TONE: Record<string, BadgeTone> = {
  Draft: "neutral",
  Placed: "neutral",
  Closed: "neutral",
  Expired: "neutral",
  Withdrawn: "neutral",
  Created: "neutral",
  Submitted: "progress",
  "Under review": "progress",
  Open: "progress",
  Shipped: "progress",
  Approved: "success",
  Published: "success",
  Paid: "success",
  Confirmed: "success",
  Delivered: "success",
  Accepted: "success",
  Captured: "success",
  Sent: "success",
  "Pending approval": "warning",
  "Changes requested": "warning",
  Sending: "warning",
  Rejected: "error",
  Suspended: "error",
  Cancelled: "error",
  Failed: "error",
};

const TONE: Record<BadgeTone, { box: string; text: string; icon?: IconName; dot?: string }> = {
  neutral: { box: "bg-subtle", text: "text-body", dot: "bg-ink-500" },
  progress: { box: "bg-tint", text: "text-primary", dot: "bg-fresh-600" },
  success: { box: "bg-success", text: "text-primary", icon: "check-circle" },
  warning: { box: "bg-warning", text: "text-warning", icon: "alert-triangle" },
  error: { box: "bg-error", text: "text-error", icon: "alert-circle" },
};

const ICON_COLOUR: Record<BadgeTone, string> = {
  neutral: "",
  progress: "",
  success: "text-icon-success",
  warning: "text-icon-warning",
  error: "text-icon-error",
};

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** The status word exactly as stored, for example "Under review". */
  status: string;
  /** Overrides STATUS_TONE, for components drawn with their own tone (tender and scheme cards draw Open as Success). */
  tone?: BadgeTone;
}

export function StatusBadge({ status, tone, className, ...rest }: StatusBadgeProps) {
  const t = tone ?? STATUS_TONE[status] ?? "neutral";
  const style = TONE[t];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 type-label-sm whitespace-nowrap",
        style.box,
        style.text,
        className,
      )}
      {...rest}
    >
      {style.icon ? (
        <Icon name={style.icon} size={14} className={ICON_COLOUR[t]} />
      ) : (
        <span aria-hidden="true" className={cx("size-1.5 rounded-pill", style.dot)} />
      )}
      {status}
    </span>
  );
}

// Figma "Verified badge" (20:115): trust badge. Clicking it opens the dated list of checks (Verification popover).

export type VerifiedKind = "supplier" | "gst" | "certificate";

const VERIFIED: Record<VerifiedKind, { icon: IconName; label: string }> = {
  supplier: { icon: "shield-check", label: "Verified supplier" },
  gst: { icon: "shield-check", label: "GST verified" },
  certificate: { icon: "file-text", label: "Certificate verified" },
};

export function VerifiedBadge({ kind, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { kind: VerifiedKind }) {
  const v = VERIFIED[kind];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-pill bg-tint pr-2.5 pl-2 type-label-sm whitespace-nowrap text-primary",
        className,
      )}
      {...rest}
    >
      <Icon name={v.icon} size={16} className="text-icon-link" />
      {v.label}
    </span>
  );
}

// Figma "Chip" (20:127): filter chips remove on click; category chips switch sub-categories;
// count chips show totals in tabs and navigation.

export function CountChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center rounded-pill bg-subtle px-2 type-label-sm text-primary tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
