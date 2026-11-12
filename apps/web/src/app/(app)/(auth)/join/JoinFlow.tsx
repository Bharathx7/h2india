"use client";

import type { JoinPath } from "@h2india/core/companies/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthCard } from "../AuthCard";
import { choosePath, pickCompany } from "./actions";
import { CompanyStep } from "./steps/CompanyStep";
import { DetailsStep, type DetailsDraft } from "./steps/DetailsStep";
import { FindStep } from "./steps/FindStep";
import { PathStep } from "./steps/PathStep";

// Join steps 1 to 4 (Figma 525:8). Company path: choose, find your company, your details, company details.
// Member path (decision A5): choose, your details, done.

export type JoinStep = "path" | "find" | "details" | "company";

export function JoinFlow(props: {
  initialStep: JoinStep;
  kind: "buyer" | "supplier" | null;
  signedInEmail: string | null;
  draft: DetailsDraft & { path: JoinPath | null };
}) {
  const router = useRouter();
  const [step, setStep] = useState<JoinStep>(props.initialStep);
  const [path, setPath] = useState<JoinPath>(props.draft.path ?? props.kind ?? "buyer");
  const [busy, setBusy] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // A new step is a new screen: move focus to its heading so screen readers announce it.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const h1 = card.current?.querySelector("h1");
    h1?.setAttribute("tabindex", "-1");
    h1?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const go = (href: string) => {
    if (href === "/join?step=company") {
      setStep("company");
      router.refresh();
      return;
    }
    router.push(href);
  };

  return (
    <div ref={card}>
      <AuthCard>
        {step === "path" ? (
          <PathStep
            value={path}
            onChange={setPath}
            busy={busy}
            signedIn={Boolean(props.signedInEmail)}
            onContinue={() => {
              setBusy(true);
              void choosePath(path).then(() => {
                setBusy(false);
                setStep(path === "member" ? "details" : "find");
              });
            }}
          />
        ) : null}
        {step === "find" ? (
          <FindStep
            busy={busy}
            onBack={() => {
              setStep("path");
            }}
            onPick={(organisationId) => {
              setBusy(true);
              void pickCompany(organisationId).then(() => {
                setBusy(false);
                setStep("details");
              });
            }}
          />
        ) : null}
        {step === "details" ? (
          <DetailsStep member={path === "member"} signedInEmail={props.signedInEmail} draft={props.draft} onDone={go} />
        ) : null}
        {step === "company" ? (
          <CompanyStep
            kind={props.kind ?? (path === "supplier" ? "supplier" : "buyer")}
            onDone={go}
            onBack={
              props.initialStep === "company"
                ? undefined
                : () => {
                    setStep("find");
                  }
            }
          />
        ) : null}
      </AuthCard>
    </div>
  );
}
