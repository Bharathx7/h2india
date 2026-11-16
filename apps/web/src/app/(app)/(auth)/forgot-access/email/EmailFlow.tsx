"use client";

import { Alert, Button, FormField, Input } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuthCard } from "../../AuthCard";
import { StatusIcon } from "../../StatusIcon";
import { whereNext } from "../../sign-in/actions";
import { addNewEmail, askAdminForEmail, signInWithRecovery, verify } from "../actions";
import { CodeField } from "../CodeField";
import { EmailStep } from "../EmailStep";
import { Waiting } from "../Waiting";
import { SupportRequestForm, SupportRequestSent, type Sent } from "./SupportRequest";

type Step = "choose" | "email" | "mobile" | "waiting" | "new-email" | "sent";

export function EmailFlow(props: { signedIn: boolean; confirmed: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [masked, setMasked] = useState<string | null>(null);
  const [mobileOk, setMobileOk] = useState(false);
  const [waitingFor, setWaitingFor] = useState("Waiting for admin");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  const onAnswer = useCallback((s: string) => {
    if (s === "Approved") {
      void signInWithRecovery().then((r) => {
        if (r.ok) setStep("new-email");
        else setProblem("We couldn't sign you in. Start again.");
      });
    } else if (s === "Declined") {
      setProblem("Your admin didn't confirm it's you. Contact them, or send H2 Economy a support request.");
    }
  }, []);

  if (props.confirmed) {
    return (
      <AuthCard>
        <StatusIcon name="check-circle" />
        <h1 className="type-h2 text-primary">Email confirmed</h1>
        <p className="type-body text-body">Your new work email is now your sign-in email.</p>
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            void whereNext("/").then((to) => {
              router.replace(to);
            });
          }}
        >
          Continue
        </Button>
      </AuthCard>
    );
  }

  if (sent) {
    return (
      <AuthCard>
        <SupportRequestSent sent={sent} />
      </AuthCard>
    );
  }

  if (step === "waiting") {
    return (
      <AuthCard>
        <Waiting
          caption="Lost email"
          support={waitingFor === "Waiting for support"}
          body={
            waitingFor === "Waiting for support"
              ? "H2 Economy support will check your ID with your company and approve within 2 working days. Keep this page open, or come back to it in this browser."
              : "Your company admin needs to confirm it's you. Keep this page open, or come back to it in this browser."
          }
          onAnswer={onAnswer}
        />
        {problem ? <Alert tone="error" title={problem} live /> : null}
      </AuthCard>
    );
  }

  if (step === "new-email" || step === "sent") {
    return (
      <AuthCard>
        <p className="type-caption text-secondary">Lost email</p>
        <h1 className="type-h2 text-primary">{step === "sent" ? "Check your inbox" : "Add your new work email"}</h1>
        {step === "sent" ? (
          <p className="type-body text-body">
            We sent a link to {newEmail}. Open it to make it your sign-in email. The link works for 24 hours.
          </p>
        ) : (
          <form
            className="flex flex-col gap-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              void addNewEmail(newEmail).then((r) => {
                setBusy(false);
                if (r.ok) setStep("sent");
                else if (r.code === "EMAIL_TAKEN") setEmailError("That email already has an H2 Economy account");
                else setEmailError("Enter your new work email, like you@company.com");
              });
            }}
          >
            <p className="type-body text-body">Your admin confirmed it&apos;s you. Add the email you use now.</p>
            <FormField label="New work email" error={emailError}>
              <Input
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailError(undefined);
                }}
              />
            </FormField>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              Send link
            </Button>
          </form>
        )}
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <p className="type-caption text-secondary">Lost email</p>
      <h1 className="type-h2 text-primary">Lost access to your work email</h1>
      {problem ? <Alert tone="error" title={problem} live /> : null}
      {step === "choose" ? (
        <>
          <p className="type-body text-body">Choose the quickest way back in.</p>
          <Alert tone="info" title="Fastest: mobile code and admin confirmation">
            Verify your mobile, and your company admin confirms it&apos;s you. Usually done the same day.
          </Alert>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              setStep("email");
            }}
          >
            Use my mobile and admin
          </Button>
          <SupportRequestForm onSent={setSent} />
        </>
      ) : null}
      {step === "email" ? (
        <>
          <p className="type-body text-body">
            Enter the work email on your account. We&apos;ll send a code to your mobile.
          </p>
          <EmailStep
            kind="email"
            label="Work email on your account"
            button="Send code"
            onStarted={(v) => {
              setMasked(v.maskedMobile);
              setStep("mobile");
            }}
          />
        </>
      ) : null}
      {step === "mobile" ? (
        <>
          <CodeField
            label={`Code from SMS (${masked ?? "your mobile on file"})`}
            verifiedLabel="Mobile verified"
            verified={mobileOk}
            onVerify={(c) => verify("mobile", c)}
            onVerified={() => {
              setMobileOk(true);
            }}
          />
          <Button
            size="lg"
            className="w-full"
            disabled={busy || !mobileOk}
            onClick={() => {
              setBusy(true);
              void askAdminForEmail().then((r) => {
                setBusy(false);
                if (!r.ok) {
                  setProblem("Enter the code from SMS first.");
                  return;
                }
                setWaitingFor(r.value);
                setStep("waiting");
              });
            }}
          >
            Continue
          </Button>
        </>
      ) : null}
    </AuthCard>
  );
}
