import {
  ACTIVITIES,
  matchSchemes,
  ORGANISATIONS,
  parseAnswers,
  SIZES,
  STAGES,
  STARTUP,
  type Answers,
} from "@h2india/core/schemes";
import { Alert, Breadcrumbs, buttonClasses, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { STATE_OPTIONS } from "@/cms/records/common";
import { schemeStatus } from "@/cms/records/status";
import { dayMonthYear } from "@/news/format";
import { wrap } from "@/news/parts";
import { Checker } from "@/schemes/Checker";
import { allSchemes, schemeView, stateLabel } from "@/schemes/data";
import type { Scheme } from "@/payload-types";

// Scheme eligibility checker (749:4946 to 750:464, step 5.4). Results come only from the rules stored on each scheme
// and ticked "checked" by an editor (M25); with none stored, the page says so. Results are indicative, never advice.
// Alerts for matches ("Set alert", "we'll alert you") come with step 7.3.

export const metadata: Metadata = {
  title: "Scheme eligibility checker · H2 Economy",
  description: "Six questions to see which central and state hydrogen schemes could fit your organisation.",
  alternates: { canonical: "/opportunities/eligibility" },
  robots: { index: true, follow: true },
};
export const dynamic = "force-dynamic";

type Params = Record<string, string | undefined>;

const label = (list: readonly { value: string; label: string }[], v: string) =>
  list.find((o) => o.value === v)?.label ?? v;

function Crumbs() {
  return (
    <Breadcrumbs
      items={[
        { label: "Home", href: "/" },
        { label: "Opportunities", href: "/opportunities" },
        { label: "Schemes", href: "/opportunities/schemes" },
        { label: "Eligibility checker" },
      ]}
      renderLink={(c, className) => (
        <Link href={c.href} className={className}>
          {c.label}
        </Link>
      )}
    />
  );
}

export default async function EligibilityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const schemes = await allSchemes();
  const latest = schemes
    .map((s) => s.verification?.at ?? "")
    .sort()
    .pop();
  const checkedOn = latest ? dayMonthYear(latest) : null;
  const answers = params.edit ? null : parseAnswers(params);
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className={wrap}>
        <div className="mx-auto flex max-w-200 flex-col gap-6 py-8 md:py-10">
          <Crumbs />
          {answers ? (
            <Results answers={answers} schemes={schemes} checkedOn={checkedOn} params={params} />
          ) : (
            <Checker
              schemeCount={schemes.length}
              checkedOn={checkedOn}
              initial={params.edit ? Object.fromEntries(Object.entries(params).filter(([k]) => k !== "edit")) : {}}
              options={{
                organisations: [...ORGANISATIONS],
                states: STATE_OPTIONS.filter((o) => o.value !== "all-india"),
                activities: [...ACTIVITIES],
                sizes: [...SIZES],
                startup: [...STARTUP],
                stages: [...STAGES],
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Answered({ answers, params }: { answers: Answers; params: Params }) {
  const chips = [
    label(ORGANISATIONS, answers.organisation),
    stateLabel(answers.state),
    label(ACTIVITIES, answers.activity),
    answers.size === "not-sure" ? "Size not sure" : label(SIZES, answers.size).replace(" (MSME registered)", " (MSME)"),
    answers.startup === "yes" ? "DPIIT start-up" : answers.startup === "applied" ? "DPIIT applied" : "Not a start-up",
    label(STAGES, answers.stage),
  ];
  const edit = new URLSearchParams(params as Record<string, string>);
  edit.set("edit", "1");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-subtle px-4 py-3">
      <span className="type-label-sm text-primary">Your answers:</span>
      {chips.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5 type-caption text-body">
          <span aria-hidden="true" className="size-1.5 rounded-pill bg-ink-500" />
          {c}
        </span>
      ))}
      <Link href={`/opportunities/eligibility?${edit.toString()}`} className="type-label-sm text-link hover:underline">
        Edit answers
      </Link>
    </div>
  );
}

function Actions({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/opportunities/eligibility" className={buttonClasses({ variant: "outline" })}>
        Start again
      </Link>
      {children}
    </div>
  );
}

function Results({
  answers,
  schemes,
  checkedOn,
  params,
}: {
  answers: Answers;
  schemes: Scheme[];
  checkedOn: string | null;
  params: Params;
}) {
  const now = new Date();
  const result = matchSchemes(
    answers,
    schemes.map((s) => ({
      id: s.id,
      status: schemeStatus({ nextDeadline: s.nextDeadline, override: s.statusOverride }, now),
      rules: s.eligibilityRules ?? null,
      scheme: s,
    })),
  );

  // M25: no scheme has checked rules yet, so nothing can be matched honestly.
  if (result.ruled === 0) {
    return (
      <>
        <Answered answers={answers} params={params} />
        <section className="flex flex-col gap-3 rounded-card bg-mint p-6">
          <Icon name="clipboard-check" size={24} className="text-icon-primary" />
          <h1 className="type-h2 text-primary">Matching rules are being prepared</h1>
          <p className="type-body text-body">
            We&apos;re entering each scheme&apos;s conditions from its official notice. Until that&apos;s done, the
            checker can&apos;t match you to a scheme, and we won&apos;t guess. Browse all {schemes.length} schemes in
            the meantime.
          </p>
        </section>
        <Actions>
          <Link href="/opportunities/schemes" className={buttonClasses({ variant: "primary" })}>
            Browse all schemes
          </Link>
        </Actions>
      </>
    );
  }

  const strong = result.matches.filter((m) => m.strength === "strong").length;
  const possible = result.matches.length - strong;
  if (!result.matches.length) {
    return (
      <>
        <Answered answers={answers} params={params} />
        <section className="flex flex-col gap-3 rounded-card bg-mint p-6">
          <Icon name="search" size={24} className="text-icon-primary" />
          <h1 className="type-h2 text-primary">No open matches right now</h1>
          <p className="type-body text-body">
            None of the {schemes.length} schemes and calls we track is open to{" "}
            {label(ORGANISATIONS, answers.organisation).toLowerCase()}s in {stateLabel(answers.state)} at the{" "}
            {label(STAGES, answers.stage).toLowerCase()} stage today.
          </p>
        </section>
        <Actions>
          <Link href="/opportunities/schemes" className={buttonClasses({ variant: "ghost" })}>
            Browse all schemes
          </Link>
        </Actions>
      </>
    );
  }

  const words = [strong ? `${String(strong)} strong` : null, possible ? `${String(possible)} possible` : null]
    .filter(Boolean)
    .join(" and ");
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="type-eyebrow text-secondary">Your matches</p>
        <h1 className="type-h1 text-primary">
          {words} {result.matches.length === 1 ? "match" : "matches"}
        </h1>
        <p className="type-body text-body">
          Out of {schemes.length} central and state schemes and calls{checkedOn ? `, checked on ${checkedOn}` : ""}.
          Strong means you meet every listed condition we could check; possible means one or more needs checking.
        </p>
      </div>
      <Answered answers={answers} params={params} />
      <Alert tone="success" title="Indicative only">
        This isn&apos;t legal or financial advice. Rules and dates change; always read the official notice before you
        apply.
      </Alert>
      <ul className="flex flex-col gap-4">
        {result.matches.map((m) => {
          const v = schemeView(m.scheme.scheme, now);
          return (
            <li key={m.scheme.id} className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <p className="flex flex-wrap items-center gap-2">
                <span
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 type-label-sm",
                    m.strength === "strong" ? "bg-tint text-primary" : "bg-warning text-warning",
                  )}
                >
                  <Icon name={m.strength === "strong" ? "check-circle" : "alert-triangle"} size={14} />
                  {m.strength === "strong" ? "Strong match" : "Possible match"}
                </span>
                <span className="type-eyebrow text-secondary">
                  {v.level} · {v.status.label}
                </span>
              </p>
              <h2 className="type-h4">
                <Link href={v.href} className="text-link hover:underline">
                  {v.title}
                </Link>
              </h2>
              <p className="type-body-sm text-primary">
                {v.benefit} · {v.deadline}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="type-caption text-secondary">Why it matches</p>
                  <ul className="flex flex-col gap-1.5">
                    {m.why.map((w) => (
                      <li key={w} className="flex items-start gap-2 type-body-sm text-body">
                        <Icon name="check" size={16} className="mt-0.5 shrink-0 text-icon-primary" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
                {m.checkNext.length ? (
                  <div className="flex flex-col gap-2">
                    <p className="type-caption text-secondary">What to check next</p>
                    <ul className="flex flex-col gap-1.5">
                      {m.checkNext.map((c) => (
                        <li key={c} className="flex items-start gap-2 type-body-sm text-body">
                          <Icon name="chevron-right" size={16} className="mt-0.5 shrink-0 text-icon-primary" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <Link href={v.href} className={cx(buttonClasses({ variant: "outline", size: "sm" }), "self-start")}>
                Read the scheme
              </Link>
            </li>
          );
        })}
      </ul>
      <Actions />
    </>
  );
}
