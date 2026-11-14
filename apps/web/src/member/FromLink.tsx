"use client";

import { Alert } from "@h2india/ui";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { followFromLinkAction, saveFromLinkAction } from "./actions";

/**
 * Finishes a Save or Follow link (?job=slug, ?company=slug …) once the page is really opened: in an effect, so a
 * prefetch never saves anything. Then the address is cleaned and the designed confirmation shows (275:23085).
 */
export function FromLink({ kind, type, value }: { kind: "save" | "follow"; type: string; value: string }) {
  const router = useRouter();
  const path = usePathname();
  const ran = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const work = kind === "save" ? saveFromLinkAction(type, value) : followFromLinkAction(type, value);
    void work.then((r) => {
      const name = "title" in r && r.title ? r.title : "label" in r && r.label ? r.label : "";
      setMessage(
        r.ok
          ? kind === "save"
            ? `Saved to your list: ${name}`
            : `You're following ${name}`
          : "That item isn't available any more.",
      );
      router.replace(path);
      router.refresh();
    });
  }, [kind, type, value, router, path]);
  return message ? <Alert tone={message.startsWith("That") ? "warning" : "success"} title={message} live /> : null;
}
