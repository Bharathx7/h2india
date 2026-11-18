import type { ReactNode } from "react";
import { Icon, type IconName } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { StatusBadge, type BadgeTone } from "../Badges";

// Cards from Figma page 02 used on the home page (step 5.1) and again by the listing pages in Stages 5 and 6.
// Each card is one link: the main link stretches over the card (after:inset-0), other links sit above it.

const stretch = "after:absolute after:inset-0 after:rounded-[inherit] after:content-['']";
const above = "relative z-10";
const arrowLink =
  "inline-flex items-center gap-1.5 type-label text-link transition-[color,gap] duration-(--motion-duration-base) ease-standard group-hover:gap-2.5 group-hover:text-link-hover";

/** Feature card (152:262): eyebrow, title, text; optional icon tile, bottom link or round arrow button. */
export function FeatureCard({
  eyebrow,
  title,
  children,
  href,
  icon,
  linkLabel,
  className,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  href: string;
  icon?: IconName;
  /** Bottom link (path cards). Without it the card shows the round arrow button (knowledge cards). */
  linkLabel?: string;
  className?: string;
}) {
  return (
    <article
      data-reveal-item=""
      className={cx("group card-lift relative flex flex-col gap-3 rounded-feature bg-page p-7 shadow-soft", className)}
    >
      {icon ? (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-tint text-icon-link">
          <Icon name={icon} size={24} />
        </span>
      ) : null}
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 type-label-sm text-secondary">{eyebrow}</p>
        {linkLabel ? null : (
          <span
            className="flex size-8 items-center justify-center rounded-pill bg-inverse text-icon-inverse"
            aria-hidden="true"
          >
            <Icon name="arrow-right" size={14} />
          </span>
        )}
      </div>
      <h3 className="type-h3 text-primary">
        {linkLabel ? (
          title
        ) : (
          <a href={href} className={cx(stretch, "focus-visible:outline-none")}>
            {title}
          </a>
        )}
      </h3>
      {children ? <div className="type-body text-body">{children}</div> : null}
      {linkLabel ? (
        <>
          <span className="min-h-0 flex-1" />
          <a href={href} className={cx(arrowLink, stretch)}>
            {linkLabel}
            <Icon name="arrow-right" size={16} />
          </a>
        </>
      ) : null}
    </article>
  );
}

/** Category tile v2: "class" has the large plate (377:5158), "category" the small icon tile (377:5218). */
export function CategoryTile({
  title,
  detail,
  href,
  icon,
  size = "category",
  className,
}: {
  title: string;
  detail?: string;
  href: string;
  icon: IconName;
  size?: "class" | "category";
  className?: string;
}) {
  return (
    <a
      href={href}
      data-reveal-item=""
      className={cx(
        "group card-lift flex flex-col gap-3.5 rounded-card border border-default bg-page p-5 shadow-soft",
        className,
      )}
    >
      <span
        className={cx(
          "flex items-center justify-center bg-linear-to-b from-fresh-50 to-fresh-200 text-icon-link",
          size === "class" ? "h-28 w-full rounded-card" : "size-11 rounded-card",
        )}
      >
        <Icon name={icon} size={size === "class" ? 48 : 22} />
      </span>
      <span className="flex items-start gap-2 pr-1">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-label-lg text-primary">{title}</span>
          {detail ? <span className="type-caption text-secondary">{detail}</span> : null}
        </span>
        <Icon
          name="arrow-right"
          size={18}
          className="mt-0.75 shrink-0 text-icon-primary transition-transform duration-(--motion-duration-fast) group-hover:translate-x-1"
        />
      </span>
    </a>
  );
}

/** Stat card (786:132126): the figure, what it counts, and its source and date. */
export function StatFigure({ value, label, source }: { value: string; label: string; source: string }) {
  return (
    <div data-reveal-item="" className="flex flex-col items-center gap-2 text-center">
      <p className="type-display whitespace-nowrap text-link" data-numeric="">
        {value}
      </p>
      <p className="type-body text-body">{label}</p>
      <p className="type-caption text-secondary opacity-80">{source}</p>
    </div>
  );
}

export interface CardStatus {
  label: string;
  tone: BadgeTone;
}

