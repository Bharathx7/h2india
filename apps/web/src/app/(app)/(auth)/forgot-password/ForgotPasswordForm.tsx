"use client";

import { ACCOUNT_PAGES, PASSWORD_PAGES, SIGN_IN, type AccountKind } from "@h2india/core/sign-in";
import { Alert, Button, FormField, Icon, Input, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useState, type SyntheticEvent } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "../AuthCard";

// Forgot password (A195): email → "If an account exists, we've sent a link". Also how someone who always signed in
// with a code sets their first password. No frame draws it; it uses the sign-in card and plain words.

export function ForgotPasswordForm({ audience }: { audience?: AccountKind }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const signIn = ACCOUNT_PAGES[audience ?? "buyer"].signIn;

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter your email, like you@company.com");
      return;
    }
    setBusy(true);
    setProblem(undefined);
    const result = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: audience ? `${PASSWORD_PAGES.reset}?as=${audience}` : PASSWORD_PAGES.reset,
    });
    setBusy(false);
    if (result.error) {
      setProblem(
        result.error.status === 429
          ? "Too many links asked for. Wait a few minutes and try again."
          : "We couldn't send the link. Check your connection and try again.",
      );
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard>
        <span className="flex size-14 items-center justify-center rounded-pill bg-subtle text-primary">
          <Icon name="mail" size={28} />
        </span>
        <h1 className="type-h2 text-primary">Check your email</h1>
        <p className="type-body text-body">
          If an account exists for {email.trim()}, we&apos;ve sent a link to choose a new password. It works for{" "}
          {SIGN_IN.passwordLinkMinutes} minutes and only once.
        </p>
        <TextLink asChild showIcon={false} className="self-start">
          <Link href={signIn}>Back to sign in</Link>
        </TextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Forgot your password?</h1>
      <p className="type-body text-body">
        Enter the email you sign in with. We&apos;ll send a link to choose a new password. Use this the first time you
        set a password, too.
      </p>
      {problem ? <Alert tone="error" title={problem} live /> : null}
      <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label="Email" error={error}>
          <Input
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(undefined);
            }}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          Send link
        </Button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TextLink asChild showIcon={false}>
          <Link href={signIn}>Back to sign in</Link>
        </TextLink>
        <TextLink asChild showIcon={false}>
          <Link href={AUTH_LINKS.forgotAccess}>Can&apos;t reach your email?</Link>
        </TextLink>
      </div>
    </AuthCard>
  );
}
