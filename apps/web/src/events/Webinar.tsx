"use client";

import { JOB_ROLES } from "@h2india/core/companies/client";
import { Alert, Button, buttonClasses, Checkbox, cx, FormField, Icon, Input, Select, StatusBadge } from "@h2india/ui";
import Link from "next/link";
import { useFormGuard } from "@/lib/form-guard";
import { useState, useTransition, type ReactNode } from "react";
import { registerWebinar, type RegisterResult } from "@/app/(app)/(site)/events/[slug]/actions";

// Webinar registration (732:521 → "You're registered" 732:939), closed or full with "Email me the replay"
// (827:14696), and the replay gate (733:22); step 5.7. The server checks everything again.

type Field = "name" | "email" | "organisation" | "role" | "mobile";

export interface WebinarInfo {
  slug: string;
  title: string;
  /** "Wed 9 Dec 2026 · 3:00–4:00 PM IST" */
  when: string;
  joinOpens: string;
  /** "2:00 PM" */
  hourBefore: string;
  calendar: { google: string; outlook: string; ics: string };
  pageUrl: string;
  sponsor: string | null;
  consentText: string | null;
}

function Confirmed({
  info,
  mobile,
  sponsorConsent,
  member,
}: {
  info: WebinarInfo;
  mobile: string | null;
  sponsorConsent: boolean;
  member: boolean;
}) {
  const masked = mobile ? `${mobile.slice(0, 3)} ${mobile.slice(3, 8)} ••${mobile.slice(-3)}` : null;
  const share = encodeURIComponent(info.pageUrl);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 type-label-sm text-link" role="status">
          <Icon name="check-circle" size={18} /> Registration confirmed
        </p>
        <h1 className="type-h1 text-primary">You&apos;re registered</h1>
        <p className="type-body text-body">
          {info.title} · {info.when}
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section aria-labelledby="cal" className="flex flex-col gap-3 rounded-card border border-default p-5">
            <div>
              <h2 id="cal" className="type-h4 text-primary">
                Add it to your calendar
              </h2>
              <p className="type-caption text-secondary">
                The invite includes the join link, so you won&apos;t need to find this email again.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Google Calendar", href: info.calendar.google },
                { label: "Outlook", href: info.calendar.outlook },
                { label: "Apple (.ics)", href: info.calendar.ics },
              ].map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.label === "Apple (.ics)" ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: "outline", size: "sm" })}
                >
                  <Icon name="calendar" size={16} /> {c.label}
                </a>
              ))}
            </div>
          </section>
          <section aria-labelledby="join" className="flex flex-col gap-3 rounded-card border border-default p-5">
            <h2 id="join" className="type-h4 text-primary">
              When can I join?
            </h2>
            <ul className="flex flex-col gap-2.5 type-body-sm text-body">
              <li className="flex items-start gap-2.5">
                <Icon name="clock" size={18} className="mt-0.5 shrink-0" /> The join link opens at {info.joinOpens}.
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="mail" size={18} className="mt-0.5 shrink-0" /> We&apos;ve emailed your confirmation. The
                link comes again by email an hour before.
              </li>
              {masked ? (
                <li className="flex items-start gap-2.5">
                  <Icon name="message-square" size={18} className="mt-0.5 shrink-0" /> You asked for a WhatsApp
                  reminder, so we&apos;ll send one at {info.hourBefore} to {masked}.
                </li>
              ) : null}
            </ul>
          </section>
          {info.sponsor ? (
            <section aria-labelledby="details" className="flex flex-col gap-2 rounded-card border border-default p-5">
              <h2 id="details" className="type-h4 text-primary">
                Your details and the sponsor
              </h2>
              <p className="type-body-sm text-body">
                {sponsorConsent
                  ? `You chose to share your details with ${info.sponsor}.`
                  : `You chose not to share your details with ${info.sponsor}.`}{" "}
                You can change this until the webinar starts, from the link in your confirmation email.
              </p>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section aria-labelledby="invite" className="flex flex-col gap-2 rounded-card border border-default p-5">
            <h2 id="invite" className="type-h4 text-primary">
              Invite a colleague
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(info.pageUrl);
              }}
            >
              <Icon name="copy" size={16} /> Copy link
            </Button>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${share}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(buttonClasses({ variant: "outline", size: "sm" }), "w-full")}
            >
              Share on LinkedIn
            </a>
            <a
              href={`https://wa.me/?text=${share}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(buttonClasses({ variant: "outline", size: "sm" }), "w-full")}
            >
              Share on WhatsApp
            </a>
          </section>
          {member ? null : (
            <section aria-labelledby="keep" className="flex flex-col gap-2 rounded-card bg-mint p-5">
              <h2 id="keep" className="type-h4 text-primary">
                Keep your registrations in one place
              </h2>
              <p className="type-body-sm text-body">
                A free member account lists every webinar you&apos;ve joined, with join links and replays.
              </p>
              <Link href="/join" className={cx(buttonClasses({ size: "sm" }), "self-start")}>
                Create a free account
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/** The whole webinar page below the crumbs: details and the form, or "You're registered" once done. */
export function WebinarFlow({
  info,
  member,
  memberName,
  header,
  body,
  state,
}: {
  info: WebinarInfo;
  member: boolean;
  memberName: string | null;
  header: ReactNode;
  body: ReactNode;
  /** "open", or "full" / "closed" for 827:14696. */
  state: "open" | "full" | "closed";
}) {
  const [done, setDone] = useState<{ mobile: string | null; consent: boolean } | null>(null);
  if (done) return <Confirmed info={info} mobile={done.mobile} sponsorConsent={done.consent} member={member} />;
  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-4">{body}</div>
        <aside className="flex flex-col gap-4 lg:w-90 lg:shrink-0">
          {state === "open" ? (
            <RegisterForm info={info} member={member} memberName={memberName} onDone={setDone} />
          ) : (
            <ReplayRequest slug={info.slug} state={state} />
          )}
          <p className="flex items-start gap-2 rounded-card border border-default p-4 type-body-sm text-body">
            <Icon name="clock" size={18} className="mt-0.5 shrink-0" />
            {state === "open"
              ? "Join link opens 15 minutes before. A replay is sent to everyone who registers."
              : "Already registered? Your join link is in your confirmation email and opens 15 minutes before the start."}
          </p>
        </aside>
      </div>
    </div>
  );
}

function RegisterForm({
  info,
  member,
  memberName,
  onDone,
}: {
  info: WebinarInfo;
  member: boolean;
  memberName: string | null;
  onDone: (d: { mobile: string | null; consent: boolean }) => void;
}) {
  const [v, setV] = useState({ name: "", email: "", organisation: "", role: "", mobile: "", sponsorConsent: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { trap, guard } = useFormGuard();
  const set = (k: keyof typeof v, value: string | boolean) => {
    setV((x) => ({ ...x, [k]: value }));
  };
  const submit = () => {
    setProblem(null);
    start(async () => {
      let r: RegisterResult;
      try {
        r = await registerWebinar(info.slug, v, false, guard());
      } catch {
        setProblem("We couldn’t send your form. Check your connection and try again. Your answers are still here.");
        return;
      }
      if (r.ok) {
        onDone({ mobile: r.mobile, consent: v.sponsorConsent });
        window.scrollTo({ top: 0 });
        return;
      }
      if (r.reason === "invalid") setErrors(r.errors ?? {});
      else
        setProblem(
          r.reason === "full"
            ? "This webinar just filled up. Ask for the replay instead."
            : r.reason === "limited"
              ? "Too many registrations from here. Try again in an hour."
              : "Registration has closed.",
        );
    });
  };
  return (
    <section aria-labelledby="register" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
      <div>
        <h2 id="register" className="type-h4 text-primary">
          Register free
        </h2>
        <p className="type-caption text-secondary">
          {member ? "You're signed in: register in one click." : "It takes a minute. Members register in one click."}
        </p>
      </div>
      <form
        noValidate
        className="relative flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {trap}
        {member ? (
          <p className="type-body-sm text-body">Registering as {memberName}.</p>
        ) : (
          <>
            <FormField label="Full name" required error={errors.name}>
              <Input
                autoComplete="name"
                placeholder="Your full name"
                value={v.name}
                onChange={(e) => {
                  set("name", e.target.value);
                }}
              />
            </FormField>
            <FormField label="Work email" required error={errors.email}>
              <Input
                type="email"
                autoComplete="email"
                placeholder="name@company.in"
                value={v.email}
                onChange={(e) => {
                  set("email", e.target.value);
                }}
              />
            </FormField>
            <FormField label="Organisation" required error={errors.organisation}>
              <Input
                autoComplete="organization"
                placeholder="Your company, lab or agency"
                value={v.organisation}
                onChange={(e) => {
                  set("organisation", e.target.value);
                }}
              />
            </FormField>
            <FormField label="Your role" error={errors.role}>
              <Select
                value={v.role}
                onChange={(e) => {
                  set("role", e.target.value);
                }}
              >
                <option value="">Choose one</option>
                {JOB_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </FormField>
          </>
        )}
        <FormField
          label="Mobile for a WhatsApp reminder (optional)"
          error={errors.mobile}
          helper="We send one reminder an hour before. No other messages."
        >
          <Input
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={v.mobile}
            onChange={(e) => {
              set("mobile", e.target.value);
            }}
          />
        </FormField>
        {info.sponsor && info.consentText ? (
          <div className="flex flex-col gap-1 rounded-control bg-subtle p-3">
            <Checkbox
              label={info.consentText}
              checked={v.sponsorConsent}
              onCheckedChange={(on) => {
                set("sponsorConsent", on === true);
              }}
            />
            <p className="pl-7 type-caption text-secondary">
              Optional. If you leave this unticked, the sponsor gets nothing from your registration.
            </p>
          </div>
        ) : null}
        {problem ? <Alert live tone="error" title={problem} /> : null}
        <Button type="submit" disabled={pending} className="w-full">
          Register
        </Button>
      </form>
      {member ? null : (
        <p className="type-caption text-secondary">
          Already a member?{" "}
          <Link href={`/sign-in?next=/events/${info.slug}`} className="text-link underline">
            Sign in to register in one click
          </Link>
        </p>
      )}
    </section>
  );
}

/** "Email me the replay" (827:14696) and the replay gate (733:22). */
export function ReplayRequest({ slug, state }: { slug: string; state: "full" | "closed" | "replay" }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const { trap, guard } = useFormGuard();
  const submit = () => {
    start(async () => {
      const r = await registerWebinar(
        slug,
        { name: "", email, organisation: "", role: "", mobile: "", sponsorConsent: false },
        true,
        guard(),
      ).catch(() => null);
      if (r?.ok) setSent(true);
      else if (r && r.reason === "invalid") setError(r.errors?.email ?? "Enter your work email");
      else setError("We couldn’t send it. Try again.");
    });
  };
  const replay = state === "replay";
  return (
    <section
      aria-labelledby="replay-request"
      className={cx("flex flex-col gap-3 rounded-card p-5", replay ? "bg-page" : "border border-default bg-page")}
    >
      {replay ? (
        <Icon name="lock" size={20} className="text-icon-primary" />
      ) : (
        <>
          <StatusBadge status={state === "full" ? "Full" : "Closed"} tone="warning" className="self-start" />
          <div>
            <h2 className="type-h4 text-primary">Registration closed</h2>
            <p className="type-caption text-secondary">
              {state === "full"
                ? "This webinar is full, so we've stopped taking registrations."
                : "Registration for this webinar has closed."}
            </p>
          </div>
        </>
      )}
      <h2 id="replay-request" className="type-h4 text-primary">
        {replay ? "Enter your work email to watch" : "Watch the replay instead"}
      </h2>
      {sent ? (
        <p role="status" className="type-body-sm text-body">
          Check your inbox: we&apos;ve sent the replay link to {email}.
        </p>
      ) : (
        <form
          noValidate
          className="relative flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {trap}
          <p className="type-body-sm text-body">
            {replay
              ? "Free. If you registered, use the same email and you'll go straight in."
              : "Enter your work email and we'll send you the replay link after the session, with the slides and a summary of the questions."}
          </p>
          <FormField label="Work email" required error={error ?? undefined}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="name@company.in"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </FormField>
          <Button type="submit" disabled={pending} className="w-full">
            {replay ? "Watch the replay" : "Email me the replay"}
          </Button>
          <p className="type-caption text-secondary">
            {replay
              ? "We'll email you the slides too. Unsubscribe at any time."
              : "Your email isn't shared with the sponsor."}
          </p>
        </form>
      )}
    </section>
  );
}