const Meta = ({ icon, children }: { icon: IconName; children: ReactNode }) => (
  <span className="flex items-center gap-1 type-caption text-body">
    <Icon name={icon} size={16} className="text-icon-secondary" />
    {children}
  </span>
);

/** "SECI" → SE, "IOCL" → IO, "Deendayal Port Authority" → DP (the issuer logo stand-in on 375:7213). */
const initialsOf = (name: string) => {
  const words = name.split(/[\s/]+/).filter((w) => /^[A-Za-z]/.test(w));
  const letters = words.length > 1 ? words.map((w) => w.charAt(0)).join("") : (words[0] ?? "");
  return letters.slice(0, 2).toUpperCase();
};

/** Tender card (375:7213): issuer, status, title, tender ID, state, bid due with countdown, value, category, Track. */
export function TenderCard(t: {
  issuer: string;
  status: CardStatus;
  title: string;
  tenderId: string;
  place: string;
  due: string;
  money: string;
  category: string;
  href: string;
  documentsHref: string;
  trackHref: string;
}) {
  return (
    <article
      data-reveal-item=""
      className="group card-lift relative flex h-full flex-col gap-3 rounded-card border border-default bg-page p-5 shadow-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
            {initialsOf(t.issuer)}
          </span>
          <p className="truncate type-label-sm text-secondary">{t.issuer}</p>
        </div>
        <StatusBadge status={t.status.label} tone={t.status.tone} />
      </div>
      <h3 className="type-label-lg text-primary transition-colors duration-(--motion-duration-fast) group-hover:text-link-hover">
        <a href={t.href} className={cx(stretch, "focus-visible:outline-none")}>
          {t.title}
        </a>
      </h3>
      <p className="type-spec text-secondary">{t.tenderId}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Meta icon="map-pin">{t.place}</Meta>
        <Meta icon="calendar">{t.due}</Meta>
      </div>
      <p className="type-caption text-secondary">{t.money}</p>
      <p className="type-caption text-secondary">{t.category}</p>
      <div className="mt-auto flex items-center justify-between">
        <a
          href={t.documentsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(above, "type-label-sm text-link hover:text-link-hover hover:underline")}
        >
          View documents ↗<span className="sr-only"> (official portal, opens in a new tab)</span>
        </a>
        <a
          href={t.trackHref}
          className={cx(
            above,
            "inline-flex h-8 items-center rounded-pill border border-control px-3.25 type-label text-primary transition-[background-color,border-color,scale] duration-(--motion-duration-fast) ease-standard hover:border-focus hover:bg-subtle active:scale-[0.97]",
          )}
        >
          Track<span className="sr-only"> {t.title}</span>
        </a>
      </div>
    </article>
  );
}

