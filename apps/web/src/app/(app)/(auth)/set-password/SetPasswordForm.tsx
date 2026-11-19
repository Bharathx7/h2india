"use client";

import { newPasswordProblem, SIGN_IN } from "@h2india/core/sign-in";
import { Alert, Button, FormField, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { PasswordInput } from "@/account/PasswordInput";
import { setPasswordAction } from "@/account/password-actions";
import { AuthCard } from "../AuthCard";

// Set your password (A195): for a signed-in person with no password. "Skip for now" keeps signing in by email code,
// except at the end of Join (`fromJoin`), where choosing a password finishes the sign-up.

export function SetPasswordForm({
  email,
  next,
  fromJoin = false,
}: {
  email: string;
  next: string;
  fromJoin?: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<{ password?: string; again?: string }>({});
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: typeof errors = {};
    const rule = newPasswordProblem(password);
    if (rule) found.password = rule;
    if (again !== password) found.again = "The two passwords don't match";
    setErrors(found);
    if (found.password || found.again) return;
    setBusy(true);
    setProblem(undefined);
    const r = await setPasswordAction(password);
    if (r.ok || r.code === "HAS_PASSWORD") {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    if (r.code === "INVALID_NEW") setErrors({ password: r.message });
    else if (r.code === "NOT_SIGNED_IN") setProblem("You've been signed out. Sign in again to set a password.");
    else setProblem("We couldn't set your password. Try again.");
  };

  return (
    <AuthCard>
      <h1 className="type-h2 text-primary">Set your password</h1>
      {fromJoin ? (
        <p className="type-body text-body">
          Your email is confirmed. The link was opened on a different device or browser from the one you signed up on,
          so choose your password here to finish.
        </p>
      ) : null}
      <p className="type-body text-body">
        Next time, sign in with {email} and this password. Use at least {SIGN_IN.passwordMinLength} characters, and
        don&apos;t reuse a password from another site.
      </p>
      {problem ? <Alert tone="error" title={problem} live /> : null}
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
      {fromJoin ? null : (
        <TextLink asChild showIcon={false} className="self-start">
          <Link href={next}>Skip for now</Link>
        </TextLink>
      )}
    </AuthCard>
  );
}
