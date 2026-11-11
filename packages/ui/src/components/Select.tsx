"use client";

import type { SelectHTMLAttributes } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";
import { FIELD_BOX, useField } from "./Field";

// Figma "Select" (14:90): the closed trigger, 46 px with a chevron. This first version uses the browser's own
// list, which is accessible and native on phones. The searchable combobox and multi-select, which open the
// Menu component (21:372), are built with the Navigation section.

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  placeholder?: string;
  boxClassName?: string;
}

export function Select({
  invalid,
  placeholder,
  boxClassName,
  className,
  id,
  disabled,
  required,
  children,
  ...rest
}: SelectProps) {
  const field = useField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  return (
    <div
      className={cx(FIELD_BOX, "h-11.5 items-center", boxClassName)}
      data-invalid={isInvalid || undefined}
      data-disabled={disabled || undefined}
    >
      <select
        id={id ?? field?.id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        required={required ?? field?.required}
        disabled={disabled}
        className={cx(
          "h-full w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent pr-11 pl-4 type-body text-primary",
          "focus-visible:outline-none disabled:cursor-not-allowed disabled:text-secondary",
          className,
        )}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <Icon name="chevron-down" size={20} className="pointer-events-none absolute right-4 text-icon-primary" />
    </div>
  );
}
