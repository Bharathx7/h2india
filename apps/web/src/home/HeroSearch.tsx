"use client";

import { Button, CategoryChip, cx, Icon } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { openHeaderSearch } from "@/components/HeaderSearch";
import { searchPageHref } from "@/search/present";

// Hero search (783:7523; phones 381:5864): scope chips, the search field and Popular links. Products and companies open
// the /search page (step 5.2); news, schemes and tenders, which that page doesn't list, open the header search overlay
// on their scope.

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

const chip =
  "inline-flex items-center rounded-pill border-[1.5px] border-control bg-page type-label text-primary hover:border-focus";

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
          <CategoryChip
            key={s.id}
            selected={scope === s.id}
            onClick={() => {
              setScope(s.id);
            }}
            className="h-11 shrink-0 px-3.75 md:h-8 md:px-2.75"
          >
            {s.label}
          </CategoryChip>
        ))}
      </div>
      <form role="search" onSubmit={submit} className="hero-reveal flex flex-col gap-4 [animation-delay:160ms]">
        <label
          className={cx(
            "flex h-12 items-center gap-2 rounded-pill border border-input bg-page px-4 focus-within:field-focus",
            "md:h-15.5 md:gap-3 md:py-1.5 md:pr-1.5 md:pl-5",
          )}
        >
          <Icon name="search" size={24} className="hidden text-icon-primary md:block" />
          <Icon name="search" size={20} className="text-icon-primary md:hidden" />
          <span className="sr-only">Search H2 India</span>
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
      <div className="hero-reveal flex flex-wrap items-center gap-2 [animation-delay:200ms]">
        <p className="type-label-sm text-secondary">Popular:</p>
        {POPULAR.map((p) => (
          <Link key={p.label} href={p.href} className={cx(chip, "h-11 px-3.75 md:h-8 md:px-2.75")}>
            {p.label}
          </Link>
        ))}
      </div>
    </>
  );
}
