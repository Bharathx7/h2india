"use client";

import { Alert, Button, Icon } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "../../AuthCard";
import { whereNext } from "../../sign-in/actions";
import { signInWithRecovery, verify } from "../actions";
import { CodeField } from "../CodeField";
import { EmailStep } from "../EmailStep";

interface Passkey {
  id: string;
  name?: string | null;
  createdAt: Date | string;
}

const day = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));

export function PasskeyFlow() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "verify" | "create">("email");
  const [who, setWho] = useState<{ email: string; maskedMobile: string | null }>();
  const [emailOk, setEmailOk] = useState(false);
  const [mobileOk, setMobileOk] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState<Passkey[]>([]);

  useEffect(() => {
    if (step !== "create") return;
    void authClient.passkey.listUserPasskeys().then((r) => {
      setKeys((r.data as Passkey[] | null) ?? []);
    });
  }, [step]);

  const caption = (n: 1 | 2) => <p className="type-caption text-secondary">Lost passkey · step {n} of 2</p>;

  if (step === "create") {
    return (
      <AuthCard>
        {caption(2)}
        <h1 className="type-h2 text-primary">Create a new passkey</h1>
        <p className="type-body text-body">
          Use this device&apos;s fingerprint, face or screen lock to sign in next time.
        </p>
        {problem ? <Alert tone="error" title={problem} live /> : null}
        <Button
          size="lg"
          leadingIcon="lock"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setProblem(undefined);
            void authClient.passkey.addPasskey({ name: navigator.platform || "This device" }).then(async (r) => {
              setBusy(false);
              if (r.error) {
                if (!/cancel|abort|not allowed/i.test(r.error.message ?? ""))
                  setProblem("We couldn't create the passkey. Try again.");
                return;
              }
              router.replace(await whereNext("/"));
              router.refresh();
            });
          }}
        >
          Create passkey
        </Button>
        {keys.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="type-label text-primary">Your passkeys</h2>
            <ul className="overflow-hidden rounded-card border border-default">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center gap-3 border-b border-default p-3 last:border-b-0">
                  <Icon name="lock" size={16} className="text-primary" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="type-label text-primary">{k.name ?? "Passkey"}</p>
                    <p className="type-caption text-secondary">Added {day(k.createdAt)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Remove ${k.name ?? "passkey"}`}
                    onClick={() => {
                      void authClient.passkey.deletePasskey({ id: k.id }).then(() => {
                        setKeys((all) => all.filter((x) => x.id !== k.id));
                      });
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Alert tone="info" title="We'll tell your company admins">
          If you belong to a company, its admins get an email that you recovered your account.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      {caption(1)}
      <h1 className="type-h2 text-primary">Verify it&apos;s you</h1>
      {step === "email" ? (
        <>
          <p className="type-body text-body">Enter your work email. We&apos;ll send codes to it and to your mobile.</p>
          <EmailStep
            kind="passkey"
            label="Work email"
            button="Send codes"
            onStarted={(v) => {
              setWho(v);
              setStep("verify");
            }}
          />
        </>
      ) : (
        <>
          <p className="type-body text-body">We sent codes to your work email and your mobile. Enter both.</p>
          {problem ? <Alert tone="error" title={problem} live /> : null}
          <CodeField
            label={`Code from email (${who?.email ?? ""})`}
            verifiedLabel="Email verified"
            verified={emailOk}
            onVerify={(c) => verify("email", c)}
            onVerified={() => {
              setEmailOk(true);
            }}
          />
          <CodeField
            label={`Code from SMS (${who?.maskedMobile ?? "your mobile on file"})`}
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
            disabled={busy || !emailOk || !mobileOk}
            onClick={() => {
              setBusy(true);
              void signInWithRecovery().then((r) => {
                setBusy(false);
                if (r.ok) setStep("create");
                else setProblem("Both codes are needed. Enter the code from your email and from SMS.");
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
