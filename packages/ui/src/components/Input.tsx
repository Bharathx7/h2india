"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";
import { boxWidth, FIELD_BOX, FIELD_CONTROL, useField } from "./Field";

// Figma "Input" (14:73): 46 px. Covers text, search (leading icon), units (suffix kW, bar, Nm³/h),
// INR (prefix ₹), phone (prefix +91), GSTIN and PIN.

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  leadingIcon?: IconName;
  /** Text before the value, for example ₹ or +91. */
  prefix?: string;
  /** Text after the value, for example kW, bar or Nm³/h. */
  suffix?: string;
  /** Element at the end, for example a clear button. */
  trailing?: ReactNode;
  invalid?: boolean;
  /** Classes for the outer box. */
  boxClassName?: string;
}

export function Input({
  leadingIcon,
  prefix,
  suffix,
  trailing,
  invalid,
  boxClassName,
  className,
  id,
  disabled,
  required,
  ...rest
}: InputProps) {
  const field = useField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  return (
    <div
      className={cx(FIELD_BOX, "h-11.5 items-center gap-2 px-4", boxWidth(boxClassName), boxClassName)}
      data-invalid={isInvalid || undefined}
      data-disabled={disabled || undefined}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={20} className="text-icon-secondary" /> : null}
      {prefix ? <span className="type-body text-secondary">{prefix}</span> : null}
      <input
        id={id ?? field?.id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        required={required ?? field?.required}
        disabled={disabled}
        className={cx(FIELD_CONTROL, "h-full truncate", className)}
        {...rest}
      />
      {suffix ? <span className="type-body text-secondary">{suffix}</span> : null}
      {trailing}
    </div>
  );
}
