"use client";

import { Checkbox as RCheckbox, RadioGroup as RRadioGroup, Switch as RSwitch } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Checkbox" (18:69), "Radio" (18:91) and "Switch" (18:108), on Radix primitives for keyboard and
// screen-reader behaviour. Labels use Body/Default; disabled labels use text/secondary.

const LABEL = "type-body text-primary peer-disabled:text-secondary";

export interface CheckboxProps extends Omit<ComponentProps<typeof RCheckbox.Root>, "children"> {
  label: ReactNode;
}

/** Checked box is ink-900 with a white tick; the unchecked border is ink-500 so it passes 3:1. */
export function Checkbox({ label, className, id, ...rest }: CheckboxProps) {
  return (
    <label className={cx("inline-flex items-start gap-2.5", className)}>
      <RCheckbox.Root
        id={id}
        className={cx(
          "peer mt-0.75 inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-input bg-page text-icon-inverse",
          "data-[state=checked]:border-transparent data-[state=checked]:bg-inverse",
          "data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-inverse",
          "disabled:border-default disabled:bg-subtle disabled:text-icon-secondary disabled:data-[state=checked]:bg-ink-200 disabled:data-[state=indeterminate]:bg-ink-200",
        )}
        {...rest}
      >
        <RCheckbox.Indicator className="group flex">
          <Icon name="check" size={16} className="group-data-[state=indeterminate]:hidden" />
          <Icon name="minus" size={16} className="hidden group-data-[state=indeterminate]:block" />
        </RCheckbox.Indicator>
      </RCheckbox.Root>
      <span className={LABEL}>{label}</span>
    </label>
  );
}

export const RadioGroup = ({ className, ...rest }: ComponentProps<typeof RRadioGroup.Root>) => (
  <RRadioGroup.Root className={cx("flex flex-col gap-3", className)} {...rest} />
);

export interface RadioProps extends Omit<ComponentProps<typeof RRadioGroup.Item>, "children"> {
  label: ReactNode;
}

/** One option in a RadioGroup, for example the payment method at checkout. */
export function Radio({ label, className, ...rest }: RadioProps) {
  return (
    <label className={cx("inline-flex items-start gap-2.5", className)}>
      <RRadioGroup.Item
        className={cx(
          "peer mt-0.75 inline-flex size-5 shrink-0 items-center justify-center rounded-pill border-[1.5px] border-input bg-page",
          "data-[state=checked]:border-2 data-[state=checked]:border-focus",
          "disabled:border-default disabled:bg-subtle",
        )}
        {...rest}
      >
        <RRadioGroup.Indicator className="block size-2.5 rounded-pill bg-inverse in-disabled:bg-ink-200" />
      </RRadioGroup.Item>
      <span className={LABEL}>{label}</span>
    </label>
  );
}

export interface SwitchProps extends Omit<ComponentProps<typeof RSwitch.Root>, "children"> {
  label: ReactNode;
}

/** On track fresh-600 (5.42:1), off track ink-500 (5.47:1). Used for notification and admin settings. */
export function Switch({ label, className, ...rest }: SwitchProps) {
  return (
    <label className={cx("inline-flex items-start gap-3", className)}>
      <RSwitch.Root
        className={cx(
          "peer mt-px inline-flex h-6 w-10 shrink-0 items-center rounded-pill bg-ink-500 px-0.75",
          "transition-colors duration-(--motion-duration-fast) ease-standard data-[state=checked]:bg-fresh-600",
          "disabled:bg-ink-200",
        )}
        {...rest}
      >
        <RSwitch.Thumb className="block size-4.5 rounded-pill bg-page transition-transform duration-(--motion-duration-fast) ease-standard data-[state=checked]:translate-x-4" />
      </RSwitch.Root>
      <span className={LABEL}>{label}</span>
    </label>
  );
}
