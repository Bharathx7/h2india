// Storefront rules (founder QC, 17 Nov 2026), pure and safe to import in the browser: the editor shows the same
// messages before saving that the server gives when it refuses.

export interface StorefrontFields {
  about?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  foundedYear?: number | null;
  locations?: { name: string; city: string; state: string; kind: string }[];
}

export type StorefrontField = "about" | "website" | "contactEmail" | "contactPhone" | "foundedYear" | "locations";

/** The storefront's sections, in the order the editor walks through them. */
export const STOREFRONT_STEPS = [
  { key: "brand", label: "Logo and about" },
  { key: "capabilities", label: "What you make" },
  { key: "locations", label: "Locations" },
  { key: "contact", label: "Contact" },
] as const;
export type StorefrontStep = (typeof STOREFRONT_STEPS)[number]["key"];

/** Problems by field, in the words the editor shows; empty when the storefront can be saved. */
export function storefrontProblems(
  f: StorefrontFields,
  now: Date = new Date(),
): Partial<Record<StorefrontField, string>> {
  const out: Partial<Record<StorefrontField, string>> = {};
  const website = f.website?.trim();
  if (website && !/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(website))
    out.website = "Enter a web address, like greenfieldh2.in";
  const email = f.contactEmail?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.contactEmail = "Enter an email, like sales@company.com";
  const phone = f.contactPhone?.replace(/[\s-]/g, "");
  if (phone && !/^\+?\d{8,15}$/.test(phone)) out.contactPhone = "Enter a phone number, like +91 98765 43210";
  if (f.foundedYear !== undefined && f.foundedYear !== null) {
    const year = now.getUTCFullYear();
    if (!Number.isInteger(f.foundedYear) || f.foundedYear < 1800 || f.foundedYear > year)
      out.foundedYear = `Enter a year between 1800 and ${String(year)}`;
  }
  if ((f.locations ?? []).some((l) => l.name.trim() && !l.city.trim())) out.locations = "Each location needs a city";
  return out;
}

/** Which of the editor's steps have what buyers need (for the done ticks and the progress count). */
export function storefrontStepsDone(
  f: StorefrontFields & { logoFileId?: string; capabilities?: string; categories?: string[] },
) {
  return {
    brand: Boolean(f.logoFileId && f.about?.trim()),
    capabilities: Boolean(f.capabilities?.trim() || (f.categories?.length ?? 0) > 0),
    locations: (f.locations ?? []).some((l) => l.name.trim()),
    contact: Boolean(f.contactEmail?.trim() || f.contactPhone?.trim() || f.website?.trim()),
  } satisfies Record<StorefrontStep, boolean>;
}
