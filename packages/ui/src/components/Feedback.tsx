import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Alert" (20:245): inline alert for a problem on the page; Banner for account-level states.
// One banner at a time. The icon and the words carry the tone, never colour alone.

export type AlertTone = "info" | "success" | "warning" | "error";

const ALERT: Record<AlertTone, { box: string; icon: IconName; iconColour: string; word: string }> = {
  info: { box: "bg-mint", icon: "info", iconColour: "text-icon-link", word: "Information" },
  success: { box: "bg-success", icon: "check-circle", iconColour: "text-icon-success", word: "Success" },
  warning: { box: "bg-warning", icon: "alert-triangle", iconColour: "text-icon-warning", word: "Warning" },
  error: { box: "bg-error", icon: "alert-circle", iconColour: "text-icon-error", word: "Error" },
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  layout?: "inline" | "banner";
  title: ReactNode;
  children?: ReactNode;
  /** A link or button shown after the text, styled as a link (for example <TextLink showIcon={false}>). */
  action?: ReactNode;
  /** Close button; pass a client-side handler from a client component. */
  dismiss?: ReactNode;
  /** Announce the alert when it appears (role="alert" for errors and warnings, role="status" otherwise). */
  live?: boolean;
}

export function Alert({
  tone = "info",
  layout = "inline",
  title,
  children,
  action,
  dismiss,
  live,
  className,
  ...rest
}: AlertProps) {
  const t = ALERT[tone];
  const role = live ? (tone === "error" || tone === "warning" ? "alert" : "status") : undefined;
  const banner = layout === "banner";
  return (
    <div
      role={role}
      className={cx(
        "flex items-start gap-3",
        t.box,
        banner ? "w-full px-6 py-3" : "rounded-card px-4 py-3.5",
        className,
      )}
      {...rest}
    >
      <Icon name={t.icon} size={20} label={t.word} className={cx("mt-px", t.iconColour)} />
      <div
        className={cx(
          "min-w-0 flex-1",
          banner ? "flex flex-wrap items-baseline gap-x-2 gap-y-1" : "flex flex-col gap-1",
        )}
      >
        <p className="type-label text-primary">{title}</p>
        {children ? <div className="type-body-sm text-body">{children}</div> : null}
        {action ? <div className="type-label">{action}</div> : null}
      </div>
      {dismiss}
    </div>
  );
}

// Figma "Skeleton" (20:150): loading placeholders in the final layout. Never a lone spinner for page loads.

const Bar = ({ className }: { className: string }) => (
  <span className={cx("block h-3.5 rounded-[6px] shimmer", className)} />
);

export function Skeleton({ kind = "text", className }: { kind?: "text" | "table-row" | "card"; className?: string }) {
  if (kind === "card") {
    return (
      <div
        aria-hidden="true"
        className={cx("flex flex-col gap-3 rounded-card border border-default bg-page p-4", className)}
      >
        <span className="block h-35 w-full rounded-control shimmer" />
        <Bar className="h-4 w-4/5" />
        <Bar className="w-3/5" />
      </div>
    );
  }
  if (kind === "table-row") {
    return (
      <div aria-hidden="true" className={cx("flex items-center gap-6 border-b border-default px-4 py-3.5", className)}>
        <Bar className="w-30" />
        <Bar className="w-50" />
        <Bar className="w-24" />
        <Bar className="w-20" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={cx("flex flex-col gap-2", className)}>
      <Bar className="w-full max-w-80" />
      <Bar className="w-full max-w-70" />
      <Bar className="w-full max-w-50" />
    </div>
  );
}

// Figma "Empty state" (20:338): replaces the whole table or grid, headers included. First use explains and
// offers the first action; No results offers a quote request; Error offers Try again.

export type EmptyKind = "first-use" | "no-results" | "error";

const EMPTY_ICON: Record<EmptyKind, { icon: IconName; tile: string; colour: string }> = {
  "first-use": { icon: "package", tile: "bg-tint", colour: "text-icon-primary" },
  "no-results": { icon: "search", tile: "bg-tint", colour: "text-icon-primary" },
  error: { icon: "alert-circle", tile: "bg-error", colour: "text-icon-error" },
};

export interface EmptyStateProps {
  kind?: EmptyKind;
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  /** Usually a Button: primary for first use and no results, outline for error. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ kind = "first-use", icon, title, children, action, className }: EmptyStateProps) {
  const e = EMPTY_ICON[kind];
  return (
    <div className={cx("mx-auto flex max-w-110 flex-col items-center gap-3 px-8 py-10 text-center", className)}>
      <span className={cx("flex size-14 items-center justify-center rounded-pill", e.tile)}>
        <Icon name={icon ?? e.icon} size={24} className={e.colour} />
      </span>
      <h3 className="type-h3">{title}</h3>
      {children ? <div className="type-body-sm text-body">{children}</div> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
