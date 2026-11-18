"use client";

import { formatIstTime, SIGN_IN, SIGN_IN_ERROR } from "@h2india/core/sign-in";
import { Alert, Button, buttonClasses, FormField, Icon, Input, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode, type SyntheticEvent } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { authClient, type SignInErrorDetail } from "@/lib/auth-client";
import { AuthCard } from "../../AuthCard";
import { whereNext } from "../actions";

// The back-office sign-in (founder, 17 Nov 2026, A183): H2 Economy staff sign in with their work email and a password.
// Passkeys were removed. No frame draws it; it uses the sign-in card and the sign-in screen's messages.

interface Problem {
  title: string;
  body?: ReactNode;
}

/** A password box with Show password (the eye toggles; the button says which way). */
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  name = "password",
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  name?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <Input
      type={shown ? "text" : "password"}
      name={name}
      autoComplete={autoComplete}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      trailing={
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => {
            setShown((s) => !s);
          }}
          className="flex size-8 cursor-pointer items-center justify-center rounded-control text-icon-secondary hover:bg-subtle"
        >
          <Icon name="eye" size={20} />
        </button>
      }
    />
  );
}

/** The staff form's words; the test-account sign-in (/sign-in/test) passes its own. */
const STAFF_WORDS = {
  title: "Sign in to the H2 Economy back office",
  intro: "For H2 Economy staff. Use your work email and password.",
  emailLabel: "Work email",
};

export function StaffSignIn({
  next,
  initialError,
  signedInElsewhere = false,
  words = STAFF_WORDS,
  passwordLink = true,
  landing,
}: {
  next: string;
  initialError?: Problem;
  /** Already signed in as someone who isn't staff: only Sign out is offered. */
  signedInElsewhere?: boolean;
  words?: typeof STAFF_WORDS;
  /** "Set or forgot your password?" (staff only: test accounts get their password from the founder). */
  passwordLink?: boolean;
  /** Where to go after signing in, instead of whereNext(next). */
  landing?: () => Promise<string>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [problem, setProblem] = useState<Problem | undefined>(initialError);
  const [busy, setBusy] = useState(false);

  const alert = problem ? (
    <Alert tone="error" title={problem.title} live>
      {problem.body}
    </Alert>
  ) : null;

  if (signedInElsewhere) {
    return (
      <AuthCard>
        <h1 className="type-h2 text-primary">{words.title}</h1>
        {alert}
        <a href="/sign-out" className={`${buttonClasses({ variant: "outline", size: "lg" })} w-full`}>
          Sign out
        </a>
      </AuthCard>
    );
  }

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) found.email = "Enter your work email, like you@company.com";
    if (!password) found.password = "Enter your password";
    setErrors(found);
    if (found.email || found.password) return;
    setBusy(true);
    setProblem(undefined);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    if (!error) {
      const to = landing ? await landing() : await whereNext(next);
      router.replace(to);
      router.refresh();
      return;
    }
    setBusy(false);
    setPassword("");
    const detail: SignInErrorDetail = error;
    if (detail.code === SIGN_IN_ERROR.suspended) {
      setProblem({
        title: "This account is suspended",
        body: "To appeal, reply to the email we sent you or write to the grievance officer.",
      });
    } else if (detail.code === SIGN_IN_ERROR.paused) {
      setProblem({
        title: `Sign-in paused for ${String(SIGN_IN.pauseMinutes)} minutes`,
        body: `There were too many wrong passwords. You can try again at ${formatIstTime(detail.until ? new Date(detail.until) : new Date(Date.now() + SIGN_IN.pauseMinutes * 60_000))}.`,
      });
    } else if (detail.code === SIGN_IN_ERROR.wrongPassword) {
      const left = detail.triesLeft;
      setProblem({
        title: "Email or password is wrong",
        body:
          left === undefined
            ? "Check them and try again."
            : `Check them and try again. You have ${String(left)} ${left === 1 ? "try" : "tries"} left before we pause sign-in for ${String(SIGN_IN.pauseMinutes)} minutes.`,
      });
    } else if (detail.status === 429) {
      setProblem({ title: "Too many tries", body: "Wait a minute and try again." });
    } else {
      setProblem({ title: "We couldn't sign you in", body: "Check your connection and try again." });
    }
  };

  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">{words.title}</h1>
      <p className="type-body text-body">{words.intro}</p>
      {alert}
      <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label={words.emailLabel} error={errors.email}>
          <Input
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
          />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <PasswordInput
            value={password}
            autoComplete="current-password"
            onChange={(value) => {
              setPassword(value);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          Sign in
        </Button>
      </form>
      {passwordLink ? (
        <TextLink asChild showIcon={false} className="self-start">
          <Link href={AUTH_LINKS.staffPassword}>Set or forgot your password?</Link>
        </TextLink>
      ) : null}
    </AuthCard>
  );
}
