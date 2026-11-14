"use client";

import type { FormGuard } from "@h2india/core";
import { useRef, useState, type ReactNode } from "react";

// The browser half of public form protection (step 5.9, checkForm in @h2india/core): a hidden "website" field people
// never see or fill, and the time since the form appeared. Every public form sends guard() with its values.

export type { FormGuard };

export function useFormGuard(): { trap: ReactNode; guard: () => FormGuard } {
  // Timed from when the page started loading (a script posting straight to the server has no page at all).
  const shown = useRef<number | null>(null);
  shown.current ??= typeof performance === "undefined" ? Date.now() : performance.timeOrigin;
  const [website, setWebsite] = useState("");
  const trap = (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
          }}
        />
      </label>
    </div>
  );
  return { trap, guard: () => ({ website, elapsedMs: Date.now() - (shown.current ?? Date.now()) }) };
}
