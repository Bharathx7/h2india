"use server";

import config from "@payload-config";
import { underLimit } from "@h2india/core";
import { PRODUCT_CLASSES } from "@h2india/core/catalogue";
import { isEmailAddress, NewsletterError, resendLink, savePreferences, subscribe } from "@h2india/core/newsletter";
import { getPayload } from "payload";
import { EARLY_LISTING_CONSENT } from "@/cms/home/collections";
import { requestContext } from "./request-context";

// Public forms on the home, Coming soon and newsletter pages (step 5.1): India H₂ Weekly sign-up (A46) and early listing
// requests (A47). Each is rate-limited per address; nothing here needs an account.

async function allowed(form: string, max: number): Promise<boolean> {
  const { ip } = await requestContext();
  return underLimit(`${form}:${ip ?? "unknown"}`, 3600, max);
}

export type SubscribeResult =
  | { status: "sent"; email: string }
  | { status: "already"; email: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

/** Footer and Coming soon sign-up (743:7293 states: submitting, success, already subscribed, invalid email). */
export async function subscribeToNewsletter(input: {
  email: string;
  topics: string[];
  source: "footer" | "coming-soon" | "newsletter-page" | "newsroom";
}): Promise<SubscribeResult> {
  const email = input.email.trim();
  if (!isEmailAddress(email)) return { status: "invalid", message: "Enter a full email address, like name@company.in" };
  if (!(await allowed("newsletter", 10))) {
    return { status: "error", message: "Too many sign-ups from here. Try again in an hour." };
  }
  try {
    const status = await subscribe({ email, topics: input.topics, source: input.source });
    return { status, email: email.toLowerCase() };
  } catch (error) {
    if (error instanceof NewsletterError) return { status: "invalid", message: error.message };
    console.error("[newsletter] sign-up failed", error);
    return { status: "error", message: "We couldn't sign you up. This is on our side; try again in a moment." };
  }
}

/** "Save preferences" on the confirm page (448:7157). */
export async function saveNewsletterPreferences(input: {
  token: string;
  topics: string[];
  tenderDigest: boolean;
  monthlyNote: boolean;
}): Promise<boolean> {
  return savePreferences(input.token, input);
}

/** "Send a new link" on the expired page (448:7392). */
export async function resendNewsletterLink(email: string): Promise<{ ok: boolean; message?: string }> {
  if (!isEmailAddress(email)) return { ok: false, message: "Enter a full email address, like name@company.in" };
  if (!(await allowed("newsletter-resend", 5))) return { ok: false, message: "Too many tries. Try again in an hour." };
  await resendLink(email);
  return { ok: true };
}

export interface EarlyListingInput {
  company: string;
  name: string;
  email: string;
  mobile: string;
  sells: string;
  consent: boolean;
}

export type EarlyListingResult =
  { ok: true } | { ok: false; errors: Partial<Record<keyof EarlyListingInput | "form", string>> };

const MOBILE = /^(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/;

/** "Are you a supplier? Get listed early" on the Coming soon page (743:6988, A47). */
export async function requestEarlyListing(input: EarlyListingInput): Promise<EarlyListingResult> {
  const errors: Partial<Record<keyof EarlyListingInput | "form", string>> = {};
  const value = {
    company: input.company.trim(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: input.mobile.trim(),
    sells: input.sells,
  };
  if (!value.company) errors.company = "Enter your company's name";
  if (!value.name) errors.name = "Enter your full name";
  if (!isEmailAddress(value.email)) errors.email = "Enter a full email address, like name@company.in";
  if (!MOBILE.test(value.mobile)) errors.mobile = "Enter a 10-digit Indian mobile number, like 98765 43210";
  if (!PRODUCT_CLASSES.some((c) => c.id === value.sells)) errors.sells = "Choose what you sell";
  if (!input.consent) errors.consent = "Tick the box so we can contact you";
  if (Object.keys(errors).length) return { ok: false, errors };
  if (!(await allowed("early-listing", 5))) {
    return { ok: false, errors: { form: "Too many requests from here. Try again in an hour." } };
  }
  try {
    const payload = await getPayload({ config });
    await payload.create({
      collection: "early-listings",
      data: { ...value, sells: value.sells as "systems", consentText: EARLY_LISTING_CONSENT, status: "New" },
    });
    return { ok: true };
  } catch (error) {
    console.error("[early-listing] not saved", error);
    return { ok: false, errors: { form: "We couldn't send this. This is on our side; try again in a moment." } };
  }
}
