"use client";

import { AD_INTERESTS, CONTACT_TOPICS, PARTNER_TYPES, SUBMISSION_LIMITS } from "@h2india/core/events/rules";
import { GRIEVANCE_LIMITS, GRIEVANCE_TYPES } from "@h2india/core/grievances/rules";
import {
  Alert,
  Button,
  buttonClasses,
  CategoryChip,
  Checkbox,
  cx,
  FileRow,
  FileUpload,
  FormField,
  Icon,
  Input,
  Radio,
  RadioGroup,
  StatusBadge,
  Textarea,
} from "@h2india/ui";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { useFormGuard } from "@/lib/form-guard";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { Limited, useSubmission } from "@/submissions/forms";
import { ErrorSummary, NetworkError, Success } from "@/submissions/parts";
import { checkComplaint, raiseComplaint, type CheckResult, type RaiseResult } from "./actions";

// The step 5.8 forms: Contact us (66:4591), Partner with H2 Economy (742:8, sent 742:516), Advertise and sponsor
// (741:5605), the grievance form (519:8, ticket 519:538) and Check a complaint (519:588). Contact, partnership and
// advertising go through submitContent() like the step 5.7 forms; the grievance has its own record and clocks.

const card = "flex flex-col gap-4 rounded-card border border-default bg-page p-5 md:p-6";

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  extra,
}: {
  label: string;
  options: readonly T[];
  value: string;
  onChange: (v: T) => void;
  error?: string;
  extra?: ReactNode;
}) {
  return (
    <div role="group" aria-labelledby={`${label}-label`.replace(/\W+/g, "-")} className="flex flex-col gap-2">
      <p id={`${label}-label`.replace(/\W+/g, "-")} className="type-label text-primary">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <CategoryChip
            key={o}
            selected={value === o}
            onClick={() => {
              onChange(o);
            }}
          >
            {o}
          </CategoryChip>
        ))}
        {extra}
      </div>
      {error ? <p className="type-caption text-error">{error}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ contact

const CONTACT_PLACEHOLDER: Record<string, string> = {
  "Supplier onboarding": "Tell us what you make or sell, and which categories you want to list in.",
};

export function ContactForm({ topic }: { topic: string }) {
  const start = CONTACT_TOPICS.some((t) => t.value === topic) ? topic : "Buyer help";
  const f = useSubmission("contact", { topic: start });
  if (f.result?.ok) {
    return (
      <Success
        title="Thanks, we've got your message"
        text="We've emailed you a copy. Most enquiries get a reply within 1 working day."
        reference={f.result.reference}
        actions={[
          { label: "Back to home", href: "/", primary: true },
          { label: "Visit the help centre", href: "/help" },
        ]}
      />
    );
  }
  if (f.network) {
    return (
      <NetworkError
        onRetry={() => {
          f.submit();
        }}
        cancelHref="/"
      />
    );
  }
  return (
    <form
      noValidate
      className={cx(card, "min-w-0 flex-1")}
      onSubmit={(e) => {
        e.preventDefault();
        f.submit();
      }}
    >
      {f.trap}
      <ErrorSummary errors={f.errors} />
      <Limited result={f.result} />
      <Chips
        label="What's this about?"
        options={CONTACT_TOPICS.map((t) => t.value)}
        value={f.text("topic")}
        onChange={(v) => {
          f.set("topic", v);
        }}
        error={f.errors.topic}
        extra={
          <Link
            href="/legal/grievance-officer"
            className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary hover:border-focus"
          >
            Grievance
          </Link>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Your name" required error={f.errors.name}>
          <Input
            autoComplete="name"
            placeholder="Full name"
            value={f.text("name")}
            onChange={(e) => {
              f.set("name", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Work email" required error={f.errors.email}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={f.text("email")}
            onChange={(e) => {
              f.set("email", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Company" required error={f.errors.company}>
          <Input
            autoComplete="organization"
            placeholder="Company name"
            value={f.text("company")}
            onChange={(e) => {
              f.set("company", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Mobile" error={f.errors.mobile}>
          <Input
            type="tel"
            autoComplete="tel"
            placeholder="+91  98200 00000"
            value={f.text("mobile")}
            onChange={(e) => {
              f.set("mobile", e.target.value);
            }}
          />
        </FormField>
      </div>
      <FormField
        label="Message"
        error={f.errors.message}
        helper="For a complaint about content, a listing, privacy or a payment, use the grievance form so you get a ticket number."
      >
        <Textarea
          rows={4}
          showCount
          maxLength={SUBMISSION_LIMITS.contactMessage}
          placeholder={CONTACT_PLACEHOLDER[f.text("topic")] ?? "Tell us what you need."}
          value={f.text("message")}
          onChange={(e) => {
            f.set("message", e.target.value);
          }}
        />
      </FormField>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={f.pending}>
          Send message
        </Button>
        <p className="type-body-sm text-secondary">
          We reply within {CONTACT_TOPICS.find((t) => t.value === f.text("topic"))?.reply ?? "1 working day"}.
        </p>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------------------------------ partnership

export function PartnershipForm() {
  const f = useSubmission("partnership", {});
  const [sent, setSent] = useState<Record<string, string> | null>(null);
  if (f.result?.ok) {
    const s = sent ?? {};
    return (
      <div className="flex max-w-200 flex-col gap-4" role="status">
        <p className="inline-flex items-center gap-2 type-label-sm text-link">
          <Icon name="check-circle" size={16} /> Proposal sent · reference {f.result.reference}
        </p>
        <h2 className="type-h2 text-primary">Thanks, we&apos;ve got your proposal</h2>
        <p className="type-body text-body">We&apos;ll reply to {s.email} within 3 working days.</p>
        <section aria-labelledby="sent" className={card}>
          <h2 id="sent" className="type-h4 text-primary">
            What you sent
          </h2>
          <dl className="flex flex-col divide-y divide-default border-t border-default">
            {[
              ["Organisation", s.organisation],
              ["Partner type", s.partnerType],
              ["Proposal", s.proposal],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 py-2.5">
                <dt className="type-caption text-secondary">{k}</dt>
                <dd className="type-body-sm text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="flex gap-3">
          <Link href="/" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Back to home
          </Link>
          <Link href="/about/mission" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Read our mission
          </Link>
        </div>
      </div>
    );
  }
  if (f.network) {
    return (
      <NetworkError
        onRetry={() => {
          f.submit();
        }}
        cancelHref="/"
      />
    );
  }
  const errorCount = Object.keys(f.errors).length;
  return (
    <form
      noValidate
      className={cx(card, "min-w-0 flex-1")}
      onSubmit={(e) => {
        e.preventDefault();
        setSent({
          organisation: f.text("organisation"),
          partnerType: f.text("partnerType"),
          proposal: f.text("proposal"),
          email: f.text("email"),
        });
        f.submit();
      }}
    >
      <h2 className="type-h4 text-primary">Your proposal</h2>
      {f.trap}
      {errorCount ? (
        <Alert
          live
          tone="error"
          title={`Please check ${errorCount === 1 ? "one field" : `${String(errorCount)} fields`}`}
        >
          {Object.values(f.errors).join(". ")}.
        </Alert>
      ) : null}
      <Limited result={f.result} />
      <FormField label="Organisation" required error={f.errors.organisation}>
        <Input
          autoComplete="organization"
          value={f.text("organisation")}
          onChange={(e) => {
            f.set("organisation", e.target.value);
          }}
        />
      </FormField>
      <div className="flex flex-col gap-2">
        <p id="partner-type" className="type-label text-primary">
          Partner type <span className="text-error">*</span>
        </p>
        <RadioGroup
          aria-labelledby="partner-type"
          value={f.text("partnerType")}
          onValueChange={(x) => {
            f.set("partnerType", x);
          }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {PARTNER_TYPES.map((p) => (
            <Radio
              key={p.value}
              value={p.value}
              className={cx(
                "rounded-card border p-3",
                f.text("partnerType") === p.value ? "border-focus bg-mint" : "border-default",
              )}
              label={
                <span className="flex flex-col gap-0.5">
                  <span className="type-label text-primary">{p.value}</span>
                  <span className="type-caption text-secondary">{p.hint}</span>
                </span>
              }
            />
          ))}
        </RadioGroup>
        {f.errors.partnerType ? <p className="type-caption text-error">{f.errors.partnerType}</p> : null}
      </div>
      <FormField label="Your proposal" required error={f.errors.proposal}>
        <Textarea
          rows={4}
          showCount
          maxLength={SUBMISSION_LIMITS.proposal}
          placeholder="What would we do together, and what would each side bring?"
          value={f.text("proposal")}
          onChange={(e) => {
            f.set("proposal", e.target.value);
          }}
        />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Your name" required error={f.errors.name}>
          <Input
            autoComplete="name"
            value={f.text("name")}
            onChange={(e) => {
              f.set("name", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Work email" required error={f.errors.email}>
          <Input
            type="email"
            autoComplete="email"
            value={f.text("email")}
            onChange={(e) => {
              f.set("email", e.target.value);
            }}
          />
        </FormField>
      </div>
      <FormField label="Phone (optional)" error={f.errors.phone}>
        <Input
          type="tel"
          autoComplete="tel"
          placeholder="98xxx xxxxx"
          value={f.text("phone")}
          onChange={(e) => {
            f.set("phone", e.target.value);
          }}
        />
      </FormField>
      <div>
        <Button type="submit" disabled={f.pending}>
          Send proposal
        </Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------------------------------ advertising

export function AdvertisingForm() {
  const f = useSubmission("advertising", { interests: ["Newsletter"] });
  const interests = Array.isArray(f.v.interests) ? (f.v.interests as string[]) : [];
  if (f.result?.ok) {
    return (
      <div className={card} role="status">
        <h2 className="type-h4 text-primary">Thanks, we&apos;ve got your enquiry</h2>
        <p className="type-body-sm text-body">We reply within 2 working days.</p>
        <p className="type-caption text-secondary">
          Reference <span className="type-spec text-primary">{f.result.reference}</span>
        </p>
      </div>
    );
  }
  return (
    <form
      noValidate
      aria-labelledby="talk"
      className={card}
      onSubmit={(e) => {
        e.preventDefault();
        f.submit();
      }}
    >
      <div>
        <h2 id="talk" className="type-h4 text-primary">
          Talk to us
        </h2>
        <p className="type-caption text-secondary">We reply within 2 working days.</p>
      </div>
      {f.trap}
      <ErrorSummary errors={f.errors} />
      <Limited result={f.result} />
      {f.network ? (
        <Alert live tone="error" title="We couldn't send your form">
          Check your connection and try again. Your answers are still here.
        </Alert>
      ) : null}
      <FormField label="Full name" required error={f.errors.name}>
        <Input
          autoComplete="name"
          placeholder="Your full name"
          value={f.text("name")}
          onChange={(e) => {
            f.set("name", e.target.value);
          }}
        />
      </FormField>
      <FormField label="Work email" required error={f.errors.email}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="name@company.in"
          value={f.text("email")}
          onChange={(e) => {
            f.set("email", e.target.value);
          }}
        />
      </FormField>
      <FormField label="Company" required error={f.errors.company}>
        <Input
          autoComplete="organization"
          placeholder="Your company"
          value={f.text("company")}
          onChange={(e) => {
            f.set("company", e.target.value);
          }}
        />
      </FormField>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 type-label text-primary">Interested in</legend>
        {AD_INTERESTS.map((i) => (
          <Checkbox
            key={i}
            label={i}
            checked={interests.includes(i)}
            onCheckedChange={(on) => {
              f.set("interests", on === true ? [...interests, i] : interests.filter((x) => x !== i));
            }}
          />
        ))}
        {f.errors.interests ? <p className="type-caption text-error">{f.errors.interests}</p> : null}
      </fieldset>
      <FormField label="Message" error={f.errors.message}>
        <Textarea
          rows={4}
          maxLength={SUBMISSION_LIMITS.advertisingMessage}
          placeholder="What would you like to promote, and when?"
          value={f.text("message")}
          onChange={(e) => {
            f.set("message", e.target.value);
          }}
        />
      </FormField>
      <Button type="submit" disabled={f.pending} className="w-full">
        Send enquiry
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------------------------------ grievance

/** `showMobile` is the `mobileFields` switch (founder, 19 Nov 2026): off, the form doesn't ask for a mobile. */
export function GrievanceForm({ type, page, showMobile }: { type: string; page: string; showMobile: boolean }) {
  const [v, setV] = useState<Record<string, string>>({
    type: (GRIEVANCE_TYPES as readonly string[]).includes(type) ? type : "",
    pageUrl: page,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RaiseResult | null>(null);
  const [network, setNetwork] = useState(false);
  const [pending, start] = useTransition();
  const uploads = useUploads("grievance_attachment", { max: GRIEVANCE_LIMITS.files });
  const { trap, guard } = useFormGuard();
  const set = (k: string, value: string) => {
    setV((x) => ({ ...x, [k]: value }));
    if (k in errors) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)));
  };
  const busy = uploads.items.some((i) => i.state === "uploading" || i.state === "checking");
  const send = () => {
    if (busy) return;
    setNetwork(false);
    start(async () => {
      let r: RaiseResult;
      try {
        r = await raiseComplaint(
          {
            type: v.type ?? "",
            pageUrl: v.pageUrl ?? "",
            description: v.description ?? "",
            name: v.name ?? "",
            email: v.email ?? "",
            mobile: v.mobile ?? "",
            files: uploads.items.filter((i) => i.state === "uploaded").map((i) => i.fileId ?? ""),
          },
          guard(),
        );
      } catch {
        setNetwork(true);
        return;
      }
      if (!r.ok && r.reason === "failed") {
        setNetwork(true);
        return;
      }
      setErrors(r.ok ? {} : (r.errors ?? {}));
      setResult(r);
    });
  };

  if (result?.ok) {
    return (
      <div className={cx(card, "items-center py-10 text-center")} role="status">
        <span className="flex size-12 items-center justify-center rounded-pill bg-mint text-icon-primary">
          <Icon name="check-circle" size={24} />
        </span>
        <h2 className="type-h3 text-primary">We&apos;ve received your complaint</h2>
        <p className="max-w-140 type-body text-body">
          We&apos;ll acknowledge it within 24 hours and resolve it within 15 days. We&apos;ve emailed you a copy.
        </p>
        <p className="inline-flex items-center gap-2 rounded-pill bg-subtle px-3 py-1 type-caption text-secondary">
          Ticket <span className="type-spec text-primary">{result.reference}</span>
        </p>
        <div className="flex gap-3">
          <a
            href={`/legal/grievance-officer?ticket=${result.reference}#check`}
            className={buttonClasses({ variant: "outline", size: "sm" })}
          >
            Check status
          </a>
          <Link href="/" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }
  const bad = uploads.items.find((i) => i.state === "error");
  return (
    <form
      noValidate
      aria-labelledby="raise"
      className={cx(card, "min-w-0 flex-1")}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <h2 id="raise" className="type-h3 text-primary">
        Raise a complaint
      </h2>
      {trap}
      <ErrorSummary errors={errors} />
      {result?.reason === "limited" ? (
        <Alert live tone="error" title="Too many complaints from here. Try again in an hour." />
      ) : null}
      {network ? (
        <Alert live tone="error" title="We couldn't send your complaint">
          Check your connection and try again. Your answers are still here.
        </Alert>
      ) : null}
      <Chips
        label="Type of complaint"
        options={GRIEVANCE_TYPES}
        value={v.type ?? ""}
        onChange={(x) => {
          set("type", x);
        }}
        error={errors.type}
      />
      <FormField
        label="Page or listing link"
        required={v.type !== "Other"}
        helper="The page your complaint is about"
        error={errors.pageUrl}
      >
        <Input
          type="url"
          placeholder="https://"
          value={v.pageUrl ?? ""}
          onChange={(e) => {
            set("pageUrl", e.target.value);
          }}
        />
      </FormField>
      <FormField label="What happened?" required error={errors.description}>
        <Textarea
          rows={4}
          showCount
          maxLength={GRIEVANCE_LIMITS.description}
          placeholder="Describe the problem and what you'd like us to do"
          value={v.description ?? ""}
          onChange={(e) => {
            set("description", e.target.value);
          }}
        />
      </FormField>
      <div className="flex flex-col gap-2">
        <p className="type-label text-primary">Attachments (optional)</p>
        <FileUpload
          multiple
          accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
          label="Drop screenshots or documents here or browse"
          hint={`${uploadHint("grievance_attachment")} each, up to 5 files`}
          check={(file) => checkFile("grievance_attachment", file)}
          error={errors.files}
          onFiles={(files) => {
            uploads.add(files);
          }}
        />
        {uploads.items.map((i) => (
          <FileRow
            key={i.localId}
            name={i.name}
            status={i.state}
            progress={i.progress}
            meta={i.meta}
            error={i.problem}
            onRemove={() => {
              uploads.remove(i.localId);
            }}
          />
        ))}
        {bad ? (
          <Alert tone="error" title="File not uploaded">
            Choose a PDF, JPG or PNG up to 10 MB. Everything else you entered is still here.
          </Alert>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Your name" required error={errors.name}>
          <Input
            autoComplete="name"
            placeholder="Full name"
            value={v.name ?? ""}
            onChange={(e) => {
              set("name", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Email" required error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={v.email ?? ""}
            onChange={(e) => {
              set("email", e.target.value);
            }}
          />
        </FormField>
      </div>
      {showMobile ? (
        <FormField label="Mobile" error={errors.mobile}>
          <Input
            type="tel"
            autoComplete="tel"
            placeholder="+91  98200 00000"
            value={v.mobile ?? ""}
            onChange={(e) => {
              set("mobile", e.target.value);
            }}
          />
        </FormField>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || busy}>
          Submit complaint
        </Button>
        <p className="type-body-sm text-secondary">We&apos;ll acknowledge it within 24 hours.</p>
      </div>
    </form>
  );
}

export function GrievanceLookup({ ticket }: { ticket: string }) {
  const [t, setT] = useState(ticket);
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        aria-labelledby="check"
        className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setResult(await checkComplaint(t, email).catch(() => ({ ok: false as const, reason: "invalid" as const })));
          });
        }}
      >
        <h2 id="check" className="scroll-mt-24 type-h4 text-primary">
          Check a complaint
        </h2>
        <Input
          aria-label="Ticket number"
          placeholder="Ticket number, e.g. GRV-2026-00318"
          value={t}
          onChange={(e) => {
            setT(e.target.value);
          }}
        />
        <Input
          aria-label="Email you used"
          type="email"
          autoComplete="email"
          placeholder="The email you used"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <Button type="submit" variant="outline" disabled={pending}>
          Check status
        </Button>
        {result && !result.ok ? (
          <p role="alert" className="type-body-sm text-error">
            {result.reason === "limited"
              ? "Too many checks from here. Try again in an hour."
              : result.reason === "invalid"
                ? "Enter your ticket number and the email you used."
                : "We couldn't find that ticket for that email. Check both and try again."}
          </p>
        ) : null}
      </form>
      {result?.ok ? <GrievanceStatusCard r={result} /> : null}
    </div>
  );
}

function GrievanceStatusCard({ r }: { r: Extract<CheckResult, { ok: true }> }) {
  return (
    <section aria-label={`Status of ${r.reference}`} className={card} role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="type-spec text-primary">{r.reference}</p>
          <p className="type-body-sm text-secondary">
            {r.type} · raised {r.raised}
          </p>
        </div>
        <StatusBadge status={r.status} tone={r.status === "Received" ? "neutral" : "success"} />
      </div>
      <ol className="flex flex-col gap-4">
        {r.steps.map((s, i) => (
          <li key={s.label} className="flex items-start gap-3">
            <span
              className={cx(
                "flex size-6 shrink-0 items-center justify-center rounded-pill type-label-sm",
                s.state === "done" && "bg-accent text-primary",
                s.state === "current" && "bg-inverse text-inverse",
                s.state === "next" && "border border-control text-secondary",
              )}
            >
              {s.state === "done" ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span className="flex flex-col">
              <span className={cx("type-label", s.state === "next" ? "text-secondary" : "text-primary")}>
                {s.label}
              </span>
              {s.line ? <span className="type-caption text-secondary">{s.line}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
