"use client";

import { cx, Icon, type IconName } from "@h2india/ui";
import { usePathname } from "next/navigation";

// The brand panel beside every sign-in and join page. Founder (20 Nov 2026): one design for all of them, told apart by
// role (badge, colour, headline, three points and a small preview of that workspace), short enough that every page
// fits one screen. Desktop: the left part of the screen. Phones: only the role badge above the form (RoleTag).
// Buyer and supplier words are the For buyers and For suppliers pages' own; member words are member/benefits.ts.

type Tone = "ink" | "forest";

interface AsideContent {
  label: string;
  icon: IconName;
  tone: Tone;
  title: string;
  lead: string;
  points: { icon: IconName; title: string; text: string }[];
  preview?: { title: string; rows: { icon: IconName; text: string }[] };
}

const BUYER: AsideContent = {
  label: "Buyer",
  icon: "shopping-bag",
  tone: "ink",
  title: "Source hydrogen equipment with confidence",
  lead: "Find verified Indian suppliers and compare like-for-like quotes. Free for buyers.",
  points: [
    { icon: "shield-check", title: "Verified suppliers", text: "Each badge lists the checks we made, with dates." },
    { icon: "table", title: "Comparable quotes", text: "Price, lead time, delivery and terms side by side." },
    { icon: "users", title: "Your team", text: "Colleagues with their own roles in one account." },
  ],
  preview: {
    title: "Your buyer workspace",
    rows: [
      { icon: "file-text", text: "Quote requests" },
      { icon: "table", text: "Quotes side by side" },
      { icon: "folder", text: "Project lists" },
    ],
  },
};

const SUPPLIER: AsideContent = {
  label: "Supplier",
  icon: "package",
  tone: "forest",
  title: "Reach India’s hydrogen buyers",
  lead: "Get a verified listing and receive structured quote requests from engineering and procurement teams.",
  points: [
    { icon: "layout-template", title: "Storefront", text: "Products, certificates and projects in one place." },
    { icon: "inbox", title: "Quote request inbox", text: "Structured requests with a reply-by date." },
    { icon: "file-text", title: "Datasheet to listing", text: "Upload a datasheet; we draft the listing." },
  ],
  preview: {
    title: "Your supplier workspace",
    rows: [
      { icon: "inbox", text: "Quote requests" },
      { icon: "building", text: "Storefront" },
      { icon: "bar-chart", text: "Analytics" },
    ],
  },
};

const MEMBER: AsideContent = {
  label: "Member",
  icon: "user",
  tone: "forest",
  title: "Hear first when something changes",
  lead: "For engineers, researchers, students and anyone following India’s hydrogen economy.",
  points: [
    { icon: "bell", title: "Alerts that match you", text: "Tenders, schemes, grants and jobs, by your filters." },
    { icon: "heart", title: "Save and follow", text: "Keep what matters and follow companies and topics." },
    { icon: "file-text", title: "Hydrogen 101", text: "Short chapters and quizzes; your progress is saved." },
  ],
  preview: {
    title: "Your member dashboard",
    rows: [
      { icon: "bell", text: "Alerts" },
      { icon: "heart", text: "Saved" },
      { icon: "users", text: "Following" },
    ],
  },
};

const STAFF: AsideContent = {
  label: "H2 Economy staff",
  icon: "lock",
  tone: "ink",
  title: "The back office",
  lead: "Sign in with your work email and password to moderate, verify and run the platform.",
  points: [
    { icon: "lock", title: "Password sign-in", text: "Staff only; paused after repeated wrong tries." },
    { icon: "shield-check", title: "Confirm it’s you", text: "Sensitive changes ask for a code by email." },
    { icon: "clipboard-check", title: "Every action logged", text: "Changes are kept in the audit log." },
  ],
};

const TESTERS: AsideContent = {
  label: "Test accounts",
  icon: "users",
  tone: "ink",
  title: "Try H2 Economy as a buyer, supplier or member",
  lead: "Use the email and password you were given. Each test account opens its own workspace.",
  points: [],
};

const GENERAL: AsideContent = {
  label: "H2 Economy",
  icon: "globe",
  tone: "ink",
  title: "India’s hydrogen ecosystem, in one place",
  lead: "Find hydrogen products and verified suppliers, follow Indian hydrogen news, and act on schemes and tenders.",
  points: [
    { icon: "package", title: "Products and verified suppliers", text: "Compare by specification, request quotes." },
    { icon: "newspaper", title: "Indian hydrogen news", text: "Checked against the source, every day." },
    { icon: "bell", title: "Schemes and tenders", text: "Deadlines and status from the official source." },
  ],
};

export function contentFor(path: string): AsideContent {
  if (path.startsWith("/sign-in/staff")) return STAFF;
  if (path.startsWith("/sign-in/test")) return TESTERS;
  if (path.includes("buyer")) return BUYER;
  if (path.includes("supplier")) return SUPPLIER;
  if (path.includes("member")) return MEMBER;
  return GENERAL;
}

const PANEL: Record<Tone, string> = { ink: "bg-inverse", forest: "bg-fresh-700" };

export function AuthAside() {
  const c = contentFor(usePathname());
  return (
    <aside
      aria-label={c.label}
      className={cx(
        "relative isolate hidden overflow-hidden px-10 py-10 lg:flex lg:h-dvh lg:flex-col lg:justify-center xl:px-14",
        PANEL[c.tone],
      )}
    >
      <div aria-hidden="true" className="depth-deep-glow absolute -top-60 -right-40 -z-10 size-160" />
      <div className="flex max-w-120 flex-col gap-6">
        <span className="inline-flex items-center gap-2 self-start rounded-pill bg-accent px-3 py-1 type-label-sm text-primary">
          <Icon name={c.icon} size={14} />
          {c.label}
        </span>
        <div className="flex flex-col gap-3">
          <h2 className="type-h2 text-inverse xl:type-h1">{c.title}</h2>
          <p className="type-body text-neutral-0/80">{c.lead}</p>
        </div>
        {c.points.length ? (
          <ul className="flex flex-col gap-3">
            {c.points.map((b) => (
              <li key={b.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-card bg-neutral-0/8 text-fresh-300">
                  <Icon name={b.icon} size={18} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="type-label text-inverse">{b.title}</span>
                  <span className="type-body-sm text-neutral-0/80">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {c.preview ? (
          <div
            aria-hidden="true"
            className="flex flex-col gap-2 rounded-feature border border-neutral-0/16 bg-neutral-0/6 p-4 [@media(max-height:760px)]:hidden"
          >
            <span className="type-label-sm text-inverse">{c.preview.title}</span>
            <div className="grid grid-cols-3 gap-2">
              {c.preview.rows.map((r) => (
                <span key={r.text} className="flex flex-col items-start gap-2 rounded-card bg-page p-3">
                  <Icon name={r.icon} size={18} className="text-icon-link" />
                  <span className="type-label-sm text-primary">{r.text}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

/** Phones and tablets: who the page is for, as a badge above the form (the panel shows from 1024 px). */
export function RoleTag() {
  const c = contentFor(usePathname());
  return (
    <span className="inline-flex items-center gap-2 rounded-pill bg-page px-3 py-1 type-label-sm text-primary lg:hidden">
      <Icon name={c.icon} size={14} className="text-icon-link" />
      {c.label}
    </span>
  );
}
