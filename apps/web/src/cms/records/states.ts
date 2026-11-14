import { GST_STATES } from "@h2india/core/companies/client";

// The state choices on records (step 4.3): the GST state names as slugs, plus All India. On its own so pages and pure
// helpers can use it without loading the CMS.

export const STATE_OPTIONS = [
  { label: "All India", value: "all-india" },
  ...[...new Set(Object.values(GST_STATES))]
    .filter((s) => s !== "Other Territory" && s !== "Centre Jurisdiction")
    .sort()
    .map((s) => ({ label: s, value: s.toLowerCase().replace(/[^a-z0-9]+/g, "-") })),
];
