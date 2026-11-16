import { salaryLabel } from "@h2india/core/opportunities/rules";
import type { CompanyDocument } from "@h2india/core/search";
import { Alert, buttonClasses, cx, OrgCard, StatusBadge } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { dayMonthYear } from "@/news/format";
import type { Job } from "@/payload-types";
import { Crumbs, JobCards, Section, wrap } from "./parts";
import { initialsOf, type JobView } from "./views";

// The job page (live 465:6591, closed 465:7367, preview 468:7854; step 5.5). One layout for all three so the preview
// shows exactly what readers will see. Applying happens on the company's own site (A70).

export type JobMode = "live" | "expired" | "preview";

function Chip({ children }: { children: ReactNode }) {
  return (
    <li className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary">
      {children}
    </li>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 type-body text-body marker:text-icon-secondary">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

export function JobPage({
  job: j,
  mode,
  company,
  similar,
  saveHref,
  alertHref,
}: {
  job: Job;
  mode: JobMode;
  company?: CompanyDocument;
  similar: JobView[];
  saveHref: string;
  alertHref: string;
}) {
  const salary = salaryLabel(j.salaryBand);
  const where = [j.location, j.workMode].filter(Boolean).join(" · ");
  const closes = dayMonthYear(j.closesAt);
  const posted = dayMonthYear(j.postedAt ?? j.createdAt);
  const companyLine = j.companyLine ?? (company ? [company.types[0], company.city].filter(Boolean).join(" · ") : null);
  const facts = [
    { label: "Job type", value: j.jobType },
    {
      label: "Location",
      value: [j.location, [j.workMode?.toLowerCase(), j.locationNote].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" · "),
    },
    { label: "Experience", value: j.experience },
    { label: "Salary", value: salary },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));
  const inert = mode === "preview";

  return (
    <>
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-3 py-8")}>
          <Crumbs
            items={[
              { label: "Opportunities", href: "/opportunities" },
              { label: "Jobs", href: "/opportunities/jobs" },
              { label: j.role },
            ]}
          />
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-control bg-page type-label text-primary">
              {company?.initials ?? initialsOf(j.company)}
            </span>
            <span className="flex flex-col">
              {company && !inert ? (
                <Link href={company.href} className="type-label-sm text-link hover:underline">
                  {j.company}
                </Link>
              ) : (
                <span className="type-label-sm text-link">{j.company}</span>
              )}
              {companyLine ? <span className="type-caption text-secondary">{companyLine}</span> : null}
            </span>
          </div>
          <h1 className="max-w-200 type-h1 text-primary">{j.role}</h1>
          <ul className="flex flex-wrap items-center gap-2" aria-label="About this job">
            {mode === "expired" ? (
              <li>
                <StatusBadge status="Closed" tone="neutral" />
              </li>
            ) : null}
            <Chip>{where}</Chip>
            {j.jobType ? <Chip>{j.jobType}</Chip> : null}
            {j.experience ? <Chip>{j.experience}</Chip> : null}
            {salary ? <Chip>{salary}</Chip> : null}
          </ul>
          <p className="type-caption text-secondary">
            {mode === "preview"
              ? `Draft · closes ${closes}`
              : mode === "expired"
                ? `Posted ${posted} · closed ${closes}`
                : `Posted ${posted} · closes ${closes}`}
          </p>
        </div>
      </div>

      <div className={cx(wrap, "flex flex-col gap-8 py-8 lg:flex-row lg:items-start lg:gap-12")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-8">
          {mode === "expired" ? (
            <Alert tone="success" title="This job is no longer taking applications">
              It closed on {closes}. See similar roles below, or set a job alert for{" "}
              {(j.function ?? "similar").toLowerCase()} roles.
            </Alert>
          ) : null}
          <Section id="role" title="About the role">
            <p className="type-body whitespace-pre-line text-body">{j.description}</p>
          </Section>
          {(j.duties ?? []).length ? (
            <Section id="do" title="What you’ll do">
              <List items={(j.duties ?? []).map((d) => d.item)} />
            </Section>
          ) : null}
          {(j.needs ?? []).length ? (
            <Section id="need" title="What you’ll need">
              <List items={(j.needs ?? []).map((d) => d.item)} />
            </Section>
          ) : null}
          {(j.skills ?? []).length ? (
            <Section id="skills" title="Skills">
              <ul className="flex flex-wrap gap-2">
                {(j.skills ?? []).map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </ul>
            </Section>
          ) : null}
          {company ? (
            <Section id="company" title="About the company">
              <div className="max-w-110">
                <OrgCard
                  name={company.title}
                  type={company.types[0]}
                  place={[company.city, company.state].filter(Boolean).join(", ")}
                  initials={company.initials}
                  gstVerified={company.verified}
                  summary={company.categories.length ? company.categories.join(", ") : company.summary}
                  href={company.href}
                  quoteHref={`/rfq/new?supplier=${encodeURIComponent(company.href.split("/").at(-1) ?? "")}`}
                  renderLink={({ href, className, children }) => (
                    <Link href={href} className={className}>
                      {children}
                    </Link>
                  )}
                />
              </div>
            </Section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section
            aria-labelledby="apply"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
          >
            {mode === "expired" ? (
              <>
                <h2 id="apply" className="type-h4 text-primary">
                  Applications closed
                </h2>
                <a href="#similar" className={cx(buttonClasses({ variant: "primary" }), "w-full")}>
                  See similar jobs
                </a>
                <Link href={alertHref} className={cx(buttonClasses({ variant: "outline" }), "w-full")}>
                  Create a job alert
                </Link>
                <p className="type-caption text-secondary">Closed {closes}.</p>
              </>
            ) : (
              <>
                <h2 id="apply" className="type-h4 text-primary">
                  Apply for this job
                </h2>
                {inert ? (
                  <span className={cx(buttonClasses({ variant: "primary" }), "w-full")}>Apply on company site ↗</span>
                ) : (
                  <a
                    href={`/opportunities/jobs/${j.slug}/apply`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cx(buttonClasses({ variant: "primary" }), "w-full")}
                  >
                    Apply on company site ↗<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
                {inert ? (
                  <span className={cx(buttonClasses({ variant: "outline" }), "w-full")}>Save job</span>
                ) : (
                  <Link href={saveHref} className={cx(buttonClasses({ variant: "outline" }), "w-full")}>
                    Save job
                  </Link>
                )}
                <p className="type-caption text-secondary">You’ll leave H2 Economy to apply. Closes {closes}.</p>
              </>
            )}
          </section>
          {facts.length ? (
            <section
              aria-labelledby="facts"
              className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
            >
              <h2 id="facts" className="type-h4 text-primary">
                Job facts
              </h2>
              <dl className="flex flex-col gap-3">
                {facts.map((f) => (
                  <div key={f.label} className="flex flex-col gap-0.5">
                    <dt className="type-eyebrow text-secondary">{f.label}</dt>
                    <dd className="type-body-sm text-primary">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {inert ? null : (
            <Link
              href={`/contact?about=${encodeURIComponent(`job:${j.slug}`)}`}
              className="self-start type-label-sm text-link hover:underline"
            >
              Report this job
            </Link>
          )}
        </aside>
      </div>

      {similar.length && !inert ? (
        <section
          aria-labelledby="similar-jobs"
          id="similar"
          className={cx(wrap, "flex scroll-mt-24 flex-col gap-4 pb-16")}
        >
          <h2 id="similar-jobs" className="type-h2 text-primary">
            Similar jobs
          </h2>
          <JobCards items={similar} columns={4} />
        </section>
      ) : null}
    </>
  );
}
