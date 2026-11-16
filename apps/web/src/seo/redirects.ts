// 301 redirects (step 5.10), kept in redirects.json so next.config.ts can read them. Short and common addresses people type or old links use, sent to the page that holds
// them now. Each target must be a real page: tests/e2e/specs/seo.spec.ts follows every row.
//
// The old hy-gen demo (hydro.deecodes.io) is a different domain; its addresses can only be listed from that repository
// (docs/audit-existing.md, M14). Add them here, old path first, when the domain is pointed at H2 Economy.

import list from "./redirects.json";

export interface Redirect {
  from: string;
  to: string;
}

export const REDIRECTS: Redirect[] = list;
