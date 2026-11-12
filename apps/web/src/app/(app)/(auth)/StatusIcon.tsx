import { cx, Icon, type IconName } from "@h2india/ui";

// The round icon at the top of the auth status screens (Done, Verify email, Join request, paused): 56 px.
const TONES = {
  neutral: "bg-subtle text-primary",
  mint: "bg-mint text-primary",
  warning: "bg-warning text-icon-warning",
  error: "bg-error text-icon-error",
} as const;

export function StatusIcon({ name, tone = "mint" }: { name: IconName; tone?: keyof typeof TONES }) {
  return (
    <span className={cx("flex size-14 items-center justify-center rounded-pill", TONES[tone])}>
      <Icon name={name} size={28} />
    </span>
  );
}
