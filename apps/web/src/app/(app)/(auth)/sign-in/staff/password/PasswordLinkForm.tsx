"use client";

import { SIGN_IN } from "@h2india/core/sign-in";
import { Alert, Button, FormField, Icon, Input, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useState, type SyntheticEvent } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "../../../AuthCard";

export function PasswordLinkForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter your work email, like you@company.com");
      return;
    }
    setBusy(true);
    setProblem(undefined);
    const result = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: AUTH_LINKS.staffNewPassword,
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
          If {email.trim()} belongs to H2 Economy staff, we&apos;ve sent a link to set your password. It works for{" "}
          {SIGN_IN.passwordLinkMinutes} minutes and only once.
        </p>
        <TextLink asChild showIcon={false} className="self-start">
          <Link href={AUTH_LINKS.staffSignIn}>Back to sign in</Link>
        </TextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Set or reset your password</h1>
      <p className="type-body text-body">
        Enter your work email. We&apos;ll send a link to choose a password for the back office. Use this the first time
        you sign in, too.
      </p>
      {problem ? <Alert tone="error" title={problem} live /> : null}
      <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label="Work email" error={error}>
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
      <TextLink asChild showIcon={false} className="self-start">
        <Link href={AUTH_LINKS.staffSignIn}>Back to sign in</Link>
      </TextLink>
    </AuthCard>
  );
}
