import { buttonClasses, cx, Icon } from "@h2india/ui";
import Link from "next/link";
import { HELP_CATEGORIES } from "@/cms/trust/collections";
import type { HelpArticle } from "@/payload-types";
import { card, wrap } from "./parts";

// Help centre pieces (96:1942, no results 763:40134): the search panel, the category cards and Still stuck.

export const POPULAR_SEARCHES = ["Request a quote", "GST invoice", "Verification", "Paying by NEFT"];

export function HelpSearch({ q }: { q: string }) {
  return (
    <div className={cx(wrap, "pt-6 md:pt-8")}>
      <div className="flex flex-col items-center gap-4 rounded-card bg-mint px-6 py-10 text-center md:py-14">
        <p className="type-eyebrow text-secondary">Help centre</p>
        <h1 className="type-h1 text-primary">How can we help?</h1>
        <form action="/help" method="get" role="search" className="w-full max-w-108">
          <label className="flex h-11 items-center gap-2 rounded-control border border-control bg-page px-3 focus-within:field-focus">
            <Icon name="search" size={18} className="text-icon-secondary" />
            <span className="sr-only">Search help</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder='Search help, for example "GST invoice"'
              className="h-full w-full bg-transparent type-body text-primary outline-none placeholder:text-placeholder"
            />
          </label>
        </form>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="type-body-sm text-secondary">Popular searches:</span>
          {POPULAR_SEARCHES.map((s) => (
            <Link
              key={s}
              href={`/help?q=${encodeURIComponent(s)}`}
              className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control bg-page px-2.75 type-label text-primary hover:border-focus"
            >
              {s}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategoryCards({ articles }: { articles: HelpArticle[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {HELP_CATEGORIES.map((c) => {
        const inCat = articles.filter((a) => a.category === c.value);
        const shown = [...inCat]
          .sort((a, b) => (a.featured ?? 99) - (b.featured ?? 99) || a.title.localeCompare(b.title))
          .slice(0, 3);
        return (
          <li key={c.value} className={cx(card, "flex flex-col gap-3 p-5")}>
            <span className="flex size-9 items-center justify-center rounded-control bg-mint text-icon-primary">
              <Icon name={c.icon} size={18} />
            </span>
            <div>
              <h2 className="type-h4 text-primary">{c.label}</h2>
              <p className="type-caption text-secondary">
                {inCat.length} {inCat.length === 1 ? "article" : "articles"}
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {shown.map((a) => (
                <li key={a.id}>
                  <Link href={`/help/${a.slug}`} className="type-label-sm text-link hover:underline">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export function StillStuck() {
  return (
    <div className={cx(wrap, "pt-12")}>
      <section
        aria-labelledby="stuck"
        className={cx(card, "flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between")}
      >
        <div>
          <h2 id="stuck" className="type-h4 text-primary">
            Still stuck?
          </h2>
          <p className="type-body-sm text-body">
            Write to us with your order or request number. Our team replies within 1 working day.
          </p>
        </div>
        <Link href="/contact" className={cx(buttonClasses({ size: "sm" }), "shrink-0")}>
          Contact us
        </Link>
      </section>
    </div>
  );
}

export const categoryLabel = (v: string) => HELP_CATEGORIES.find((c) => c.value === v)?.label ?? v;
