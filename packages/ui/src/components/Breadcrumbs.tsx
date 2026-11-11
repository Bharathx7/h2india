import { Fragment, type ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Breadcrumbs" (21:161): up to 4 levels; the current page is plain ink-500 text, earlier levels are links.
// Middle levels collapse to an ellipsis on mobile.

export interface Crumb {
  label: string;
  /** Leave out for the current page. */
  href?: string;
}

export function Breadcrumbs({
  items,
  renderLink,
  className,
}: {
  items: Crumb[];
  /** For framework links (Next.js Link). Defaults to <a>. */
  renderLink?: (crumb: Crumb & { href: string }, className: string) => ReactNode;
  className?: string;
}) {
  const linkClass = "rounded-control text-link hover:text-link-hover hover:underline underline-offset-4";
  const collapsible = items.length > 2;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 type-body-sm">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          const middle = collapsible && i > 0 && !last;
          return (
            <Fragment key={`${item.label}-${String(i)}`}>
              {collapsible && i === 1 ? (
                <li aria-hidden="true" className="flex items-center gap-2 text-secondary sm:hidden">
                  …
                  <Icon name="chevron-right" size={14} className="text-icon-secondary" />
                </li>
              ) : null}
              <li className={cx("flex items-center gap-2", middle && "max-sm:hidden")}>
                {last || !item.href ? (
                  <span aria-current={last ? "page" : undefined} className="text-secondary">
                    {item.label}
                  </span>
                ) : renderLink ? (
                  renderLink({ ...item, href: item.href }, linkClass)
                ) : (
                  <a href={item.href} className={linkClass}>
                    {item.label}
                  </a>
                )}
                {!last ? <Icon name="chevron-right" size={14} className="text-icon-secondary" /> : null}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
