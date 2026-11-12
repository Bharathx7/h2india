"use client";

import { Switch } from "@h2india/ui";
import { useQuery } from "@/opportunities/filters";

/** "Free downloads only" (736:8). */
export function FreeOnly() {
  const { params, set } = useQuery();
  return (
    <Switch
      label="Free downloads only"
      checked={params.get("free") === "1"}
      onCheckedChange={(on) => {
        set("free", on ? "1" : "");
      }}
    />
  );
}
