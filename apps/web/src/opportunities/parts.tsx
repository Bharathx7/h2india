import { Alert, Breadcrumbs, buttonClasses, cx, Icon, JobCard, StatusBadge } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { wrap } from "@/news/parts";
import type { ArticleSummary } from "@/news/data";
import { dayMonthYear } from "@/news/format";
import type { JobView } from "./views";
import { breadcrumbLd, JsonLd } from "@/seo/jsonld";

// Pieces the step 5.5 pages share: crumbs, section headings, the documents list, the sign-in prompt behind Create
// alert, Track and Save (alerts and saved items arrive with member accounts in step 7.3, A71), and loading cards.

export { wrap };

/** The breadcrumb trail, with its BreadcrumbList structured data (step 5.10). */
export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  const all = [{ label: "Home", href: "/" }, ...items];
  return (
    <>
      <JsonLd data={breadcrumbLd(all)} />
      <Breadcrumbs
        items={all}
        renderLink={(c, className) => (
          <Link href={c.href} className={className}>
            {c.label}
          </Link>
        )}
      />
    </>
  );
}

export function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cx("flex scroll-mt-24 flex-col gap-4", className)}>
      <h2 id={id} className="type-h2 text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

export const host = (url: string) => {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Documents (457:3222, 463:5337): each opens on the official portal; H2 Economy never hosts them. */
export function Documents({
  items,
  note,
}: {
  items: { id?: string | null; title: string; url: string; kind?: string | null; checkedAt?: string | null }[];
  note?: string;
}) {
  if (!items.length) return null;
  return (
    <>
      <ul className="flex flex-col rounded-card border border-default">
        {items.map((d) => (
          <li key={d.id ?? d.url} className="flex items-center gap-3 border-b border-default px-4 py-3 last:border-b-0">
            <Icon name="file-text" size={20} className="shrink-0 text-icon-primary" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="type-label text-primary">{d.title}</span>
              <span className="type-caption text-secondary">
                {d.kind ?? "PDF"} · on {host(d.url)}
              </span>
            </span>
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="type-label-sm text-link hover:underline"
            >
              Open ↗<span className="sr-only"> {d.title} (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      {note ? <p className="type-caption text-secondary">{note}</p> : null}
    </>
  );
}

/**
 * Where Create alert, Track and Save lead (A71): signed-out readers sign in first, then land on alerts; the alert
 * and saved-items pages arrive with member accounts (step 7.3).
 */
export function memberHref(signedIn: boolean, target: string): string {
  return signedIn ? target : `/sign-in?next=${encodeURIComponent(target)}`;
}

/** The days-left badge in tables (455:1621, 453:9). */
export function DaysBadge({ left }: { left: { label: string; tone: string } | null }) {
  if (!left) return null;
  return <StatusBadge status={left.label} tone={left.tone === "warning" ? "warning" : "success"} />;
}

export function ViewToggle({ current, hrefFor }: { current: "table" | "cards"; hrefFor: (v: string) => string }) {
  return (
    <nav aria-label="View" className="flex items-center gap-2">
      <span className="type-label-sm text-secondary">View</span>
      {(["table", "cards"] as const).map((v) => (
        <Link
          key={v}
          href={hrefFor(v)}
          scroll={false}
          aria-current={current === v ? "page" : undefined}
          className={cx(
            "inline-flex h-8 items-center rounded-pill border-[1.5px] px-2.75 type-label",
            current === v
              ? "border-transparent bg-inverse text-inverse"
              : "border-control bg-page text-primary hover:border-focus",
          )}
        >
          {v === "table" ? "Table" : "Cards"}
        </Link>
      ))}
    </nav>
  );
}

export function jobChips(j: JobView): string[] {
  return [j.experience, j.salary].filter((x): x is string => Boolean(x));
}

export function JobCards({ items, columns = 3 }: { items: JobView[]; columns?: 3 | 4 }) {
  return (
    <ul className={cx("grid grid-cols-1 gap-4 md:grid-cols-2", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {items.map((j) => (
        <li key={j.id}>
          <JobCard
            company={j.company}
            initials={j.initials}
            role={j.role}
            where={j.where}
            chips={jobChips(j)}
            dates={j.dates}
            href={j.href}
            featured={j.featured}
          />
        </li>
      ))}
    </ul>
  );
}

/** Loading cards in the final layout (state boards, step 2.5). */
export function CardsLoading({ label, count = 6 }: { label: string; count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <span className="block h-3 w-2/5 rounded-[6px] shimmer" />
          <span className="block h-4 w-4/5 rounded-[6px] shimmer" />
          <span className="block h-3 w-3/5 rounded-[6px] shimmer" />
          <span className="block h-8 w-1/2 rounded-pill shimmer" />
          <span className="block h-3 w-2/5 rounded-[6px] shimmer" />
        </div>
      ))}
    </div>
  );
}

export function LoadError({ what, retry }: { what: string; retry: string }) {
  return (
    <Alert tone="error" title={`We couldn’t load ${what}`}>
      Check your connection and try again. Your filters are kept.{" "}
      <a href={retry} className="type-label underline">
        Try again
      </a>
    </Alert>
  );
}

export const linkButton = (variant: "primary" | "outline" = "outline", size?: "sm" | "lg") =>
  buttonClasses({ variant, ...(size ? { size } : {}) });

/** Related news as rows (457:3222): type and date, then the headline. */
export function NewsList({ items }: { items: ArticleSummary[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((a) => (
        <li key={a.id} className="flex flex-col gap-1 border-b border-default py-4 first:pt-0">
          <p className="type-label-sm text-secondary">
            {(a.section?.name.split(" & ")[0] ?? a.typeLabel).toUpperCase()} ·{" "}
            {dayMonthYear(a.publishedAt).toUpperCase()}
          </p>
          <Link href={a.href} className="type-label-lg text-primary hover:underline">
            {a.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}
