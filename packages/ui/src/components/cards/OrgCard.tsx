import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { VerifiedBadge } from "../Badges";
import { buttonClasses } from "../Button";
import { ArrowLink } from "../Links";

/* Figma "Org card" (directory listing 477:40, card 477:324): type eyebrow, initials tile, name and place, trust badges,
   what the company makes, then View profile and Request a quote. Follow (Stage 7) and the reply time (no data until
   RFQs, Stage 9) join when they exist; the card leaves them out rather than showing made-up values. */

export interface OrgCardProps {
  name: string;
  /** For example "Manufacturer"; shown as the eyebrow. */
  type?: string;
  place?: string;
  initials: string;
  /** The GSTIN check passed (organisation verification). */
  gstVerified?: boolean;
  summary?: string;
  href: string;
  quoteHref: string;
  /** Renders links (for example Next.js Link). Defaults to <a>. */
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  className?: string;
}

const plainLink: NonNullable<OrgCardProps["renderLink"]> = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export function OrgCard({
  name,
  type,
  place,
  initials,
  gstVerified,
  summary,
  href,
  quoteHref,
  renderLink = plainLink,
  className,
}: OrgCardProps) {
  return (
    <article
      className={cx("flex flex-col overflow-hidden rounded-card border border-default bg-page shadow-soft", className)}
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        {type ? <p className="type-eyebrow text-link">{type}</p> : null}
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-card bg-mint type-label-lg text-primary"
          >
            {initials}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="type-label-lg text-primary">{name}</h3>
            {place ? <p className="type-caption text-secondary">{place}</p> : null}
          </div>
        </div>
        {gstVerified ? (
          <div className="flex flex-wrap gap-1.5">
            <VerifiedBadge kind="gst" />
          </div>
        ) : null}
        {summary ? <p className="type-body-sm text-body">{summary}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-default px-5 py-3.5">
        <ArrowLink asChild>
          {renderLink({
            href,
            className: "",
            children: (
              <>
                View profile<span className="sr-only"> of {name}</span>
              </>
            ),
          })}
        </ArrowLink>
        {renderLink({
          href: quoteHref,
          className: buttonClasses({ variant: "outline", size: "sm" }),
          children: "Request a quote",
        })}
      </div>
    </article>
  );
}