/** Scheme card (375:7251): level and agency, status, title, benefit, who can apply, next deadline, last verified. */
export function SchemeCard(s: {
  level: string;
  status: CardStatus;
  title: string;
  benefit: string;
  who: string[];
  deadline: string;
  verified: string | null;
  href: string;
  /** Save and alert need member accounts (Stage 7); the buttons show only when given. */
  saveHref?: string;
  alertHref?: string;
  /** The arrow link's words; "Check eligibility" as drawn. */
  actionLabel?: string;
}) {
  const round =
    "inline-flex size-8 items-center justify-center rounded-pill border border-control text-icon-primary transition-[background-color,border-color,scale] duration-(--motion-duration-fast) ease-standard hover:border-focus hover:bg-subtle active:scale-[0.97]";
  return (
    <article
      data-reveal-item=""
      className="group card-lift relative flex h-full flex-col gap-3 rounded-card border border-default bg-page p-5 shadow-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate type-label-sm text-secondary">{s.level}</p>
        <StatusBadge status={s.status.label} tone={s.status.tone} />
      </div>
      <h3 className="type-label-lg text-primary transition-colors duration-(--motion-duration-fast) group-hover:text-link-hover">
        {s.title}
      </h3>
      <p className="type-body-sm text-body">{s.benefit}</p>
      {s.who.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Who can apply">
          {s.who.map((w) => (
            <li
              key={w}
              className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-2.75 type-label text-primary"
            >
              {w}
            </li>
          ))}
        </ul>
      ) : null}
      <Meta icon="calendar">{s.deadline}</Meta>
      {s.verified ? <p className="type-caption text-secondary">Last verified {s.verified}</p> : null}
      <div className="mt-auto flex items-center justify-between">
        <a href={s.href} className={cx(arrowLink, stretch)}>
          {s.actionLabel ?? "Check eligibility"}
          <Icon name="arrow-right" size={16} />
          <span className="sr-only">: {s.title}</span>
        </a>
        {s.saveHref || s.alertHref ? (
          <div className={cx(above, "flex items-center gap-2")}>
            {s.saveHref ? (
              <a href={s.saveHref} className={round} aria-label={`Save ${s.title}`}>
                <Icon name="heart" size={14} />
              </a>
            ) : null}
            {s.alertHref ? (
              <a href={s.alertHref} className={round} aria-label={`Set an alert for ${s.title}`}>
                <Icon name="bell" size={14} />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** Job card (464:6071): company, role, place and mode, experience and salary chips, posted and closing dates, Apply. */
export function JobCard(j: {
  company: string;
  initials: string;
  role: string;
  where: string;
  chips: string[];
  dates: string;
  href: string;
  /** Featured jobs (A69) carry a visible label. */
  featured?: boolean;
}) {
  return (
    <article
      data-reveal-item=""
      className="group card-lift relative flex h-full flex-col gap-3 rounded-card border border-default bg-page p-5 shadow-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-mint type-label-sm text-primary">
            {j.initials}
          </span>
          <p className="truncate type-label-sm text-link">{j.company}</p>
        </div>
        {j.featured ? <ContentLabel>Featured</ContentLabel> : null}
      </div>
      <h3 className="type-label-lg text-primary transition-colors duration-(--motion-duration-fast) group-hover:text-link-hover">
        <a href={j.href} className={cx(stretch, "focus-visible:outline-none")}>
          {j.role}
        </a>
      </h3>
      <p className="type-body-sm text-secondary">{j.where}</p>
      {j.chips.length ? (
        <ul className="flex flex-wrap gap-2">
          {j.chips.map((c) => (
            <li
              key={c}
              className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-2.75 type-label text-primary"
            >
              {c}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="type-caption text-secondary">{j.dates}</p>
        <span
          aria-hidden="true"
          className="inline-flex h-8 shrink-0 items-center rounded-pill border border-control px-3.25 type-label text-primary transition-[background-color,border-color] duration-(--motion-duration-fast) ease-standard group-hover:border-focus group-hover:bg-subtle"
        >
          Apply
        </span>
      </div>
    </article>
  );
}

/** Content label for sponsored and press-release pieces (A28): always shown with the type. */
function ContentLabel({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-pill bg-subtle px-2.5 py-1 type-label-sm text-body">
      <span className="size-1.5 rounded-pill bg-ink-500" aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Article card v2 (152:241). "lead" is the home lead story (gradient plate), "standard" the grid and swipe card,
 * "compact" the list row without an image, "hero" the news home's lead story with excerpt and byline (428:601), and
 * "row" the list row with a small image tile (press releases 428:1247, section lists 430:1952).
 */
export function ArticleCard({
  layout = "standard",
  section,
  title,
  href,
  readLabel,
  badge,
  excerpt,
  meta,
  className,
}: {
  layout?: "lead" | "standard" | "compact" | "hero" | "row";
  /** "PROJECTS · 10 NOV 2026" */
  section: string;
  title: string;
  href: string;
  /** "Read · 7 min" */
  readLabel?: string;
  /** Sponsored or Press release. */
  badge?: string | null;
  /** The standfirst, on the hero layout. */
  excerpt?: string;
  /** "By Ananya Rao", on the hero layout. */
  meta?: string;
  className?: string;
}) {
  if (layout === "hero") {
    return (
      <article
        data-reveal-item=""
        className={cx(
          "group card-lift relative flex flex-col overflow-hidden rounded-card border border-default bg-page",
          className,
        )}
      >
        <div className="relative flex h-50 w-full shrink-0 items-center justify-center overflow-hidden bg-linear-to-br from-fresh-50 to-fresh-200 md:h-75">
          <div aria-hidden="true" className="depth-dot-grid absolute inset-0 opacity-50" />
          <span className="relative flex size-20 items-center justify-center rounded-pill bg-page text-icon-link shadow-soft transition-transform duration-(--motion-duration-base) ease-standard group-hover:scale-105">
            <Icon name="newspaper" size={28} />
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
          {badge ? <ContentLabel>{badge}</ContentLabel> : null}
          <p className="type-label-sm text-secondary">{section}</p>
          <h3 className="type-h3 text-primary">{title}</h3>
          {excerpt ? <p className="type-body text-body">{excerpt}</p> : null}
          {meta ? <p className="type-caption text-secondary">{meta}</p> : null}
          <a href={href} className={cx(arrowLink, stretch)}>
            {readLabel ?? "Read"}
            <Icon name="arrow-right" size={16} />
            <span className="sr-only">: {title}</span>
          </a>
        </div>
      </article>
    );
  }
  if (layout === "row") {
    return (
      <article
        data-reveal-item=""
        className={cx(
          "group card-lift relative flex items-start gap-4 rounded-card border border-default bg-page p-3 shadow-soft",
          className,
        )}
      >
        <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-control bg-linear-to-br from-fresh-50 to-fresh-200 text-icon-link max-md:h-16 max-md:w-20">
          <Icon name="newspaper" size={24} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {badge ? <ContentLabel>{badge}</ContentLabel> : null}
          <p className="type-label-sm text-secondary">{section}</p>
          <h3 className="type-h4 text-primary group-hover:text-link-hover">
            <a href={href} className={cx(stretch, "focus-visible:outline-none")}>
              {title}
            </a>
          </h3>
        </div>
      </article>
    );
  }
  if (layout === "compact") {
    return (
      <article
        data-reveal-item=""
        className={cx("group relative flex flex-col gap-2 border-b border-default py-4", className)}
      >
        {badge ? <ContentLabel>{badge}</ContentLabel> : null}
        <p className="type-label-sm text-secondary">{section}</p>
        <h3 className="type-label-lg text-primary group-hover:text-link-hover">
          <a href={href} className={cx(stretch, "focus-visible:outline-none")}>
            {title}
          </a>
        </h3>
      </article>
    );
  }
  return (
    <article
      data-reveal-item=""
      className={cx(
        "group card-lift relative flex flex-col overflow-hidden rounded-card border border-default bg-page shadow-soft",
        className,
      )}
    >
      <div className="relative flex h-[202px] w-full shrink-0 items-center justify-center overflow-hidden bg-linear-to-br from-fresh-50 to-fresh-200">
        {layout === "lead" ? <div aria-hidden="true" className="depth-dot-grid absolute inset-0 opacity-50" /> : null}
        <span className="relative flex size-16 items-center justify-center rounded-pill bg-page text-icon-link shadow-soft transition-transform duration-(--motion-duration-base) ease-standard group-hover:scale-105">
          <Icon name="newspaper" size={28} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        {badge ? <ContentLabel>{badge}</ContentLabel> : null}
        <p className="type-label-sm text-secondary">{section}</p>
        <h3 className="type-h4 text-primary">{title}</h3>
        <a href={href} className={cx(arrowLink, stretch)}>
          {readLabel ?? "Read"}
          <Icon name="arrow-right" size={16} />
          <span className="sr-only">: {title}</span>
        </a>
      </div>
    </article>
  );
}

/** Event card (375:7275): date block, type and place, title, time in IST and price, Register. */
export function EventCard(e: {
  day: string;
  month: string;
  kind: string;
  title: string;
  meta: string;
  href: string;
  actionLabel?: string;
  sponsored?: boolean;
}) {
  return (
    <article
      data-reveal-item=""
      className="group card-lift relative flex gap-4 rounded-card border border-default bg-page p-4"
    >
      <div className="flex w-16 shrink-0 flex-col items-center gap-1 self-start rounded-control bg-mint p-3">
        <span className="type-h3 text-primary">{e.day}</span>
        <span className="type-label-sm text-secondary">{e.month}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {e.sponsored ? <ContentLabel>Sponsored</ContentLabel> : null}
        <p className="type-label-sm text-secondary">{e.kind}</p>
        <h3 className="type-label-lg text-primary">{e.title}</h3>
        <p className="type-caption text-body">{e.meta}</p>
        <a href={e.href} className={cx(arrowLink, stretch)}>
          {e.actionLabel ?? "Register"}
          <Icon name="arrow-right" size={16} />
          <span className="sr-only">: {e.title}</span>
        </a>
      </div>
    </article>
  );
}
