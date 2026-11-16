"use client";

import { Alert, Button, Checkbox } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";
import { acceptInvitationAction } from "./team-actions";

// Accept invitation (step 8.7). Someone who joined by invitation, not through Join, hasn't agreed to the Terms yet:
// they tick the same box Join shows (525:207) before accepting (admin QC, 16 Nov 2026).

export function AcceptInvite({
  token,
  workspace,
  needsTerms = false,
}: {
  token: string;
  workspace: string;
  needsTerms?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      {needsTerms ? (
        <div className="flex flex-col gap-1">
          <Checkbox
            checked={terms}
            onCheckedChange={(v) => {
              setTerms(v === true);
              setTermsError("");
            }}
            label={
              <span className="type-body text-primary">
                I agree to the{" "}
                <Link href={AUTH_LINKS.terms} className="underline underline-offset-2">
                  Terms of use
                </Link>{" "}
                and{" "}
                <Link href={AUTH_LINKS.privacy} className="underline underline-offset-2">
                  Privacy policy
                </Link>
              </span>
            }
          />
          {termsError ? <p className="type-caption text-error">{termsError}</p> : null}
        </div>
      ) : null}
      <Button
        className="self-start"
        disabled={pending}
        onClick={() => {
          if (needsTerms && !terms) {
            setTermsError("Agree to the Terms of use and Privacy policy to continue");
            return;
          }
          start(async () => {
            const r = await acceptInvitationAction(token, terms);
            if (r.ok) router.push(workspace);
            else setError(r.error);
          });
        }}
      >
        Accept invitation
      </Button>
    </div>
  );
}
