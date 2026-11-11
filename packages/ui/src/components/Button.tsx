import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Button v2" (150:608): 6 variants x 3 sizes x 5 states = 90 frames, expressed as props.
// States come from CSS: hover, pressed (:active), focus (:focus-visible), disabled.

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "inverse" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const BASE = cx(
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-pill border select-none",
  "gap-2 hover:gap-3 active:gap-2 active:pt-0.5", // hover nudges the arrow 4 px; pressed sinks the content 1 px
  "transition-[background-color,border-color,box-shadow,gap,padding] duration-(--motion-duration-base) ease-standard",
  "focus-visible:outline-2 focus-visible:outline-offset-0", // Focus: 2 px border/focus outside the pill
  "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
);

// Every variant has a 1 px border (transparent unless Figma shows a stroke), so sizes never shift.
// Padding is 1 px less than Figma because the CSS border sits inside the box (Figma strokes do not take space).
const SIZES: Record<ButtonSize, { cls: string; icon: number }> = {
  sm: { cls: "h-8 px-3.25 type-label", icon: 16 },
  md: { cls: "h-10 px-4.25 type-label", icon: 18 },
  lg: { cls: "h-12 px-5.75 type-label-lg", icon: 20 },
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-accent text-primary hover:border-fresh-600 hover:shadow-soft active:shadow-none",
  secondary:
    "border-transparent bg-inverse text-inverse hover:bg-ink-700 hover:shadow-soft active:bg-inverse active:shadow-none",
  outline: "border-control text-primary hover:border-focus hover:bg-subtle active:bg-poster",
  ghost: "border-transparent text-primary hover:bg-subtle active:bg-poster",
  inverse: "border-transparent bg-page text-primary hover:bg-mint active:bg-tint",
  destructive: "border-transparent bg-error-strong text-inverse hover:shadow-soft",
};

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function buttonClasses({ variant = "primary", size = "md" }: ButtonStyleProps = {}): string {
  return cx(BASE, SIZES[size].cls, VARIANTS[variant]);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  /** Figma "Show leading icon" + "Leading icon". */
  leadingIcon?: IconName;
  /** Figma "Show arrow": a trailing arrow that nudges on hover. */
  arrow?: boolean;
  /** Render the child element (for example a Next.js Link) with button styling. */
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  arrow = false,
  asChild = false,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const iconSize = SIZES[size].icon;
  return (
    <Comp
      className={cx(buttonClasses({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...rest}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={iconSize} /> : null}
      <Slot.Slottable>{children}</Slot.Slottable>
      {arrow ? <Icon name="arrow-right" size={iconSize} /> : null}
    </Comp>
  );
}
