import { LiveSection } from "@/components/LiveSection";
import type { PublicClass } from "@h2india/core/catalogue/taxonomy";
import { ArticleCard, buttonClasses, cx, EmptyState, Icon, Skeleton, type AsyncState } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { readMinutes } from "@/news/data";
import { wrap } from "@/news/parts";
import type { Guide } from "@/payload-types";
import { classHref, classTileLine } from "./views";

// Pieces the marketplace pages share (390:7501, 391:4379, 754:14685).

export { wrap };

export function PageSection({
  id,
  title,
  sub,
  link,
  className,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  link?: { label: string; href: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cx("py-12 md:py-16", className)}>
      <div className={cx(wrap, "flex flex-col gap-6")}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="flex flex-col gap-2">
            <h2 id={`${id}-title`} className="type-h2 text-primary">
              {title}
            </h2>
            {sub ? <p className="type-body text-body">{sub}</p> : null}
          </div>
          {link ? (
            <Link
              href={link.href}
              className="inline-flex items-center gap-1.5 type-label text-link hover:text-link-hover"
            >
              {link.label}
              <Icon name="arrow-right" size={16} />
            </Link>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/** A class tile on the landing (390:7618): counts, the round arrow, name and what's inside. */
export function ClassTile({ c }: { c: PublicClass }) {
  return (
    <Link
      href={classHref(c.id)}
      className="group card-lift flex flex-col gap-3 rounded-feature bg-mint p-7 focus-visible:outline-offset-4"
    >
      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1 type-eyebrow text-secondary">{classTileLine(c)}</span>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-inverse text-icon-inverse"
        >
          <Icon name="arrow-right" size={14} />
        </span>
      </span>
      <span className="type-h3 text-primary">{c.label}</span>
      <span className="type-body text-body">{c.description}</span>
    </Link>
  );
}

const STEPS = [
  { title: "Describe what you need", text: "Specs, quantity, delivery site and the date you need it on site." },
  { title: "H2 India checks it", text: "We review every request within 1 working day before it goes out." },
  { title: "Compare and choose", text: "Quotes arrive in one format. Accept the best one and order." },
];

/** RFQ band (390:8204), as on the buyer's guides. */
export function RfqBand() {
  return (
    <section aria-labelledby="rfq-title" className="py-12 md:py-16">
      <div className={cx(wrap, "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center")}>
        <div className="flex flex-col items-start gap-4">
          <p className="type-eyebrow text-secondary">Request a quote</p>
          <h2 id="rfq-title" className="type-h2 text-primary">
            Send one request to up to 5 verified suppliers
          </h2>
          <p className="type-body text-body">
            H2 India checks every request within 1 working day. Suppliers then quote in the same format, so you can
            compare them side by side.
          </p>
          <Link href="/rfq/new" className={buttonClasses({ size: "lg" })}>
            Request a quote
          </Link>
        </div>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 rounded-card border border-default p-4">
              <span className="flex size-7 items-center justify-center rounded-pill bg-mint type-spec text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="type-label text-primary">{s.title}</span>
              <span className="type-body-sm text-body">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const guideLabel = (g: Guide) => `Buyer's guide${g.productCategories?.[0] ? ` · ${g.productCategories[0]}` : ""}`;

/** Buyer's guides as article cards (390:8256), with their designed loading and empty states. */
export function GuideCards({ guides, state }: { guides: Guide[]; state?: AsyncState }) {
  return (
    <LiveSection
      label="Buyer's guides"
      state={state ?? (guides.length ? "ready" : "empty")}
      skeleton={
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Skeleton kind="card" />
          <Skeleton kind="card" />
          <Skeleton kind="card" />
        </div>
      }
      empty={
        <div className="rounded-card border border-default bg-subtle">
          <EmptyState title="Buyer's guides are on the way">
            Our editors are writing guides on how to specify and buy in each category.
          </EmptyState>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {guides.map((g) => (
          <ArticleCard
            key={g.id}
            section={guideLabel(g)}
            title={g.title}
            href={`/knowledge/guides/${g.slug}`}
            readLabel={`Read · ${String(readMinutes(g.body))} min`}
          />
        ))}
      </div>
    </LiveSection>
  );
}
