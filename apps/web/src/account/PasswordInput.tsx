"use client";

import { Icon, Input } from "@h2india/ui";
import { useState } from "react";

/**
 * A password box with Show password (the eye toggles; the button says which way). Used by every password form: sign-in,
 * Join, reset, set and change password (A183, A195).
 */
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  name = "password",
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  name?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      type={shown ? "text" : "password"}
      name={name}
      autoComplete={autoComplete}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      trailing={
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => {
            setShown((s) => !s);
          }}
          className="flex size-8 cursor-pointer items-center justify-center rounded-control text-icon-secondary hover:bg-subtle"
        >
          <Icon name="eye" size={20} />
        </button>
      }
    />
  );
}
