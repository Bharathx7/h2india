"use client";

import { useEffect } from "react";

/**
 * Marks the page once React has hydrated it (`<html data-hydrated="1">`). Browser tests wait for it before typing or
 * clicking, so a slow CI machine can't act on server HTML whose handlers aren't attached yet (a form would submit
 * natively, or a controlled input would be reset). Nothing visible; no effect for people.
 */
export function HydrationMark() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return null;
}
