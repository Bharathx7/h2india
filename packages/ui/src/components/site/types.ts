import type { IconName } from "../../icons/Icon";

// Content for the site header's six mega menus (Figma "Mega menu" 369:7387). Labels come from the design;
// anything that changes (category counts, the sponsored supplier, tracker figures, upcoming events) comes from
// data at request time and is left out when there is none.

export interface MegaLink {
  label: string;
  href: string;
}

export interface MegaPrimaryLink extends MegaLink {
  description: string;
}

export interface MegaClass extends MegaLink {
  id: string;
  /** Number of categories, from the catalogue. */
  count?: number;
  categories: MegaLink[];
}

export interface MegaPromo {
  eyebrow: string;
  title: string;
  text: string;
  /** "button" = small primary button; "arrow" = Arrow link. */
  action: MegaLink & { style: "button" | "arrow" };
}

export interface MegaSponsor {
  name: string;
  detail: string;
  href: string;
  verified: boolean;
}

export interface MegaSection {
  id: string;
  label: string;
  eyebrow: string;
  /** Marketplace only. */
  classes?: MegaClass[];
  applications?: MegaLink[];
  tools?: (MegaLink & { icon: IconName })[];
  sponsor?: MegaSponsor | null;
  /** The other five sections. */
  primary?: MegaPrimaryLink[];
  linksTitle?: string;
  links?: MegaLink[];
  promo?: MegaPromo | null;
}

export interface SiteUser {
  name: string;
  initials: string;
  organisation: string;
  /** "Buyer", "Supplier", "Member" or "Admin". */
  workspace: string;
  workspaceHref: string;
  unread: number;
  /**
   * A second destination under Dashboard (founder QC, 17 Nov 2026): "Member area" for a buyer or supplier who also
   * joined as a member, or "Join as member" for one who hasn't.
   */
  extra?: { label: string; href: string };
}

export interface SiteLinks {
  home: string;
  requestQuote: string;
  signIn: string;
  listCompany: string;
  notifications: string;
  account: string;
  signOut: string;
  /** Top strip: For Buyers, For Suppliers, Pricing, Advertise, Newsletter. */
  secondary: MegaLink[];
}
