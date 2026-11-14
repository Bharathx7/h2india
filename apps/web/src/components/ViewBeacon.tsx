"use client";

import { useEffect } from "react";

/** Counts one view for supplier analytics (step 8.8) once the page is really shown; never on prefetch. */
export function ViewBeacon(props: {
  type: "listing_viewed" | "profile_viewed" | "compared";
  productId?: string;
  organisationId?: string;
  productIds?: string[];
}) {
  const key = JSON.stringify(props);
  useEffect(() => {
    void fetch("/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: key,
      keepalive: true,
    }).catch(() => undefined);
  }, [key]);
  return null;
}
