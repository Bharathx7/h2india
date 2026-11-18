import { buttonClasses, cx, Icon, Reveal, Steps3D, type IconName } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { Crumbs, wrap } from "@/opportunities/parts";
import type { Figure } from "./data";

// Pieces the step 5.8 pages share (Figma page 12): the mint hero (66:4251, 93:906), the plain page head with crumbs
// (741:5605), feature cards, numbered steps, figure tiles with source and date, the questions accordion, and the dark
// call-to-action band ("Ready to sell?", 93:1331).

export { wrap };
export const main = "min-h-screen bg-page pb-16 [&_:is(h1,h2,h3)]:text-wrap";
export const card = "rounded-card border border-default bg-page";

type Action = { label: string; href: string; primary?: boolean };

function Actions({ actions }: { actions: Action[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((a) => (
        <Link
          key={a.href + a.label}
          href={a.href}
          className={buttonClasses({ variant: a.primary ? "primary" : "outline", size: "sm" })}
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}

export function Hero({
  eyebrow,
  title,
  lead,
  actions = [],
  note,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  actions?: Action[];
  note?: string;
}) {
  return (
    <div className={cx(wrap, "pt-6 md:pt-8")}>
      <div className="flex flex-col gap-4 rounded-card bg-mint px-6 py-10 md:px-12 md:py-14">
        <p className="type-eyebrow text-secondary">{eyebrow}</p>
        <h1 className="type-h1 text-primary">{title}</h1>
        <div className="max-w-180 type-body text-body">{lead}</div>
        {actions.length ? <Actions actions={actions} /> : null}
        {note ? <p className="type-caption text-secondary">{note}</p> : null}
      </div>
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
    <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
      {crumbs ? <Crumbs items={crumbs} /> : null}
      <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-200 flex-col gap-2">
          <h1 className="type-h1 text-primary">{title}</h1>
          {lead ? <div className="type-body text-body">{lead}</div> : null}
        </div>
        {aside}
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
    <div data-reveal-item="" className={cx(card, "flex flex-col gap-3 p-5")}>
      <span className="flex size-9 items-center justify-center rounded-control bg-mint text-icon-primary">
        <Icon name={icon} size={18} />
      </span>
      <h3 className="type-h4 text-primary">{title}</h3>
      <p className="type-body-sm text-body">{text}</p>
    </div>
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
        className="relative flex flex-col gap-6 overflow-hidden rounded-card bg-inverse px-6 py-10 md:flex-row md:items-center md:px-12"
      >
        <div className="flex flex-col gap-3 md:w-1/2">
          <p className="type-eyebrow text-fresh-300">{eyebrow}</p>
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
