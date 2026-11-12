"use client";

import { JOB_ROLES } from "@h2india/core/companies/client";
import { Button, Checkbox, FormField, Icon, Input, Select } from "@h2india/ui";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

// The report form (736:421) and "Your report is ready" (736:833), step 5.6. The server records the lead with the
// consent words and their version (A33), emails a copy and returns a 5-minute link to the PDF, which starts at once.
// Signed-in members skip the form. Ungated reports download straight away.

type Field = "name" | "email" | "company" | "role";

export interface ReadyInfo {
  url: string;
  filename: string;
  emailed: boolean;
}

export interface OtherReport {
  slug: string;
  title: string;
  meta: string;
}

/** The whole report page below the header: the landing (736:421) until the file is on its way, then 736:833. */
export function ReportFlow({
  slug,
  gated,
  sponsor,
  consentText,
  member,
  cover,
  smallCover,
  header,
  landing,
  title,
  meta,
  others,
  newsletter,
}: {
  slug: string;
  gated: boolean;
  sponsor: string | null;
  consentText: string | null;
  member: boolean;
  cover: ReactNode;
  smallCover: ReactNode;
  header: ReactNode;
  landing: ReactNode;
  title: string;
  meta: string;
  others: OtherReport[];
  newsletter: ReactNode;
}) {
  const [done, setDone] = useState<ReadyInfo | null>(null);
  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 type-label-sm text-link" role="status">
            <Icon name="check-circle" size={18} /> Download started
          </p>
          <h1 className="type-h1 text-primary">Your report is ready</h1>
          <p className="type-body text-body">{title}</p>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <section
              aria-label="Your download"
              className="flex flex-col gap-4 rounded-card border border-default p-5 sm:flex-row"
            >
              {smallCover}
              <div className="flex flex-col gap-2">
                <p className="type-spec text-primary">{done.filename}</p>
                <p className="type-body-sm text-body">
                  {meta}. If the download didn&apos;t start, use the button.
                  {done.emailed ? " We've also emailed a copy to your work email." : ""}
                </p>
                <a
                  href={done.url}
                  className="inline-flex h-11 items-center gap-2 self-start rounded-pill bg-accent px-5 type-label text-primary"
                >
                  <Icon name="download" size={18} /> Download the PDF
                </a>
              </div>
            </section>
            {others.length ? (
              <section aria-labelledby="also" className="flex flex-col gap-3 rounded-card border border-default p-5">
                <h2 id="also" className="type-h4 text-primary">
                  You might also want
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {others.map((o) => (
                    <li key={o.slug} className="flex gap-3">
                      <span aria-hidden="true" className="h-14 w-10 shrink-0 rounded-control bg-inverse" />
                      <span className="flex flex-col">
                        <Link href={`/knowledge/reports/${o.slug}`} className="type-label text-link hover:underline">
                          {o.title}
                        </Link>
                        <span className="type-caption text-secondary">{o.meta}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
          <div className="lg:w-80 lg:shrink-0">{newsletter}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-4">{landing}</div>
        <aside className="lg:w-90 lg:shrink-0">
          <ReportGate
            slug={slug}
            gated={gated}
            sponsor={sponsor}
            consentText={consentText}
            member={member}
            cover={cover}
            onReady={setDone}
          />
        </aside>
      </div>
    </div>
  );
}

function ReportGate({
  slug,
  gated,
  sponsor,
  consentText,
  member,
  cover,
  onReady,
}: {
  slug: string;
  gated: boolean;
  sponsor: string | null;
  consentText: string | null;
  member: boolean;
  cover: ReactNode;
  onReady: (info: ReadyInfo) => void;
}) {
  const [values, setValues] = useState({ name: "", email: "", company: "", role: "", sponsorConsent: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ask = !member && gated;

  const submit = () => {
    setProblem(null);
    start(async () => {
      const res = await fetch(`/api/v1/reports/${encodeURIComponent(slug)}/download`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ask ? values : {}),
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        filename?: string;
        emailed?: boolean;
        error?: { message?: string; field?: Field | null };
      };
      if (!res.ok || !body.url) {
        const field = body.error?.field;
        if (field) setErrors({ [field]: body.error?.message ?? "Check this field" });
        else setProblem(body.error?.message ?? "We couldn’t get the report. Try again.");
        return;
      }
      setErrors({});
      const info = { url: body.url, filename: body.filename ?? "report.pdf", emailed: Boolean(body.emailed) };
      onReady(info);
      window.location.assign(body.url);
    });
  };

  return (
    <section aria-labelledby="get" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <div>
        <h2 id="get" className="type-h4 text-primary">
          Get the free report
        </h2>
        {ask ? <p className="type-caption text-secondary">We&apos;ll email you a copy too.</p> : null}
      </div>
      {cover}
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {ask ? (
          <>
            <FormField label="Full name" required error={errors.name}>
              <Input
                autoComplete="name"
                placeholder="Your full name"
                value={values.name}
                onChange={(e) => {
                  setValues({ ...values, name: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Work email" required error={errors.email}>
              <Input
                type="email"
                autoComplete="email"
                placeholder="name@company.in"
                value={values.email}
                onChange={(e) => {
                  setValues({ ...values, email: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Company" required error={errors.company}>
              <Input
                autoComplete="organization"
                placeholder="Your company, lab or agency"
                value={values.company}
                onChange={(e) => {
                  setValues({ ...values, company: e.target.value });
                }}
              />
            </FormField>
            <FormField label="Your role" error={errors.role}>
              <Select
                value={values.role}
                onChange={(e) => {
                  setValues({ ...values, role: e.target.value });
                }}
              >
                <option value="">Choose one</option>
                {JOB_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </FormField>
            {sponsor && consentText ? (
              <div className="flex flex-col gap-1 rounded-control bg-subtle p-3">
                <Checkbox
                  label={consentText.charAt(0).toUpperCase() + consentText.slice(1)}
                  checked={values.sponsorConsent}
                  onCheckedChange={(on) => {
                    setValues({ ...values, sponsorConsent: on === true });
                  }}
                />
                <p className="pl-7 type-caption text-secondary">
                  Optional. Unticked means the sponsor gets nothing from your download.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
        {problem ? (
          <p role="alert" className="type-caption text-error">
            {problem}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          <Icon name="download" size={18} />
          {ask ? "Get the report" : "Download the PDF"}
        </Button>
      </form>
      {ask ? (
        <p className="type-caption text-secondary">
          Members skip this form.{" "}
          <Link href={`/sign-in?next=/knowledge/reports/${slug}`} className="text-link underline">
            Sign in
          </Link>
        </p>
      ) : null}
    </section>
  );
}
