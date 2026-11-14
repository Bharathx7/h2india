import { buttonClasses, Icon } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";

// Error 404 (66:5295, phone 73:6808) and Error 500 (679:443, phone 679:572), step 5.10: words as drawn, a search
// box that goes to /search, quick links, and the two actions. The 500 shows a reference so support can find the
// logged error.

export function ErrorPage({
  code,
  title,
  text,
  chips,
  primary,
  reference,
}: {
  code: 404 | 500;
  title: string;
  text: string;
  chips: { label: string; href: string }[];
  primary: ReactNode;
  reference?: string;
}) {
  return (
    <main id="main" className="flex flex-col items-center px-4 pt-12 pb-20 text-center md:pt-20 md:pb-24">
      <div className="flex w-full max-w-140 flex-col items-center gap-4">
        <p className="type-eyebrow text-secondary">Error {code}</p>
        <h1 className="type-h1 text-primary">{title}</h1>
        <p className="type-body text-body">{text}</p>
        <form action="/search" method="get" role="search" className="w-full">
          <label className="flex h-11 items-center gap-2 rounded-control border border-control bg-page px-3">
            <Icon name="search" size={18} className="text-icon-secondary" />
            <span className="sr-only">Search</span>
            <input
              name="q"
              type="search"
              placeholder="Search products, suppliers or specs"
              className="h-full w-full bg-transparent text-left type-body text-primary outline-none placeholder:text-placeholder"
            />
          </label>
        </form>
        <div className="hidden flex-wrap justify-center gap-2 md:flex">
          {chips.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary hover:border-focus"
            >
              {c.label}
            </Link>
          ))}
        </div>
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          {primary}
          <Link href="/contact" className={buttonClasses({ variant: "outline" })}>
            Contact us
          </Link>
        </div>
        {reference ? (
          <p className="type-caption text-secondary">
            Reference <span className="type-spec text-primary">{reference}</span>: quote it if you contact us.
          </p>
        ) : null}
      </div>
    </main>
  );
}

export function NotFoundContent() {
  return (
    <ErrorPage
      code={404}
      title="We couldn’t find that page"
      text="The link may be old, or the product may have been removed. Search for it, or ask suppliers directly."
      chips={[
        { label: "Electrolysers", href: "/search?q=Electrolysers" },
        { label: "Fuel cells", href: "/search?q=Fuel%20cells" },
        { label: "Storage tanks", href: "/search?q=Storage%20tanks" },
        { label: "Compressors", href: "/search?q=Compressors" },
      ]}
      primary={
        <Link href="/rfq/new" className={buttonClasses({})}>
          Request a quote
        </Link>
      }
    />
  );
}
