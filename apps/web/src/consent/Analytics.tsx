"use client";

import { analyticsAllowed } from "@h2india/core/consent/cookies";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCookieChoice } from "./store";

// Loads the analytics script only after the visitor accepts analytics, and never for operators (step 5.9). The tool
// is M10: until NEXT_PUBLIC_ANALYTICS_SRC is set, no script loads; first-party page counts stand in (A176): one beacon
// per page with only its path, to /api/v1/pageview.

const SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC;

export function Analytics({ operator }: { operator: boolean }) {
  const choice = useCookieChoice();
  const allowed = choice !== undefined && analyticsAllowed(choice, { operator });
  const path = usePathname();
  useEffect(() => {
    if (!allowed || !path) return;
    const body = JSON.stringify({ path });
    if (!navigator.sendBeacon("/api/v1/pageview", new Blob([body], { type: "application/json" })))
      void fetch("/api/v1/pageview", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      });
  }, [allowed, path]);
  useEffect(() => {
    // Marks the page so tests (and support) can see whether analytics may run here.
    if (allowed) document.documentElement.dataset.analytics = SRC ? "on" : "no-tool";
    else delete document.documentElement.dataset.analytics;
    if (!allowed || !SRC || document.querySelector("script[data-h2-analytics]")) return;
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.dataset.h2Analytics = "1";
    document.head.appendChild(s);
  }, [allowed]);
  return null;
}
