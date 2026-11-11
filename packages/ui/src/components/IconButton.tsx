import { Slot } from "radix-ui";
import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Icon button v2" (151:96): Solid or Outline, Small 32 / Medium 40 / Large 48, Default / Hover / Pressed.

export type IconButtonStyle = "solid" | "outline";
export type IconButtonSize = "sm" | "md" | "lg";

const SIZES: Record<IconButtonSize, { cls: string; icon: number }> = {
  sm: { cls: "size-8", icon: 14 },
  md: { cls: "size-10", icon: 18 },
  lg: { cls: "size-12", icon: 22 },
};

const STYLES: Record<IconButtonStyle, string> = {
  solid: "border-transparent bg-inverse text-icon-inverse hover:bg-ink-700 active:bg-inverse",
  outline: "border-control text-icon-primary hover:border-focus hover:bg-subtle active:bg-poster",
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "style"> {
  icon: IconName;
  /** Required: the button has no visible text. */
  label: string;
  look?: IconButtonStyle;
  size?: IconButtonSize;
  asChild?: boolean;
}

export function IconButton({
  icon,
  label,
  look = "solid",
  size = "md",
  asChild = false,
  className,
  type,
  ...rest
}: IconButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      aria-label={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-pill border",
        "hover:pl-1 active:pl-0 active:pt-0.5", // hover nudges the icon right, pressed sinks it
        "transition-[background-color,border-color,padding] duration-(--motion-duration-base) ease-standard",
        "focus-visible:outline-2 focus-visible:outline-offset-0",
        "disabled:pointer-events-none disabled:opacity-40",
        SIZES[size].cls,
        STYLES[look],
        className,
      )}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...rest}
    >
      <Icon name={icon} size={SIZES[size].icon} />
    </Comp>
  );
}
