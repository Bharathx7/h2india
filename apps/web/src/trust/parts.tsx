import { buttonClasses, cx, Icon, Reveal, Steps3D, type IconName } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { Crumbs, wrap } from "@/opportunities/parts";
import type { Figure } from "./data";

// Pieces the step 5.8 pages share (Figma page 12): the mint hero (66:4251, 93:906), the plain page head with crumbs
// (741:5605), feature cards, numbered steps, figure tiles with source and date, the questions accordion, and the dark
// call-to-action band ("Ready to sell?", 93:1331).
// Founder v2 (18 Nov 2026): the hero is the full-width dark ink band with the deep glow (as on the home page), the
// page head sits on a soft mint fade, feature cards lift and carry a green icon tile, and labels above headings are
// plain words in the body face rather than mono capitals.

export { wrap };
export const main = "min-h-screen bg-page pb-16 [&_:is(h1,h2,h3)]:text-wrap";
export const card = "rounded-card border border-default bg-page";

type Action = { label: string; href: string; primary?: boolean };

function Actions({ actions, dark = false }: { actions: Action[]; dark?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((a) => (
        <Link
          key={a.href + a.label}
          href={a.href}
          className={buttonClasses({
            variant: a.primary ? "primary" : dark ? "inverse" : "outline",
            size: dark ? "lg" : "sm",
          })}
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * The dark hero every step 5.8 page opens with. Founder (20 Nov 2026): no dot pattern, and For Buyers, For Members and
 * For Suppliers share one size, each with a preview of its account on the right (`aside`) and who it's for (`chips`).
 */
export function Hero({
  eyebrow,
  title,
  lead,
  actions = [],
  note,
  chips,
  aside,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  actions?: Action[];
  note?: string;
  chips?: string[];
  aside?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-inverse">
      <div aria-hidden="true" className="depth-deep-glow absolute -top-60 -right-40 -z-10 size-160" />
      <div
        className={cx(
          wrap,
          "grid grid-cols-1 gap-10 py-14 md:py-20",
          aside ? "lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center" : null,
        )}
      >
        <div className="flex flex-col gap-5">
          <p className="type-label text-fresh-300">{eyebrow}</p>
          <h1 className="max-w-200 type-h1 text-inverse md:type-display">{title}</h1>
          <div className="max-w-180 type-body text-neutral-0/80 md:type-body-lg">{lead}</div>
          {chips?.length ? (
            <ul aria-label="Who it's for" className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <li
                  key={c}
                  className="rounded-pill border border-neutral-0/16 bg-neutral-0/6 px-3 py-1 type-label-sm text-inverse"
                >
                  {c}
                </li>
              ))}
            </ul>
          ) : null}
          {actions.length ? <Actions actions={actions} dark /> : null}
          {note ? <p className="type-caption text-neutral-0/64">{note}</p> : null}
        </div>
        {aside ? <div className="hidden md:block">{aside}</div> : null}
      </div>
    </section>
  );
}

/** The hero's right-hand preview of an account (decorative: the sections below say it in full). */
export function HeroPreview({
  title,
  badge,
  rows,
}: {
  title: string;
  badge: string;
  rows: { icon: IconName; title: string; text: string }[];
}) {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-feature border border-neutral-0/16 bg-neutral-0/6 p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="type-label text-inverse">{title}</span>
        <span className="rounded-pill bg-accent px-2.5 py-0.5 type-label-sm text-primary">{badge}</span>
      </div>
      {rows.map((r) => (
        <div key={r.title} className="flex items-center gap-3 rounded-card bg-page px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-linear-to-b from-fresh-50 to-fresh-200 text-icon-link">
            <Icon name={r.icon} size={20} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="type-label text-primary">{r.title}</span>
            <span className="truncate type-body-sm text-body">{r.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function PageHead({
  crumbs,
  title,
  lead,
  aside,
}: {
  crumbs?: { label: string; href?: string }[];
  title: string;
  lead?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="bg-linear-to-b from-fresh-50 to-neutral-0">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 pb-2 md:pt-8 md:pb-4")}>
        {crumbs ? <Crumbs items={crumbs} /> : null}
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-200 flex-col gap-2">
            <h1 className="type-h1 text-primary">{title}</h1>
            {lead ? <div className="type-body text-body">{lead}</div> : null}
          </div>
          {aside}
        </div>
      </div>
    </div>
  );
}

export function Block({
  id,
  title,
  lead,
  children,
  className,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal as="section" aria-labelledby={id} className={cx(wrap, "flex flex-col gap-4 pt-12 md:pt-16", className)}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="type-h2 text-primary">
          {title}
        </h2>
        {lead ? <p className="type-body text-body">{lead}</p> : null}
      </div>
      {children}
    </Reveal>
  );
}

export function Feature({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div data-reveal-item="" className={cx(card, "card-lift flex h-full flex-col gap-3 p-6")}>
      <span className="flex size-11 items-center justify-center rounded-card bg-linear-to-b from-fresh-50 to-fresh-200 text-icon-link">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="type-h4 text-primary">{title}</h3>
      <p className="type-body-sm text-body">{text}</p>
    </div>
  );
}

/** What an account can do: equal-size cards, three across on desktop (the same on every audience page). */
export function FeatureGrid({ items }: { items: { icon: IconName; title: string; text: string }[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <Feature key={f.title} icon={f.icon} title={f.title} text={f.text} />
      ))}
    </div>
  );
}

/** Why it's worth it: a mint band of icon, title and line, the same on every audience page. */
export function Highlights({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: { icon: IconName; title: string; text: string }[];
}) {
  return (
    <Reveal as="section" aria-labelledby={id} className={cx(wrap, "pt-12 md:pt-16")}>
      <div className="flex flex-col gap-6 rounded-feature bg-mint px-6 py-8 md:px-10 md:py-10">
        <h2 id={id} className="type-h2 text-primary">
          {title}
        </h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((h) => (
            <li key={h.title} data-reveal-item="" className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-card bg-page text-icon-link">
                <Icon name={h.icon} size={22} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="type-label-lg text-primary">{h.title}</span>
                <span className="type-body-sm text-body">{h.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

/** Numbered steps: the shared 3D steps (founder v2, 18 Nov 2026), so every "How it works" looks the same. */
export function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return <Steps3D steps={steps} />;
}

/** A figure with its source and date, always together (A45). */
export function FigureTile({ f, large = false }: { f: Figure; large?: boolean }) {
  return (
    <div className={cx("flex flex-col gap-1 rounded-card bg-mint p-5", large && "md:p-6")}>
      <p className={cx("text-primary", large ? "type-h1" : "type-h3")}>{f.value}</p>
      <p className="type-label text-primary">{f.label}</p>
      <p className="type-caption text-secondary">
        {f.source}, {f.asOf}
      </p>
    </div>
  );
}

export function Faqs({
  id,
  title,
  lead = "Short answers here, more in the help centre.",
  items,
}: {
  id: string;
  title: string;
  lead?: string;
  items: { question: string; answer: string }[];
}) {
  if (!items.length) return null;
  return (
    <Reveal
      as="section"
      aria-labelledby={id}
      className={cx(wrap, "grid grid-cols-1 gap-6 pt-12 md:pt-16 lg:grid-cols-[18rem_1fr] lg:gap-10")}
    >
      <div className="flex flex-col gap-2">
        <h2 id={id} className="type-h2 text-primary">
          {title}
        </h2>
        <p className="type-body-sm text-body">{lead}</p>
        <Link href="/help" className="inline-flex items-center gap-1 type-label-sm text-link">
          Visit the help centre <Icon name="arrow-right" size={14} />
        </Link>
      </div>
      <div className="flex flex-col">
        {items.map((q, i) => (
          <details key={q.question} open={i === 0} className="group border-b border-default py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 type-label text-primary">
              {q.question}
              <Icon
                name="chevron-down"
                size={18}
                className="shrink-0 transition-transform duration-(--motion-duration-base) ease-standard group-open:rotate-180"
              />
            </summary>
            <p className="faq-answer pt-2 type-body-sm text-body">{q.answer}</p>
          </details>
        ))}
      </div>
    </Reveal>
  );
}

export function DarkCta({
  eyebrow,
  title,
  text,
  actions,
}: {
  eyebrow: string;
  title: string;
  text: string;
  actions: Action[];
}) {
  return (
    <div className={cx(wrap, "pt-12 md:pt-16")}>
      <Reveal
        as="section"
        aria-label={title}
        className="relative isolate flex flex-col gap-6 overflow-hidden rounded-feature bg-inverse px-6 py-10 md:flex-row md:items-center md:justify-between md:px-12 md:py-14"
      >
        <div aria-hidden="true" className="depth-deep-glow absolute -top-60 left-1/2 -z-10 size-150" />
        <div className="flex flex-col gap-3 md:w-1/2">
          <p className="type-label text-fresh-300">{eyebrow}</p>
          <h2 className="type-h1 text-inverse">{title}</h2>
          <p className="type-body text-neutral-0/80">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={cx(
                buttonClasses({ variant: a.primary === false ? "outline" : "primary" }),
                a.primary === false && "bg-page",
              )}
            >
              {a.label} {a.primary === false ? null : <Icon name="arrow-right" size={16} />}
            </Link>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

/** "[Registered office address]": a value M2 hasn't filled yet reads as a placeholder, as drawn. */
export function Value({ children }: { children: string }) {
  return <span className={children.startsWith("[") ? "text-secondary" : undefined}>{children}</span>;
}
