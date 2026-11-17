"use client";

import { MEMBER_JOIN_PATH } from "@h2india/core/members/rules";
import { ACCOUNT_KINDS, ACCOUNT_PAGES, type AccountKind } from "@h2india/core/sign-in";
import { Alert, Icon, type WorkspaceArea } from "@h2india/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// After signing in on the wrong page (public QC 2, 16 Nov 2026): a buyer who used Supplier sign in lands on their buyer
// dashboard with this note, once (`?signed-in-as=supplier`). Closing it drops the word from the address.

const NOUN: Record<AccountKind, string> = { buyer: "a buyer", supplier: "a supplier", member: "a member" };

export function SignedInAsNote({ area }: { area: WorkspaceArea }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tried = ACCOUNT_KINDS.find((k) => k === params.get("signed-in-as"));
  const own = ACCOUNT_KINDS.find((k) => k === area);
  if (!tried || !own || tried === own) return null;
  return (
    <div className="mb-6">
      <Alert
        tone="info"
        title={`You're signed in to your ${own} account`}
        live
        dismiss={
          <button
            type="button"
            aria-label="Close"
            className="rounded-control type-label text-primary"
            onClick={() => {
              router.replace(pathname);
            }}
          >
            <Icon name="x" size={16} />
          </button>
        }
      >
        {tried === "member" ? (
          // Founder QC (17 Nov 2026): a buyer or supplier joins as a member with this same account, in one click.
          <>
            You aren&apos;t a member yet. You can{" "}
            <a className="underline underline-offset-2" href={MEMBER_JOIN_PATH}>
              join as a member with this account
            </a>{" "}
            and keep your {own} workspace.
          </>
        ) : (
          <>
            This email isn&apos;t registered as {NOUN[tried]}. To create {NOUN[tried]} account, use{" "}
            <a className="underline underline-offset-2" href={ACCOUNT_PAGES[tried].join}>
              {`Create ${NOUN[tried]} account`}
            </a>
            .
          </>
        )}
      </Alert>
    </div>
  );
}
