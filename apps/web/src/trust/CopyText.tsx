"use client";

import { Icon } from "@h2india/ui";
import { useState } from "react";

/** "Copy boilerplate" (741:6058). */
export function CopyText({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 self-start type-label-sm text-primary hover:underline"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
        });
      }}
    >
      <Icon name="copy" size={14} /> {done ? "Copied" : label}
      <span className="sr-only" aria-live="polite">
        {done ? "Copied to the clipboard" : ""}
      </span>
    </button>
  );
}
