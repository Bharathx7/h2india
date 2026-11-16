import type { ProductDetail } from "@h2india/core/products";
import { Alert, Button, cx, FormField, Icon, Input, Select, Textarea, VerifiedBadge, StatusBadge } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { wrap } from "@/marketplace/parts";
import { Crumbs } from "@/opportunities/parts";
import { classHref, categoryHref } from "@/marketplace/views";
import { AskQuestion } from "./ProductActions";

// A service (HAZOP and QRA studies 400:11134; phones 404:12963; provider not verified 400:11597; service paused
// 400:11797), step 6.5. Request a proposal goes to the quote request (step 9.3) with the scope, site state and start
// date; a paused service shows its notice and can't take a request.

export function ServiceView({
  p,
  states,
  signedIn,
  company,
}: {
  p: ProductDetail;
  states: string[];
  signedIn: boolean;
  company: string | null;
}) {
  const s = p.serviceDetails ?? {};
  const ref = { id: p.id, slug: p.slug, name: p.name, supplier: p.supplier.name, category: p.category.slug };
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 pb-12")}>
        <Crumbs
          items={[
            { label: "Marketplace", href: "/marketplace" },
            { label: p.classLabel, href: classHref(p.classId) },
            { label: p.category.label, href: categoryHref({ classId: p.classId, slug: p.category.slug }) },
            { label: p.name },
          ]}
        />
        {p.paused ? (
          <Alert tone="info" title="This service is paused by the provider">
            You can still ask a question or browse similar services.
          </Alert>
        ) : p.providerStatus !== "Verified" ? (
          <Alert tone="warning" title="This provider hasn't finished verification yet">
            You can still request a proposal. Their dated checks will show here once H2 Economy completes them.
          </Alert>
        ) : null}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="flex flex-col gap-4">
            <p className="type-eyebrow text-secondary">
              {[p.classLabel, p.category.label, p.sub?.label].filter(Boolean).join(" · ")}
            </p>
            <h1 className="type-h1 text-primary">{p.name}</h1>
            <p className="flex flex-wrap items-center gap-2 type-body text-body">
              by
              <Link href={p.supplier.href} className="type-label text-link hover:text-link-hover">
                {p.supplier.name}
              </Link>
              {p.providerStatus === "Verified" ? (
                <VerifiedBadge kind="supplier" />
              ) : (
                <StatusBadge status="Verification in progress" tone="progress" />
              )}
            </p>
            {s.statesServed?.length ? <ChipList title="States served" items={s.statesServed} /> : null}
            {s.accreditations?.length ? (
              <ChipList title="Accreditations" items={s.accreditations.map((a) => a.name)} />
            ) : null}
            {p.summary ? <p className="type-body text-body">{p.summary}</p> : null}
          </div>

          <section
            aria-labelledby="proposal-title"
            className="flex flex-col gap-4 self-start rounded-card border border-default p-6"
          >
            <h2 id="proposal-title" className="type-h4 text-primary">
              Request a proposal
            </h2>
            <form action="/rfq/new" method="get" className="flex flex-col gap-4">
              <input type="hidden" name="product" value={p.slug} />
              <fieldset disabled={p.paused} className="flex flex-col gap-4 disabled:opacity-60">
                <FormField label="Scope">
                  <Textarea name="scope" rows={3} placeholder="What should the study cover?" />
                </FormField>
                <FormField label="Site state">
                  <Select name="state" defaultValue="">
                    <option value="">Choose a state</option>
                    {states.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Start date">
                  <Input name="start" type="month" />
                </FormField>
                <Button type="submit" size="lg" className="w-full">
                  Request a proposal
                </Button>
                <p className="type-caption text-secondary">You can attach P&amp;IDs and drawings in the next step.</p>
              </fieldset>
            </form>
            <AskQuestion product={ref} signedIn={signedIn} company={company} className="w-full" />
          </section>
        </div>
      </div>

      <div className={cx(wrap, "flex max-w-200 flex-col gap-10 pb-16 lg:mx-0 lg:ml-[max(0px,calc((100vw-75rem)/2))]")}>
        {s.scope ? (
          <Block title="Scope of work">
            <p className="type-body text-body">{s.scope}</p>
          </Block>
        ) : null}
        {s.deliverables?.length ? (
          <Block title="Deliverables">
            <ul className="flex flex-col gap-2">
              {s.deliverables.map((d) => (
                <li key={d} className="flex items-center gap-2.5 type-body text-body">
                  <Icon name="check-circle" size={18} className="text-icon-primary" />
                  {d}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}
        {s.standards?.length ? (
          <Block title="Standards covered">
            <ul className="flex flex-wrap gap-2">
              {s.standards.map((x) => (
                <li key={x} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm text-primary">
                  {x}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}
        {s.facts?.length ? (
          <Block title="Typical duration, team and equipment">
            <dl className="flex flex-col divide-y divide-default rounded-card border border-default">
              {s.facts.map((f) => (
                <div
                  key={f.label}
                  className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.6fr)] gap-3 px-4 py-3 max-md:grid-cols-2"
                >
                  <dt className="type-body-sm text-primary">{f.label}</dt>
                  <dd className="type-spec text-primary">{f.value}</dd>
                  <dd className="type-spec text-secondary">{f.unit || "—"}</dd>
                  <dd className="type-caption text-secondary">{f.note}</dd>
                </div>
              ))}
            </dl>
          </Block>
        ) : null}
        {s.faqs?.length ? (
          <Block title="FAQ">
            <div className="flex flex-col divide-y divide-default border-y border-default">
              {s.faqs.map((f) => (
                <details key={f.question} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between type-label text-primary">
                    {f.question}
                    <Icon name="chevron-down" size={18} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pt-2 type-body-sm text-body">{f.answer}</p>
                </details>
              ))}
            </div>
          </Block>
        ) : null}
      </div>
    </main>
  );
}

function ChipList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="type-eyebrow text-secondary">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((i) => (
          <li key={i} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm text-primary">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="type-h3 text-primary">{title}</h2>
      {children}
    </section>
  );
}
