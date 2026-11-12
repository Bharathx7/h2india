// Option lists for tenders and grants (step 5.5), as drawn on the filters: tenders 455:1621, grants 462:4609.

export const ISSUER_TYPES = ["SECI", "Public sector companies", "State agencies", "Ports", "Private"] as const;

export const TENDER_CATEGORIES = [
  "Production",
  "Ammonia and methanol",
  "Electrolysers",
  "Refuelling stations",
  "EPC",
  "Equipment",
  "Services",
] as const;

export const VALUE_BANDS = ["Under ₹10 crore", "₹10–100 crore", "Over ₹100 crore"] as const;

export const GRANT_THEMES = [
  "Production",
  "Storage and transport",
  "Fuel cells",
  "Materials and catalysts",
  "Safety and testing",
  "Applications",
] as const;

export const GRANT_APPLICANTS = ["Researchers", "Institutions", "Start-ups", "Companies", "Consortia"] as const;
