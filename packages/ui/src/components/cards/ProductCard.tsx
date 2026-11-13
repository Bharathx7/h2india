import type { ReactNode } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { buttonClasses } from "../Button";

/* Figma "Product card v2" (392:5279): image with Compare and Save, class · category eyebrow, name, supplier with its
   verified mark, up to three spec chips, lead time and View product. It has no price prop on purpose: a card never
   shows a price (playbook step 6.4 price rule). */

export interface ProductCardProps {
  name: string;
  href: string;
  /** "Systems · Electrolysers" */
  eyebrow: string;
  supplier: string;
  supplierVerified?: boolean;
  chips: string[];
  leadTime?: string | null;
  /** Compare and Save buttons; rendered by the page so they can hold state. */
  actions?: ReactNode;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  className?: string;
}

const plainLink: NonNullable<ProductCardProps["renderLink"]> = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export function ProductCard({
  name,
  href,
  eyebrow,
  supplier,
  supplierVerified = false,
  chips,
  leadTime,
  actions,
  renderLink = plainLink,
  className,
}: ProductCardProps) {
  return (
    <article
      className={cx("flex flex-col gap-4 rounded-card border border-default bg-page p-2 shadow-soft", className)}
    >
      <div className="relative flex aspect-[272/198] items-center justify-center rounded-card bg-subtle">
        <Icon name="zap" size={56} className="text-ink-400" />
        {actions ? <div className="absolute top-3 right-3 flex gap-2">{actions}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-2">
        <p className="type-eyebrow text-link">{eyebrow}</p>
        <h3 className="type-h4 text-primary">
          {renderLink({ href, className: "rounded-control hover:underline underline-offset-2", children: name })}
        </h3>
        <p className="flex items-center gap-1.5 type-body-sm text-secondary">
          {supplier}
          {supplierVerified ? (
            <>
              <Icon name="shield-check" size={16} className="text-icon-success" />
              <span className="sr-only">(verified supplier)</span>
            </>
          ) : null}
        </p>
        {chips.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Key specifications">
            {chips.map((c) => (
              <li key={c} className="rounded-control bg-subtle px-2 py-1 type-spec text-primary">
                {c}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3 px-2 pb-2">
        <div className="flex flex-col">
          {leadTime ? (
            <>
              <span className="type-caption text-secondary">Lead time</span>
              <span className="type-label-lg text-success">{leadTime}</span>
            </>
          ) : null}
        </div>
        {renderLink({
          href,
          className: buttonClasses({ variant: "secondary" }),
          children: (
            <>
              View product<span className="sr-only"> {name}</span>
            </>
          ),
        })}
      </div>
    </article>
  );
}
