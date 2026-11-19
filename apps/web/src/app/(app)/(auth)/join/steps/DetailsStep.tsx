"use client";

import { JOB_ROLES } from "@h2india/core/companies/client";
import { newPasswordProblem, SIGN_IN } from "@h2india/core/sign-in";
import { Alert, Button, Checkbox, FormField, Input, Select } from "@h2india/ui";
import Link from "next/link";
import { useState } from "react";
import { PasswordInput } from "@/account/PasswordInput";
import { AUTH_LINKS } from "@/lib/auth-links";
import { submitDetails, type Result } from "../actions";
import { Progress } from "./Progress";

// Join step 3 (Figma 525:207). Founder, 19 Nov 2026 (A195): people sign up with email and a password; the mobile
// number and its SMS code are gone from Join for now (to come back later). Someone already signed in has an account,
// so they aren't asked for a password here (Forgot password sets one).

export interface DetailsDraft {
  email: string | null;
  fullName: string | null;
  jobRole: string | null;
}

type Problem = { title: string; body: string };

function waitText(iso?: string): string {
  if (!iso) return "a minute";
  const s = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  return s < 90 ? `${String(s)} seconds` : `${String(Math.ceil(s / 60))} minutes`;
}

export function DetailsStep(props: {
  member: boolean;
  signedInEmail: string | null;
  draft: DetailsDraft;
  onDone: (href: string) => void;
}) {
  const [email, setEmail] = useState(props.signedInEmail ?? props.draft.email ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(props.draft.fullName ?? "");
  const [jobRole, setJobRole] = useState(props.draft.jobRole ?? "");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formProblem, setFormProblem] = useState<Problem>();
  const [busy, setBusy] = useState(false);
  const needsPassword = !props.signedInEmail;

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!props.signedInEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter your work email, like you@company.com";
    }
    if (needsPassword) {
      const problem = password ? newPasswordProblem(password) : "Choose a password";
      if (problem) next.password = problem;
    }
    if (fullName.trim().length < 2) next.fullName = "Enter your full name";
    if (!jobRole) next.jobRole = "Choose your role from the list";
    if (!terms) next.terms = "Agree to the Terms of use and Privacy policy to continue";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    setFormProblem(undefined);
    const r: Result<string> = await submitDetails({
      email,
      password: needsPassword ? password : undefined,
      fullName,
      jobRole,
      terms,
    });
    setBusy(false);
    if (r.ok) {
      props.onDone(r.value);
      return;
    }
    if (r.code === "INVALID_PASSWORD") {
      setErrors({ password: r.message ?? "Choose another password" });
    } else if (r.code === "RESEND_TOO_SOON" || r.code === "TOO_MANY_CODES") {
      setFormProblem({
        title: "Please wait before asking again",
        body: `You can ask for a new link in ${waitText(r.retryAt)}.`,
      });
    } else {
      setFormProblem({ title: "We couldn't save your details", body: "Check your connection and try again." });
    }
  };

  return (
    <>
      <Progress step={props.member ? 2 : 3} of={props.member ? 2 : 4} label="Your details" />
      <h1 className="type-h2 text-primary">Your details</h1>
      <p className="type-body text-body">Use your work email so colleagues can find you.</p>
      {formProblem ? (
        <Alert tone="error" title={formProblem.title} live>
          {formProblem.body}
        </Alert>
      ) : null}
      <FormField label="Work email" error={errors.email}>
        <Input
          type="email"
          autoComplete={needsPassword ? "username" : "email"}
          value={email}
          readOnly={Boolean(props.signedInEmail)}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </FormField>
      {needsPassword ? (
        <FormField
          label="Password"
          error={errors.password}
          helper={`At least ${String(SIGN_IN.passwordMinLength)} characters. You'll sign in with your email and this password.`}
        >
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (errors.password) setErrors((e) => ({ ...e, password: "" }));
            }}
          />
        </FormField>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FormField label="Full name" error={errors.fullName}>
          <Input
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
            }}
          />
        </FormField>
        <FormField label="Your role" error={errors.jobRole}>
          <Select
            placeholder="Choose your role"
            value={jobRole}
            onChange={(e) => {
              setJobRole(e.target.value);
            }}
          >
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="flex flex-col gap-1">
        <Checkbox
          checked={terms}
          onCheckedChange={(v) => {
            setTerms(v === true);
          }}
          label={
            <span className="type-body text-primary">
              I agree to the{" "}
              <Link href={AUTH_LINKS.terms} className="underline-offset-2 hover:underline">
                Terms of use
              </Link>{" "}
              and{" "}
              <Link href={AUTH_LINKS.privacy} className="underline-offset-2 hover:underline">
                Privacy policy
              </Link>
            </span>
          }
        />
        {errors.terms ? <p className="type-caption text-error">{errors.terms}</p> : null}
      </div>
      <Button size="lg" className="w-full" disabled={busy} onClick={() => void submit()}>
        Continue
      </Button>
    </>
  );
}
