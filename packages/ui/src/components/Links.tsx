import { Slot } from "radix-ui";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

interface LinkBaseProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Render the child element (for example a Next.js Link) with these styles. */
  asChild?: boolean;
  children: ReactNode;
}

/**
 * Figma "Link" (12:308): text link in fresh-600 (5.42:1 on white), fresh-700 on hover with underline,
 * Focus/Ring on keyboard focus. "Show icon" adds the arrow.
 */
export function TextLink({
  asChild,
  showIcon = true,
  className,
  children,
  ...rest
}: LinkBaseProps & { showIcon?: boolean }) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      className={cx(
        "inline-flex items-center gap-1 rounded-control type-label text-link underline-offset-4",
        "transition-colors duration-(--motion-duration-fast) ease-standard hover:text-link-hover hover:underline",
        className,
      )}
      {...rest}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      {showIcon ? <Icon name="arrow-right" size={16} /> : null}
    </Comp>
  );
}

/** Figma "Arrow link" (151:22): label and arrow; on hover the arrow moves 4 px and the colour deepens. */
export function ArrowLink({ asChild, className, children, ...rest }: LinkBaseProps) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      className={cx(
        "inline-flex items-center gap-1.5 rounded-control type-label text-link hover:gap-2.5 hover:text-link-hover",
        "transition-[color,gap] duration-(--motion-duration-base) ease-standard",
        className,
      )}
      {...rest}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      <Icon name="arrow-right" size={16} />
    </Comp>
  );
}

/**
 * Figma "Language selector" (151:135): the trigger only. Which languages exist is decision M15;
 * the menu is wired when that is answered.
 */
export function LanguageSelector({
  label = "English (India)",
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { label?: string }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-9 items-center gap-2 rounded-pill border border-default px-2.75 type-label text-primary",
        "transition-[background-color,border-color] duration-(--motion-duration-base) ease-standard hover:border-hover hover:bg-subtle",
        className,
      )}
      {...rest}
    >
      <Icon name="globe" size={16} />
      {label}
      <Icon name="chevron-down" size={16} />
    </button>
  );
}
