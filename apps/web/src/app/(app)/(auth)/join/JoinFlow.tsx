"use client";

import type { JoinPath } from "@h2india/core/companies/client";
import { ACCOUNT_PAGES } from "@h2india/core/sign-in";
import { TextLink } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthCard } from "../AuthCard";
import { choosePath, pickCompany } from "./actions";
import { CompanyStep } from "./steps/CompanyStep";
import { DetailsStep, type DetailsDraft } from "./steps/DetailsStep";
import { FindStep } from "./steps/FindStep";
import { PathStep } from "./steps/PathStep";
import { SkippedSteps } from "./steps/Progress";

/** The heading over each sign-up page (public QC 2, 16 Nov 2026). */
const SIGN_UP: Record<JoinPath, { title: string; signIn: string }> = {
  buyer: { title: "Create a buyer account", signIn: "Buyer sign in" },
  supplier: { title: "Create a supplier account", signIn: "Supplier sign in" },
  member: { title: "Join as a member", signIn: "Member sign in" },
};

// Join steps 1 to 4 (Figma 525:8). Company path: choose, find your company, your details, company details.
// Member path (decision A5): choose, your details, done. Since public QC 2 (16 Nov 2026) each kind of account has its
// own sign-up page (/join/buyer, /join/supplier, /join/member: `fixedPath`), which skips the choice; /join keeps the
// choice for old links and sends people on to the page they pick.

export type JoinStep = "path" | "find" | "details" | "company";

export function JoinFlow(props: {
  initialStep: JoinStep;
  kind: "buyer" | "supplier" | null;
  /** The option a link asked for (?as=), ahead of a saved draft's choice. */
  preferred?: JoinPath | null;
  /** The sign-up page for one kind of account: no choice step. */
  fixedPath?: JoinPath;
  signedInEmail: string | null;
  draft: DetailsDraft & { path: JoinPath | null };
}) {
  const router = useRouter();
  const [step, setStep] = useState<JoinStep>(props.initialStep);
  const [path, setPath] = useState<JoinPath>(
    props.fixedPath ?? props.kind ?? props.preferred ?? props.draft.path ?? "buyer",
  );
  const fixed = props.fixedPath;

  // A sign-up page records its kind of account in the draft, as the choice step would.
  useEffect(() => {
    if (fixed) void choosePath(fixed);
  }, [fixed]);
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
    // Company details on this same page: change the step instead of loading the page again.
    if (href === `${fixed ? ACCOUNT_PAGES[fixed].join : "/join"}?step=company`) {
      setStep("company");
      router.refresh();
      return;
    }
    router.push(href);
  };

  return (
    <div ref={card}>
      <SkippedSteps.Provider value={fixed ? 1 : 0}>
        <AuthCard>
          {fixed ? <p className="type-label-sm text-secondary">{SIGN_UP[fixed].title}</p> : null}
          {step === "path" ? (
            <PathStep
              value={path}
              onChange={setPath}
              busy={busy}
              signedIn={Boolean(props.signedInEmail)}
              onContinue={() => {
                setBusy(true);
                // The choice page sends people on to that kind of account's own sign-up page.
                void choosePath(path).then(() => {
                  router.push(ACCOUNT_PAGES[path].join);
                });
              }}
            />
          ) : null}
          {step === "find" ? (
            <FindStep
              busy={busy}
              onBack={
                fixed
                  ? undefined
                  : () => {
                      setStep("path");
                    }
              }
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
            <DetailsStep
              member={path === "member"}
              signedInEmail={props.signedInEmail}
              draft={props.draft}
              onDone={go}
            />
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
          {fixed && !props.signedInEmail ? (
            <p className="flex flex-wrap items-center gap-1 border-t border-default pt-4 type-body-sm text-body">
              Already have an account?{" "}
              <TextLink asChild showIcon={false}>
                <Link href={ACCOUNT_PAGES[fixed].signIn}>{SIGN_UP[fixed].signIn}</Link>
              </TextLink>
            </p>
          ) : null}
        </AuthCard>
      </SkippedSteps.Provider>
    </div>
  );
}
