"use client";

import { Button, cx, Icon } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { openHeaderSearch } from "@/components/HeaderSearch";
import { searchPageHref } from "@/search/present";

// Hero search (783:7523; phones 381:5864): scope chips, the search field and Popular links. Products and companies open
// the /search page (step 5.2); news, schemes and tenders, which that page doesn't list, open the header search overlay
// on their scope. On the dark hero (founder upgrade, 18 Nov 2026) the chips are glass on ink and the chosen scope is
// the accent; the field stays a white pill so it is the brightest thing in the band.

const SCOPES = [
  { id: "products", label: "Products" },
  { id: "companies", label: "Companies" },
  { id: "news", label: "News" },
  { id: "schemes", label: "Schemes" },
  { id: "tenders", label: "Tenders" },
] as const;

const POPULAR = [
  { label: "Electrolysers", href: "/marketplace/systems/electrolysers" },
  { label: "Fuel cells", href: "/marketplace/systems/fuel-cell-systems" },
  { label: "Storage tanks", href: "/marketplace/components/tanks-cylinders" },
  { label: "Refuelling stations", href: "/marketplace/systems/refuelling-stations-modules" },
  { label: "SIGHT scheme", href: "/opportunities/schemes/sight" },
];

const chip = cx(
  "inline-flex items-center rounded-pill border-[1.5px] type-label whitespace-nowrap",
  "transition-[background-color,border-color,color,scale] duration-(--motion-duration-fast) ease-standard active:scale-[0.97]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fresh-300",
);
const glass = "border-neutral-0/24 bg-neutral-0/6 text-inverse hover:border-neutral-0/64 hover:bg-neutral-0/12";

export function HeroSearch() {
  const router = useRouter();
  const [scope, setScope] = useState<(typeof SCOPES)[number]["id"]>("products");
  const [query, setQuery] = useState("");
  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (scope === "products" || scope === "companies") router.push(searchPageHref(q, scope));
    else openHeaderSearch({ query: q, scope });
  };
  return (
    <>
      <div
        role="group"
        aria-label="Search in"
        className="hero-reveal -mx-4 flex gap-3 overflow-x-auto px-4 [animation-delay:120ms] [scrollbar-width:none] md:mx-0 md:gap-2 md:overflow-visible md:px-0"
      >
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scope === s.id}
            onClick={() => {
              setScope(s.id);
            }}
            className={cx(
              chip,
              "h-11 shrink-0 px-3.75 md:h-9 md:px-3.5",
              scope === s.id ? "border-transparent bg-accent text-primary" : glass,
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <form role="search" onSubmit={submit} className="hero-reveal flex flex-col gap-4 [animation-delay:160ms]">
        <label
          className={cx(
            "flex h-12 items-center gap-2 rounded-pill border border-input bg-page px-4 shadow-ink-float focus-within:field-focus",
            "md:h-15.5 md:gap-3 md:py-1.5 md:pr-1.5 md:pl-5",
          )}
        >
          <Icon name="search" size={24} className="hidden text-icon-primary md:block" />
          <Icon name="search" size={20} className="text-icon-primary md:hidden" />
          <span className="sr-only">Search H2 Economy</span>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Search products, companies, schemes"
            className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none md:type-body-lg"
          />
          <span className="hidden md:block">
            <Button type="submit" size="lg">
              Search
            </Button>
          </span>
        </label>
        <span className="md:hidden">
          <Button type="submit" size="lg" className="w-full">
            Search
          </Button>
        </span>
      </form>
      {/* Popular (founder QC, 17 Nov 2026): the label on its own line so every chip starts on one edge; a swipeable row
          like the scope chips on phones and tablets, an even 3 + 2 grid of equal chips once the hero column is wide. */}
      <div className="hero-reveal flex flex-col gap-2 [animation-delay:200ms]">
        <p id="hero-popular" className="type-label-sm text-neutral-0/64">
          Popular
        </p>
        <ul
          aria-labelledby="hero-popular"
          className="-mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0 xl:grid xl:grid-cols-3 xl:overflow-visible"
        >
          {POPULAR.map((p) => (
            <li key={p.label} className="shrink-0 snap-start">
              <Link
                href={p.href}
                className={cx(chip, glass, "h-11 px-3.75 md:h-8 md:px-2.75 xl:w-full xl:justify-center")}
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
