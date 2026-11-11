"use client";

import { useState, type TextareaHTMLAttributes } from "react";
import { cx } from "../lib/cx";
import { boxWidth, FIELD_BOX, FIELD_CONTROL, useField } from "./Field";

// Figma "Textarea" (14:103): 128 px tall, padding 12/16, with an optional character counter.

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Show "n / maxLength" under the text. Needs maxLength. */
  showCount?: boolean;
  boxClassName?: string;
}

export function Textarea({
  invalid,
  showCount = false,
  boxClassName,
  className,
  id,
  disabled,
  required,
  maxLength,
  onChange,
  defaultValue,
  value,
  rows = 2,
  ...rest
}: TextareaProps) {
  const field = useField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const initial = String(value ?? defaultValue ?? "").length;
  const [count, setCount] = useState(initial);
  const shown = value !== undefined ? String(value).length : count;
  return (
    <div
      className={cx(FIELD_BOX, "min-h-32 flex-col gap-2 px-4 py-3", boxWidth(boxClassName), boxClassName)}
      data-invalid={isInvalid || undefined}
      data-disabled={disabled || undefined}
    >
      <textarea
        id={id ?? field?.id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={field?.describedBy}
        required={required ?? field?.required}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => {
          setCount(event.target.value.length);
          onChange?.(event);
        }}
        className={cx(FIELD_CONTROL, "flex-1 resize-y", className)}
        {...rest}
      />
      {showCount && maxLength ? (
        <span className="type-caption text-secondary" aria-live="polite">
          {shown} / {maxLength}
        </span>
      ) : null}
    </div>
  );
}
