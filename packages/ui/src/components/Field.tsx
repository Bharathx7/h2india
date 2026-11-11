"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Form field" (14:132): label above the field, required mark, helper text. The error state swaps the
// helper for an error message with an icon, so status is never shown by colour alone.

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Used by Input, Select and Textarea to pick up the id, description and error state of the surrounding field. */
export function useField(): FieldContextValue | null {
  return useContext(FieldContext);
}

export interface FormFieldProps {
  label: ReactNode;
  /** Shown under the field. Replaced by `error` when there is one. */
  helper?: ReactNode;
  /** Error message. Its presence puts the field in the error state. */
  error?: ReactNode;
  required?: boolean;
  /** Optional fixed id for the control; one is generated otherwise. */
  id?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, helper, error, required = false, id, className, children }: FormFieldProps) {
  const generated = useId();
  const controlId = id ?? `field-${generated}`;
  const messageId = `${controlId}-message`;
  const message = error ?? helper;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={controlId} className="flex gap-1 type-label text-primary">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-error">
            *
          </span>
        ) : null}
      </label>
      <FieldContext.Provider
        value={{ id: controlId, describedBy: message ? messageId : undefined, invalid: Boolean(error), required }}
      >
        {children}
      </FieldContext.Provider>
      {error ? (
        <p id={messageId} className="flex gap-1.5 type-caption text-error">
          <Icon name="alert-circle" size={16} className="mt-px" />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={messageId} className="type-caption text-secondary">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Wrapper classes shared by Input, Select and Textarea. */
export const FIELD_BOX = cx(
  "relative flex w-full rounded-control border border-input bg-page",
  "transition-[border-color,box-shadow] duration-(--motion-duration-fast) ease-standard",
  "hover:border-focus focus-within:field-focus",
  "data-invalid:field-error data-invalid:focus-within:field-error-focus",
  "data-disabled:border-default data-disabled:bg-subtle data-disabled:hover:border-default",
);

/** Classes for the bare control inside the box. */
export const FIELD_CONTROL =
  "min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none disabled:text-secondary disabled:cursor-not-allowed";
