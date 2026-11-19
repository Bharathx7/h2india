"use client";

import { formatIstTime, newPasswordProblem, PASSWORD_PAGES, SIGN_IN } from "@h2india/core/sign-in";
import { Alert, Button, FormField, TextLink } from "@h2india/ui";
import Link from "next/link";
import { useState, type SyntheticEvent } from "react";
import { PasswordInput } from "./PasswordInput";
import { changePasswordAction } from "./password-actions";

// Change password (founder, 19 Nov 2026, A195): current, new, and the new one again. Signs the person out on their
// other devices. Mount it on a Sign-in and security page; no frame draws it, so it uses the form components and plain
// words. Someone with no password yet is pointed to Set your password instead.

type Errors = { current?: string; next?: string; again?: string };

export function ChangePassword({ hasPassword = true }: { hasPassword?: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState<string>();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!hasPassword) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="type-h4 text-primary">Password</h2>
        <p className="type-body text-body">
          You don&apos;t have a password yet. Set one to sign in without waiting for a code.
        </p>
        <TextLink asChild showIcon={false} className="self-start">
          <Link href={PASSWORD_PAGES.set}>Set a password</Link>
        </TextLink>
      </div>
    );
  }

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: Errors = {};
    if (!current) found.current = "Enter your current password";
    const rule = newPasswordProblem(next);
    if (rule) found.next = rule;
    else if (next === current) found.next = "Choose a password you haven't used here before";
    if (again !== next) found.again = "The two passwords don't match";
    setErrors(found);
    if (found.current || found.next || found.again) return;
    setBusy(true);
    setProblem(undefined);
    setDone(false);
    const r = await changePasswordAction(current, next);
    setBusy(false);
    if (r.ok) {
      setCurrent("");
      setNext("");
      setAgain("");
      setDone(true);
      return;
    }
    if (r.code === "WRONG_PASSWORD") {
      setCurrent("");
      setErrors({
        current: `That isn't your current password. You have ${String(r.triesLeft)} ${r.triesLeft === 1 ? "try" : "tries"} left before we pause changes for ${String(SIGN_IN.pauseMinutes)} minutes.`,
      });
    } else if (r.code === "PAUSED") {
      setProblem(`Too many wrong passwords. You can try again at ${formatIstTime(new Date(r.until))}.`);
    } else if (r.code === "INVALID_NEW") {
      setErrors({ next: r.message });
    } else if (r.code === "NOT_SIGNED_IN") {
      setProblem("You've been signed out. Sign in again to change your password.");
    } else {
      setProblem("We couldn't change your password. Try again.");
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)} noValidate>
      <h2 className="type-h4 text-primary">Change password</h2>
      {done ? (
        <Alert tone="success" title="Password changed" live>
          You&apos;ve been signed out on your other devices.
        </Alert>
      ) : null}
      {problem ? <Alert tone="error" title={problem} live /> : null}
      <FormField label="Current password" error={errors.current}>
        <PasswordInput
          name="current-password"
          autoComplete="current-password"
          value={current}
          onChange={(value) => {
            setCurrent(value);
            if (errors.current) setErrors((e) => ({ ...e, current: undefined }));
          }}
        />
      </FormField>
      <FormField
        label="New password"
        error={errors.next}
        helper={`At least ${String(SIGN_IN.passwordMinLength)} characters. Don't reuse a password from another site.`}
      >
        <PasswordInput
          name="new-password"
          autoComplete="new-password"
          value={next}
          onChange={(value) => {
            setNext(value);
            if (errors.next) setErrors((e) => ({ ...e, next: undefined }));
          }}
        />
      </FormField>
      <FormField label="Type the new password again" error={errors.again}>
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
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={busy}>
          Change password
        </Button>
        <TextLink asChild showIcon={false}>
          <Link href={PASSWORD_PAGES.forgot}>Forgot your password?</Link>
        </TextLink>
      </div>
    </form>
  );
}
