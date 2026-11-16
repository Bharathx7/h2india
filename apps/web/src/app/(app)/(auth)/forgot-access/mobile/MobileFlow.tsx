"use client";

import { normaliseMobile } from "@h2india/core/companies/client";
import { Alert, Button, FormField, Input } from "@h2india/ui";
import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "../../AuthCard";
import { StatusIcon } from "../../StatusIcon";
import { finishMobileChange, newMobile, verify } from "../actions";
import { CodeField } from "../CodeField";
import { EmailStep } from "../EmailStep";
import { Waiting } from "../Waiting";

export function MobileFlow() {
  const [step, setStep] = useState<"email" | "codes" | "waiting" | "done">("email");
  const [email, setEmail] = useState("");
  const [emailOk, setEmailOk] = useState(false);
  const [mobile, setMobile] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [mobileOk, setMobileOk] = useState(false);
  const [mobileError, setMobileError] = useState<string>();
  const [waitingFor, setWaitingFor] = useState<string>("Waiting for admin");
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);

  const sendTo = (value: string) => {
    const m = normaliseMobile(value);
    if (!m || m === sentTo) return;
    void newMobile(value).then((r) => {
      if (r.ok) {
        setSentTo(r.value);
        setMobileOk(false);
      } else if (r.code === "INVALID_MOBILE") setMobileError("Enter a 10-digit mobile number");
      else setMobileError("We couldn't send the code. Wait a minute and try again.");
    });
  };

  const caption = (n: 1 | 2) => `Changed mobile · step ${String(n)} of 2`;

  if (step === "waiting") {
    return (
      <AuthCard>
        <Waiting
          caption={caption(2)}
          support={waitingFor === "Waiting for support"}
          body={
            waitingFor === "Waiting for support"
              ? `You're the only admin of your company, so H2 Economy support will check your ID and approve the new number within 2 working days. We'll text ${sentTo ?? "your new number"} when it's done.`
              : `Your company admin needs to approve the new number. We'll text ${sentTo ?? "your new number"} when it's done.`
          }
          onAnswer={(s) => {
            setStep(s === "Completed" ? "done" : "waiting");
            if (s === "Declined")
              setProblem("Your admin didn't approve the new number. Contact them, or H2 Economy support.");
          }}
        />
        {problem ? <Alert tone="error" title={problem} live /> : null}
      </AuthCard>
    );
  }

  if (step === "done") {
    return (
      <AuthCard>
        <StatusIcon name="check-circle" />
        <h1 className="type-h2 text-primary">Your new number is saved</h1>
        <p className="type-body text-body">
          We&apos;ll use {sentTo} for codes from now on. We&apos;ve emailed you about the change.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <p className="type-caption text-secondary">{caption(1)}</p>
      <h1 className="type-h2 text-primary">Add your new mobile number</h1>
      <p className="type-body text-body">We&apos;ll check your email first, then send a code to the new number.</p>
      {step === "email" ? (
        <EmailStep
          kind="mobile"
          label="Work email"
          button="Send code"
          onStarted={(v) => {
            setEmail(v.email);
            setStep("codes");
          }}
        />
      ) : (
        <>
          {problem ? <Alert tone="error" title={problem} live /> : null}
          <CodeField
            label={`Code from email (${email})`}
            verifiedLabel="Email verified"
            verified={emailOk}
            onVerify={(c) => verify("email", c)}
            onVerified={() => {
              setEmailOk(true);
            }}
          />
          <FormField label="New mobile number" error={mobileError}>
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              prefix="+91"
              value={mobile}
              disabled={!emailOk}
              onChange={(e) => {
                setMobile(e.target.value);
                setMobileError(undefined);
                if (normaliseMobile(e.target.value)) sendTo(e.target.value);
              }}
            />
          </FormField>
          {sentTo ? (
            <>
              <CodeField
                label="Code from SMS to the new number"
                verifiedLabel="New number verified"
                verified={mobileOk}
                onVerify={(c) => verify("new_mobile", c)}
                onVerified={() => {
                  setMobileOk(true);
                }}
              />
              {mobileOk ? null : (
                <p className="type-caption text-secondary">Didn&apos;t get the SMS? Check the number above.</p>
              )}
            </>
          ) : null}
          <Button
            size="lg"
            className="w-full"
            disabled={busy || !emailOk || !mobileOk}
            onClick={() => {
              setBusy(true);
              void finishMobileChange().then((r) => {
                setBusy(false);
                if (!r.ok) {
                  setProblem("Both codes are needed.");
                  return;
                }
                setWaitingFor(r.value);
                setStep(r.value === "Completed" ? "done" : "waiting");
              });
            }}
          >
            Continue
          </Button>
        </>
      )}
    </AuthCard>
  );
}
