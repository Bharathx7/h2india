"use client";

import { Icon, type IconName } from "@h2india/ui";
import { usePathname } from "next/navigation";
import { MEMBER_BENEFITS, MEMBER_JOIN_STEPS } from "@/member/benefits";

// The brand panel beside every sign-in and join page (founder v2, 18 Nov 2026): one design for all of them, with the
// words for who the page is for. Buyer and supplier points are the For buyers and For suppliers pages' own words; the
// member points are MEMBER_BENEFITS. Desktop: the left half, beside the form. Phones: under the form, on join pages
// only (signing in shouldn't scroll past a sales panel).

interface AsideContent {
  label: string;
  title: string;
  lead: string;
  points: { icon: IconName; title: string; text: string }[];
  steps?: { title: string; text: string }[];
}

const BUYER: AsideContent = {
  label: "For buyers",
  title: "Source hydrogen equipment with confidence",
  lead: "Find verified Indian suppliers, compare like-for-like quotes and order with a GST invoice. Free for buyers.",
  points: [
    {
      icon: "shield-check",
      title: "Verified suppliers",
      text: "Each badge lists the checks we made and the date we made them.",
    },
    {
      icon: "table",
      title: "Comparable quotes",
      text: "Every supplier answers the same fields: price, lead time, delivery and payment terms.",
    },
    {
      icon: "users",
      title: "Company accounts with approvals",
      text: "Add colleagues and approve orders before they go out.",
    },
  ],
};

const SUPPLIER: AsideContent = {
  label: "For suppliers",
  title: "Reach India’s hydrogen buyers",
  lead: "Get a verified listing and receive structured quote requests from engineering and procurement teams.",
  points: [
    {
      icon: "layout-template",
      title: "Storefront",
      text: "A company profile with products, certificates, projects and news in one place.",
    },
    {
      icon: "inbox",
      title: "Quote request inbox",
      text: "Structured requests with a reply-by date. Your response time shows on your profile.",
    },
    {
      icon: "file-text",
      title: "Datasheet to listing",
      text: "Upload a datasheet PDF and we draft the listing with specs and units for you to approve.",
    },
  ],
};

const MEMBER: AsideContent = {
  label: "For members",
  title: "What you get as a member",
  lead: "For engineers, researchers, students and anyone following India’s hydrogen economy.",
  points: MEMBER_BENEFITS,
  // On the sign-up page itself, step 1 is the form beside this panel, so it names the form, not the page.
  steps: MEMBER_JOIN_STEPS.map((s, i) => (i === 0 ? { ...s, title: "Fill in your details" } : s)),
};

const STAFF: AsideContent = {
  label: "H2 Economy staff",
  title: "The back office",
  lead: "Sign in with your work email and password to moderate, verify and run the platform.",
  points: [],
};

const TESTERS: AsideContent = {
  label: "Test accounts",
  title: "Try H2 Economy as a buyer, supplier or member",
  lead: "Use the email and password you were given. Each test account opens its own workspace.",
  points: [],
};

const GENERAL: AsideContent = {
  label: "H2 Economy",
  title: "India’s hydrogen ecosystem, in one place",
  lead: "Find hydrogen products and verified suppliers, follow Indian hydrogen news, and act on schemes and tenders.",
  points: [
    { icon: "package", title: "Products and verified suppliers", text: "Compare by specification and request quotes." },
    { icon: "newspaper", title: "Indian hydrogen news", text: "Checked against the source, every day." },
    { icon: "bell", title: "Schemes and tenders", text: "Deadlines and status from the official source." },
  ],
};

function contentFor(path: string): AsideContent {
  if (path.startsWith("/sign-in/staff")) return STAFF;
  if (path.startsWith("/sign-in/test")) return TESTERS;
  if (path.includes("buyer")) return BUYER;
  if (path.includes("supplier")) return SUPPLIER;
  if (path.includes("member")) return MEMBER;
  return GENERAL;
}

export function AuthAside() {
  const path = usePathname();
  const c = contentFor(path);
  const join = path.startsWith("/join");
  return (
    <aside
      aria-label={c.label}
      className={`relative isolate order-last overflow-hidden bg-inverse px-6 py-10 lg:order-first lg:flex lg:min-h-dvh lg:flex-col lg:justify-center lg:px-12 xl:px-16 ${join ? "flex flex-col" : "hidden"}`}
    >
      <div aria-hidden="true" className="depth-deep-glow absolute -top-60 -right-40 -z-10 size-160" />
      <div aria-hidden="true" className="depth-dot-grid absolute right-0 bottom-0 -z-10 size-100 opacity-30" />
      <div className="flex max-w-130 flex-col gap-6 lg:sticky lg:top-12">
        <div className="flex flex-col gap-3">
          <p className="type-label text-fresh-300">{c.label}</p>
          <h2 className="type-h2 text-inverse lg:type-h1">{c.title}</h2>
          <p className="type-body text-neutral-0/80">{c.lead}</p>
        </div>
        {c.points.length ? (
          <ul className={`grid grid-cols-1 gap-x-6 gap-y-4 ${c.points.length > 4 ? "sm:grid-cols-2" : ""}`}>
            {c.points.map((b) => (
              <li key={b.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-neutral-0/8 text-fresh-300">
                  <Icon name={b.icon} size={18} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="type-label text-inverse">{b.title}</span>
                  <span className="type-body-sm text-neutral-0/80">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {c.steps && join ? (
          <div className="flex flex-col gap-3 border-t border-neutral-0/12 pt-5">
            <p className="type-label text-inverse">Ready in about two minutes</p>
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {c.steps.map((s, i) => (
                <li key={s.title} className="flex items-start gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-accent type-label-sm text-primary">
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="type-label-sm text-inverse">{s.title}</span>
                    <span className="type-caption text-neutral-0/80">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
