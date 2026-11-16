"use client";

import { buttonClasses, Icon } from "@h2india/ui";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AUTH_LINKS } from "@/lib/auth-links";

// What a signed-out visitor sees on any /directory page (public QC, 16 Nov 2026). Sign in brings them back to the
// page they asked for. No Figma frame: built from the auth card's parts (524:1772) inside the site chrome.

/** Sign in, back to this page with its filters (the query needs a Suspense boundary; the fallback keeps the path). */
function SignInLink() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <SignInHref back={`${pathname}${query ? `?${query}` : ""}`} />;
}

function SignInHref({ back }: { back: string }) {
  return (
    <Link href={`${AUTH_LINKS.signIn}?next=${encodeURIComponent(back)}`} className={buttonClasses({})}>
      Sign in
    </Link>
  );
}

function PathOnly() {
  return <SignInHref back={usePathname()} />;
}

export function DirectoryGate() {
  return (
    <main id="main" className="bg-mint px-4 py-16 md:px-6 md:py-24">
      <div className="mx-auto flex max-w-140 flex-col gap-5 rounded-card border border-default bg-page p-6 md:p-10">
        <span className="flex size-12 items-center justify-center rounded-card bg-mint text-primary">
          <Icon name="building" size={24} />
        </span>
        <h1 className="type-h2 text-primary">Sign in to open the Directory</h1>
        <p className="type-body text-body">
          The Directory of companies, people and associations in India&apos;s hydrogen ecosystem is for H2 India
          members, buyers and suppliers.
        </p>
        <div className="flex flex-wrap gap-3">
          <Suspense fallback={<PathOnly />}>
            <SignInLink />
          </Suspense>
          <Link href={AUTH_LINKS.join} className={buttonClasses({ variant: "outline" })}>
            Join H2 India
          </Link>
        </div>
        <p className="type-body-sm text-body">
          Joining as an individual?{" "}
          <Link href="/for-members" className="text-primary underline underline-offset-2">
            See what members get
          </Link>
        </p>
      </div>
    </main>
  );
}
