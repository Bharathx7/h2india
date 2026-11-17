"use client";

import { SIGN_IN } from "@h2india/core/sign-in";
import { Alert, buttonClasses, Button, FormField, Icon, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useState, type SyntheticEvent } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "../../../AuthCard";
import { PasswordInput } from "../StaffSignIn";

export function NewPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<{ password?: string; again?: string }>({});
  const [problem, setProblem] = useState<string>();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <AuthCard>
        <h1 className="type-h2 text-primary">This link has expired</h1>
        <p className="type-body text-body">
          Links to set a password work for {SIGN_IN.passwordLinkMinutes} minutes and only once. Ask for a new one.
        </p>
        <Link href={AUTH_LINKS.staffPassword} className={`${buttonClasses({ size: "lg" })} w-full`}>
          Send a new link
        </Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard>
        <span className="flex size-14 items-center justify-center rounded-pill bg-mint text-primary">
          <Icon name="check" size={28} />
        </span>
        <h1 className="type-h2 text-primary">Password set</h1>
        <p className="type-body text-body">You&apos;ve been signed out everywhere. Sign in with your new password.</p>
        <Link href={AUTH_LINKS.staffSignIn} className={`${buttonClasses({ size: "lg" })} w-full`}>
          Sign in
        </Link>
      </AuthCard>
    );
  }

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (password.length < SIGN_IN.passwordMinLength)
      found.password = `Use at least ${String(SIGN_IN.passwordMinLength)} characters`;
    else if (password.length > SIGN_IN.passwordMaxLength)
      found.password = `Use at most ${String(SIGN_IN.passwordMaxLength)} characters`;
    if (again !== password) found.again = "The two passwords don't match";
    setErrors(found);
    if (found.password || found.again) return;
    setBusy(true);
    setProblem(undefined);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (result.error) {
      setProblem(
        result.error.code === "INVALID_TOKEN"
          ? "This link has expired or was already used. Ask for a new one."
          : "We couldn't set the password. Try again.",
      );
      return;
    }
    setDone(true);
  };

  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Choose a password</h1>
      <p className="type-body text-body">
        For the H2 Economy back office. Use at least {SIGN_IN.passwordMinLength} characters, and don&apos;t reuse a
        password from another site.
      </p>
      {problem ? (
        <Alert tone="error" title={problem} live>
          <TextLink asChild showIcon={false}>
            <Link href={AUTH_LINKS.staffPassword}>Send a new link</Link>
          </TextLink>
        </Alert>
      ) : null}
      <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
        <FormField label="New password" error={errors.password}>
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
          />
        </FormField>
        <FormField label="Type it again" error={errors.again}>
          <PasswordInput
            name="confirm-password"
            autoComplete="new-password"
            value={again}
            onChange={(value) => {
              setAgain(value);
              if (errors.again) setErrors((e) => ({ ...e, again: undefined }));
            }}
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          Set password
        </Button>
      </form>
    </AuthCard>
  );
}
