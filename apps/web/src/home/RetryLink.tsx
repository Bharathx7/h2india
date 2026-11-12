"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** "Try again" on a module error: reloads the page's data without a full reload. */
export function RetryLink() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(() => {
          router.refresh();
        });
      }}
      className="type-label text-link underline underline-offset-4 hover:text-link-hover disabled:opacity-40"
    >
      {pending ? "Trying again…" : "Try again"}
    </button>
  );
}
