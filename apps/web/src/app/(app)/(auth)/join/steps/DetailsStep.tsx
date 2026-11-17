"use client";

import { JOB_ROLES, JOIN, normaliseMobile } from "@h2india/core/companies/client";
import { Alert, Button, Checkbox, FormField, Icon, Input, OtpInput, Select } from "@h2india/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { checkCode, sendCode, submitDetails, type Result } from "../actions";
import { Progress } from "./Progress";

// Join step 3 (Figma 525:207; mobile code error 526:384). Mobile is for verification and recovery only (C6).

export interface DetailsDraft {
  email: string | null;
  mobile: string | null;
  mobileVerified: boolean;
  fullName: string | null;
  jobRole: string | null;
}

type Problem = { title: string; body: string; retry?: boolean };

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
  const [mobile, setMobile] = useState(props.draft.mobile?.replace(/^\+91\s*/, "") ?? "");
  const [sentTo, setSentTo] = useState<string | null>(props.draft.mobileVerified ? props.draft.mobile : null);
  const [verified, setVerified] = useState(props.draft.mobileVerified);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const [mobileError, setMobileError] = useState<string>();
  const [sendProblem, setSendProblem] = useState<Problem>();
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [fullName, setFullName] = useState(props.draft.fullName ?? "");
  const [jobRole, setJobRole] = useState(props.draft.jobRole ?? "");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formProblem, setFormProblem] = useState<Problem>();
  const [busy, setBusy] = useState<"send" | "check" | "submit">();

  useEffect(() => {
    if (resendAt <= now) return;
    const t = setTimeout(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearTimeout(t);
    };
  }, [resendAt, now]);

  const send = async () => {
    setMobileError(undefined);
    setSendProblem(undefined);
    if (!normaliseMobile(mobile)) {
      setMobileError("Enter a 10-digit mobile number");
      return;
    }
    setBusy("send");
    const r = await sendCode(mobile);
    setBusy(undefined);
    if (r.ok) {
      setSentTo(r.value);
      setVerified(false);
      setCode("");
      setCodeError(undefined);
      const at = Date.now();
      setNow(at);
      setResendAt(at + JOIN.mobileResendSeconds * 1000);
      return;
    }
    if (r.code === "INVALID_MOBILE") setMobileError("Enter a 10-digit mobile number");
    else if (r.code === "RESEND_TOO_SOON") {
      setSendProblem({
        title: "Please wait before asking again",
        body: `You can ask for a new code in ${waitText(r.retryAt)}.`,
      });
    } else if (r.code === "TOO_MANY_CODES" || r.code === "PAUSED") {
      setSendProblem({ title: "Too many codes for this number", body: `Try again in ${waitText(r.retryAt)}.` });
    } else {
      setSendProblem({
        title: "We couldn't send the code",
        body: "Check the number and try again. If it keeps failing, try again in a few minutes.",
        retry: true,
      });
    }
  };

  const check = async (value: string) => {
    if (!sentTo || value.length < 6 || busy === "check") return;
    setBusy("check");
    const r = await checkCode(sentTo, value);
    setBusy(undefined);
    if (r.ok) {
      setVerified(true);
      setCodeError(undefined);
      return;
    }
    if (r.code === "EXPIRED_CODE") setCodeError("That code has expired. Send a new one.");
    else if (r.code === "PAUSED") setCodeError(`Too many wrong codes. Try again in ${waitText(r.retryAt)}.`);
    else {
      const left = r.triesLeft ?? 0;
      setCodeError(
        left > 0
          ? `That code didn't work. You have ${String(left)} ${left === 1 ? "try" : "tries"} left.`
          : "That code didn't work. Send a new one.",
      );
    }
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!props.signedInEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter your work email, like you@company.com";
    }
    if (!verified) next.mobile = "Confirm your mobile number with the code we send";
    if (fullName.trim().length < 2) next.fullName = "Enter your full name";
    if (!jobRole) next.jobRole = "Choose your role from the list";
    if (!terms) next.terms = "Agree to the Terms of use and Privacy policy to continue";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy("submit");
    setFormProblem(undefined);
    const r: Result<string> = await submitDetails({ email, fullName, jobRole, terms });
    setBusy(undefined);
    if (r.ok) {
      props.onDone(r.value);
      return;
    }
    if (r.code === "RESEND_TOO_SOON" || r.code === "TOO_MANY_CODES") {
      setFormProblem({
        title: "Please wait before asking again",
        body: `You can ask for a new link in ${waitText(r.retryAt)}.`,
      });
    } else {
      setFormProblem({ title: "We couldn't save your details", body: "Check your connection and try again." });
    }
  };

  const waiting = Math.max(0, Math.ceil((resendAt - now) / 1000));

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
          autoComplete="email"
          value={email}
          readOnly={Boolean(props.signedInEmail)}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </FormField>
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <FormField label="Mobile" error={mobileError ?? errors.mobile} className="min-w-0 flex-1">
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              prefix="+91"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                if (verified) setVerified(false);
              }}
            />
          </FormField>
          <Button
            variant="outline"
            className={(mobileError ?? errors.mobile) ? "mb-7" : ""}
            disabled={busy === "send" || waiting > 0 || verified}
            onClick={() => void send()}
          >
            {sentTo && waiting > 0 ? "Code sent" : sentTo && !verified ? "Resend code" : "Send code"}
          </Button>
        </div>
      </div>
      {sendProblem ? (
        <div className="flex flex-col gap-3">
          <Alert tone="error" title={sendProblem.title} live>
            {sendProblem.body}
          </Alert>
          {sendProblem.retry ? (
            <Button variant="outline" className="self-start" onClick={() => void send()}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
      {sentTo && !verified ? (
        <FormField label="Code from SMS" error={codeError}>
          <OtpInput
            size="field"
            label="Code from SMS"
            value={code}
            onChange={(v) => {
              setCode(v);
              if (codeError) setCodeError(undefined);
            }}
            onComplete={(v) => void check(v)}
            disabled={busy === "check"}
          />
        </FormField>
      ) : null}
      {verified ? (
        <p className="flex items-center gap-2 type-caption text-success" role="status">
          <Icon name="check-circle" size={16} />
          Mobile number verified
        </p>
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
      <Button size="lg" className="w-full" disabled={busy === "submit"} onClick={() => void submit()}>
        Continue
      </Button>
    </>
  );
}
