"use client";

import { memberJoinHref } from "@h2india/core/members/rules";
import { buttonClasses, Icon } from "@h2india/ui";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

// What a signed-in buyer or supplier who isn't a member sees on a Directory page (founder QC, 17 Nov 2026): the
// Directory is for members. Join as member brings them back to this page. A single company profile, linked from
// products and RFQs, stays open to them. No Figma frame: built like DirectoryGate.

function JoinLink() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <JoinHref back={`${pathname}${query ? `?${query}` : ""}`} />;
}

function JoinHref({ back }: { back: string }) {
  return (
    <Link href={memberJoinHref(back)} className={buttonClasses({})}>
      Join as member
    </Link>
  );
}

function PathOnly() {
  return <JoinHref back={usePathname()} />;
}

export function MembersOnly() {
  return (
    <main id="main" className="bg-mint px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto flex max-w-140 flex-col gap-5 rounded-card border border-default bg-page p-6 md:p-10">
        <span className="flex size-12 items-center justify-center rounded-card bg-mint text-primary">
          <Icon name="users" size={24} />
        </span>
        <h1 className="type-h2 text-primary">The Directory is for members</h1>
        <p className="type-body text-body">
          Browse India&apos;s hydrogen companies, people, start-ups and associations, follow them and get alerts. Join
          as a member with your account: it&apos;s free and takes one click. You keep your workspace.
        </p>
        <div className="flex flex-wrap gap-3">
          <Suspense fallback={<PathOnly />}>
            <JoinLink />
          </Suspense>
        </div>
        <p className="type-body-sm text-secondary">
          A supplier&apos;s company profile stays open from its products and quotes, without joining.
        </p>
      </div>
    </main>
  );
}
