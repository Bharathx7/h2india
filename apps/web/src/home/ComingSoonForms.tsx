"use client";

import Link from "next/link";
import { useFormGuard } from "@/lib/form-guard";
import { PRODUCT_CLASSES } from "@h2india/core/catalogue";
import { Alert, Button, Checkbox, cx, FormField, Icon, Input, Select } from "@h2india/ui";
import { useState, type SyntheticEvent } from "react";
import {
  requestEarlyListing,
  subscribeToNewsletter,
  type EarlyListingInput,
  type EarlyListingResult,
  type SubscribeResult,
} from "@/server/public-forms";

// The two forms on the Coming soon page (743:6871; phones 743:7095).

const TOPICS = [
  { key: "news", label: "News" },
  { key: "tenders-schemes", label: "Tenders & schemes" },
  { key: "products", label: "Products" },
  { key: "jobs", label: "Jobs" },
];

/** India H₂ Weekly sign-up with the drawn states (743:7293): submitting, success, already subscribed, invalid email. */
export function NewsletterSignup() {
  const [topics, setTopics] = useState<string[]>(["news", "tenders-schemes"]);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const { trap, guard } = useFormGuard();

  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setResult(await subscribeToNewsletter({ email, topics, source: "coming-soon", guard: guard() }));
    setSending(false);
  };

  if (result?.status === "sent") {
    return (
      <Alert tone="success" title="Check your inbox to confirm" live data-testid="newsletter-sent">
        We&rsquo;ve sent a link to {result.email}. Your first issue arrives the Monday after you confirm.
      </Alert>
    );
  }
  if (result?.status === "already") {
    return (
      <Alert tone="info" title="You're already subscribed" live data-testid="newsletter-already">
        This email already gets India H₂ Weekly. We&rsquo;ve sent you a link to change your topics.
      </Alert>
    );
  }
  const invalid = result?.status === "invalid" ? result.message : undefined;
  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className="relative flex flex-col gap-3"
      aria-label="Get India H₂ Weekly"
    >
      {trap}
      <div role="group" aria-label="Topics" className="flex flex-wrap gap-2">
        {TOPICS.map((t) => {
          const on = topics.includes(t.key);
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              disabled={sending}
              onClick={() => {
                setTopics((all) => (on ? all.filter((k) => k !== t.key) : [...all, t.key]));
              }}
              className={cx(
                "inline-flex h-8 items-center gap-2 rounded-pill border px-3.25 type-label transition-colors",
                on ? "border-transparent bg-inverse text-inverse" : "border-control text-primary hover:border-focus",
              )}
            >
              {on ? <Icon name="check" size={16} /> : null}
              {t.label}
            </button>
          );
        })}
      </div>
      <FormField label="Your work email" error={invalid} className="[&>label]:sr-only">
        <Input
          type="email"
          autoComplete="email"
          leadingIcon="mail"
          placeholder="Your work email"
          value={email}
          disabled={sending}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={sending} className="w-full">
        {sending ? "Subscribing…" : "Get India H₂ Weekly"}
      </Button>
      {result?.status === "error" ? (
        <p role="alert" className="type-caption text-error">
          {result.message}
        </p>
      ) : null}
      <p className="type-caption text-secondary">
        One email a week. Unsubscribe any time. See our{" "}
        <Link href="/legal/privacy" className="text-link underline underline-offset-4 hover:text-link-hover">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

const EMPTY: EarlyListingInput = { company: "", name: "", email: "", mobile: "", sells: "", consent: false };

/** "Are you a supplier? Get listed early" (743:6988, A47). */
export function EarlyListingForm({ consentText }: { consentText: string }) {
  const [value, setValue] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<EarlyListingResult | null>(null);
  const { trap, guard } = useFormGuard();
  const set = <K extends keyof EarlyListingInput>(key: K, v: EarlyListingInput[K]) => {
    setValue((all) => ({ ...all, [key]: v }));
  };
  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setResult(await requestEarlyListing(value, guard()));
    setSending(false);
  };
  if (result?.ok) {
    return (
      <Alert tone="success" title="Thanks, we'll be in touch" live data-testid="early-listing-sent">
        Our team will contact you at {value.email} to set up your company profile before launch.
      </Alert>
    );
  }
  const errors = result?.ok === false ? result.errors : {};
  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      className="relative flex flex-col gap-4"
      aria-label="Get listed early"
    >
      {trap}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField label="Company" required error={errors.company}>
          <Input
            placeholder="Your company"
            autoComplete="organization"
            value={value.company}
            onChange={(e) => {
              set("company", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Your name" required error={errors.name}>
          <Input
            placeholder="Full name"
            autoComplete="name"
            value={value.name}
            onChange={(e) => {
              set("name", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Work email" required error={errors.email}>
          <Input
            type="email"
            placeholder="name@company.in"
            autoComplete="email"
            value={value.email}
            onChange={(e) => {
              set("email", e.target.value);
            }}
          />
        </FormField>
        <FormField label="Mobile" required error={errors.mobile}>
          <Input
            type="tel"
            placeholder="98765 43210"
            autoComplete="tel-national"
            inputMode="tel"
            value={value.mobile}
            onChange={(e) => {
              set("mobile", e.target.value);
            }}
          />
        </FormField>
      </div>
      <FormField label="What do you sell?" required error={errors.sells}>
        <Select
          value={value.sells}
          onChange={(e) => {
            set("sells", e.target.value);
          }}
        >
          <option value="" disabled>
            Choose a category
          </option>
          {PRODUCT_CLASSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="flex flex-col gap-1">
        <Checkbox
          label={consentText}
          checked={value.consent}
          onCheckedChange={(v) => {
            set("consent", v === true);
          }}
        />
        {errors.consent ? <p className="type-caption text-error">{errors.consent}</p> : null}
      </div>
      {errors.form ? (
        <p role="alert" className="type-caption text-error">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={sending} className="self-start">
        {sending ? "Sending…" : "Get listed early"}
      </Button>
    </form>
  );
}
