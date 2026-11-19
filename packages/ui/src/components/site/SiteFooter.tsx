"use client";

import { useState, type SyntheticEvent } from "react";
import { Logo } from "../../brand/Logo";
import { Icon } from "../../icons/Icon";
import { BackToTop } from "../BackToTop";
import { Button } from "../Button";
import { CategoryChip } from "../Chips";
import type { MegaLink } from "./types";

/* Figma "Footer v2" (153:179, mobile 153:330 and 372:16498): brand and newsletter, five link columns,
   the sources disclaimer, the bottom bar and the large mint wordmark. The language selector stays hidden
   (decision M15); social links show only when their addresses are set. */

export interface FooterColumn {
  heading: string;
  links: MegaLink[];
}

export interface SiteFooterProps {
  columns: FooterColumn[];
  /** Social profiles; each shows only with an address. */
  social?: { linkedin?: string; youtube?: string; x?: string; whatsapp?: string };
  /** Sign up for H2 Economy Weekly. Resolve true when the address is saved. */
  onSubscribe: (email: string, topics: string[]) => Promise<boolean>;
  topics?: string[];
  homeHref?: string;
}

const SOCIAL: { key: "linkedin" | "youtube" | "x" | "whatsapp"; label: string; text: string }[] = [
  { key: "linkedin", label: "H2 Economy on LinkedIn", text: "in" },
  { key: "youtube", label: "H2 Economy on YouTube", text: "▶" },
  { key: "x", label: "H2 Economy on X", text: "X" },
  { key: "whatsapp", label: "H2 Economy on WhatsApp", text: "Wa" },
];

function Newsletter({ onSubscribe, topics }: { onSubscribe: SiteFooterProps["onSubscribe"]; topics: string[] }) {
  const [email, setEmail] = useState("");
  const [chosen, setChosen] = useState<string[]>(topics.slice(0, 2));
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("sending");
    const ok = await onSubscribe(email.trim(), chosen).catch(() => false);
    setState(ok ? "done" : "error");
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3" aria-labelledby="footer-newsletter">
      <p id="footer-newsletter" className="type-label-lg text-primary">
        H2 Economy Weekly
      </p>
      <p className="type-caption text-secondary">Indian hydrogen news, tenders and scheme deadlines. Every Monday.</p>
      {state === "done" ? (
        <p role="status" className="flex items-center gap-2 type-body-sm text-primary">
          <Icon name="check-circle" size={18} className="text-icon-success" />
          Check your inbox to confirm your subscription.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-control border border-input bg-page px-3.5 focus-within:field-focus">
              <Icon name="mail" size={18} className="text-icon-secondary" />
              <span className="sr-only">Your work email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Your work email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
              />
            </label>
            <Button type="submit" disabled={state === "sending"}>
              Subscribe
            </Button>
          </div>
          <div role="group" aria-label="Topics" className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <CategoryChip
                key={t}
                selected={chosen.includes(t)}
                onClick={() => {
                  setChosen((all) => (all.includes(t) ? all.filter((x) => x !== t) : [...all, t]));
                }}
              >
                {t}
              </CategoryChip>
            ))}
          </div>
          {state === "error" ? (
            <p role="alert" className="type-caption text-error">
              We could not sign you up. Check the address and try again.
            </p>
          ) : null}
        </>
      )}
    </form>
  );
}

export function SiteFooter({
  columns,
  social = {},
  onSubscribe,
  topics = ["Policy", "Tenders", "Projects", "Technology", "Mobility"],
  homeHref = "/",
}: SiteFooterProps) {
  const shownSocial = SOCIAL.filter((s) => social[s.key]);
  return (
    <footer className="relative overflow-hidden border-t border-default bg-page">
      <div className="mx-auto grid max-w-300 grid-cols-1 gap-10 px-4 pt-12 pb-8 md:px-6 lg:grid-cols-[320px_1fr] lg:gap-16 xl:px-0">
        <div className="flex flex-col gap-5">
          <a href={homeHref} aria-label="H2 Economy home" className="self-start rounded-control">
            <Logo title="" />
          </a>
          <p className="type-body-sm text-body">
            India&apos;s hydrogen ecosystem platform: products and companies, Indian hydrogen news, schemes, tenders and
            events in one place.
          </p>
          <Newsletter onSubscribe={onSubscribe} topics={topics} />
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((c) => (
            <div key={c.heading}>
              <p className="type-label-sm text-secondary">{c.heading}</p>
              {/* Design upgrade (19 Nov 2026): on phones each link is a full-height tap target (about 36 px). */}
              <ul className="mt-2 flex flex-col lg:mt-3 lg:gap-2.5">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <a
                      href={l.href}
                      className="inline-block rounded-control py-2 type-body-sm text-body hover:text-link-hover hover:underline underline-offset-4 lg:py-0"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="type-caption text-secondary lg:col-span-2">
          Scheme, tender and tracker information is summarised by H2 Economy from official sources. Always confirm
          details on the official portal before applying or bidding.
        </p>
      </div>
      <div className="border-t border-default">
        <div className="mx-auto flex max-w-300 flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6 xl:px-0">
          <p className="type-caption text-secondary">
            © {new Date().getFullYear()} H2 Economy · Made for India&apos;s hydrogen economy
          </p>
          <div className="flex items-center gap-3">
            {shownSocial.map((s) => (
              <a
                key={s.key}
                href={social[s.key]}
                aria-label={s.label}
                rel="noopener"
                target="_blank"
                className="flex size-9 items-center justify-center rounded-pill border border-control type-label-sm text-primary hover:border-focus"
              >
                <span aria-hidden="true">{s.text}</span>
              </a>
            ))}
            <BackToTop />
          </div>
        </div>
      </div>
      {/* The large wordmark (Manrope 800, 300 px, -5%, bg/mint). Drawn as SVG text: decorative, not read out. */}
      <svg aria-hidden="true" viewBox="0 0 1440 170" className="block w-full select-none" focusable="false">
        <text x="20" y="199" className="fill-fresh-50 font-display font-extrabold" fontSize="300" letterSpacing="-15">
          H2 Economy
        </text>
      </svg>
    </footer>
  );
}
