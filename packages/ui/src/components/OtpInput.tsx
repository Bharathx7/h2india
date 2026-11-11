"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cx } from "../lib/cx";
import { useField } from "./Field";

// Figma "OTP input" (18:142): six 48 x 56 boxes for two-step verification and email codes.
// Pasting fills every box. Digits use Heading/H2. Error: every box gets the 2 px error border.

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are filled. */
  onComplete?: (value: string) => void;
  length?: number;
  invalid?: boolean;
  disabled?: boolean;
  /** Accessible name of the group, for example "Code from your email". */
  label?: string;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  invalid,
  disabled,
  label = "One-time code",
  autoFocus,
}: OtpInputProps) {
  const field = useField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const commit = (next: string, focusIndex: number) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    refs.current[Math.min(focusIndex, length - 1)]?.focus();
    if (clean.length === length) onComplete?.(clean);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      commit(value.slice(0, index - 1) + value.slice(index), index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    commit(pasted, pasted.length);
  };

  return (
    <div role="group" aria-label={label} aria-describedby={field?.describedBy} className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={index === 0 ? field?.id : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={length}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={isInvalid || undefined}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          value={digit}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, "");
            if (!typed) {
              commit(value.slice(0, index) + value.slice(index + 1), index);
              return;
            }
            // Typing into a filled box, or autofill dropping the whole code into one box.
            commit(value.slice(0, index) + typed + value.slice(index + typed.length), index + typed.length);
          }}
          onKeyDown={(event) => {
            onKeyDown(index, event);
          }}
          onPaste={onPaste}
          onFocus={(event) => {
            event.target.select();
          }}
          className={cx(
            "h-14 w-12 rounded-control border border-input bg-page text-center type-h2 text-primary",
            "transition-[border-color,box-shadow] duration-(--motion-duration-fast) ease-standard",
            "focus-visible:outline-none focus:field-focus disabled:border-default disabled:bg-subtle disabled:text-secondary",
            isInvalid && "field-error focus:field-error-focus",
          )}
        />
      ))}
    </div>
  );
}
