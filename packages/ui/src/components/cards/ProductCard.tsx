import type { ReactNode } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { EquipmentArt, equipmentKind, type EquipmentKind } from "../art/EquipmentArt";
import { buttonClasses } from "../Button";

/* Figma "Product card v2" (392:5279): image with Compare and Save, class · category eyebrow, name, supplier with its
   verified mark, up to three spec chips, lead time and View product. It has no price prop on purpose: a card never
   shows a price (playbook step 6.4 price rule).
   Founder v2 (18 Nov 2026): the same look as the home showcase cards: a green image tile with the product mark on a
   white coin and the Verified badge on it, the category as a plain caption, spec chips in mint, and the footer (lead
   time, View product) on the card's bottom edge so cards in a row line up. Same props and the same controls.
   Design upgrade (19 Nov 2026): the tile shows an engineering drawing of the product's equipment (`EquipmentArt`,
   chosen from the category words) instead of the same bolt on every card.
   Product photos (20 Nov 2026): a supplier's checked photo replaces the drawing when the listing has one. */

export interface ProductCardProps {
  name: string;
  href: string;
  /** "Systems · Electrolysers" */
  eyebrow: string;
  supplier: string;
  supplierVerified?: boolean;
  /** The drawing on the tile; worked out from the eyebrow and name when left out. */
  art?: EquipmentKind;
  /** The listing's first checked photo (public storage URLs); replaces the drawing. */
  photo?: { src: string; srcSet: string } | null;
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
  art,
  photo,
  chips,
  leadTime,
  actions,
  renderLink = plainLink,
  className,
}: ProductCardProps) {
  return (
    <article
      className={cx(
        "group card-lift relative flex flex-col overflow-hidden rounded-card border border-default bg-page",
        className,
      )}
    >
      <div className="relative aspect-[16/9] bg-fresh-50 sm:aspect-[4/3]">
        {photo ? (
          <img
            src={photo.src}
            srcSet={photo.srcSet || undefined}
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <EquipmentArt kind={art ?? equipmentKind(eyebrow, name)} />
        )}
        {supplierVerified ? (
          <span className="absolute top-3 left-3 inline-flex h-6 items-center gap-1 rounded-pill bg-page px-2 type-label-sm text-primary shadow-soft">
            <Icon name="shield-check" size={14} className="text-icon-success" />
            Verified
          </span>
        ) : null}
        {actions ? <div className="absolute top-3 right-3 z-10 flex gap-2">{actions}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-1 type-caption text-secondary">{eyebrow}</p>
        <h3 className="line-clamp-2 type-label-lg text-primary">
          {renderLink({ href, className: "rounded-control hover:underline underline-offset-2", children: name })}
        </h3>
        <p className="flex min-w-0 items-center gap-1.5 type-body-sm text-secondary">
          <span className="truncate">{supplier}</span>
          {supplierVerified ? <span className="sr-only">(verified supplier)</span> : null}
        </p>
        {chips.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Key specifications">
            {chips.map((c) => (
              <li key={c} className="rounded-pill bg-mint px-2 py-0.5 type-label-sm text-primary">
                {c}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-default pt-3">
          <div className="flex min-w-0 flex-col">
            {leadTime ? (
              <>
                <span className="type-caption text-secondary">Lead time</span>
                <span className="truncate type-label text-success">{leadTime}</span>
              </>
            ) : null}
          </div>
          {renderLink({
            href,
            className: buttonClasses({ variant: "secondary", size: "sm" }),
            children: (
              <>
                View product<span className="sr-only"> {name}</span>
              </>
            ),
          })}
        </div>
      </div>
    </article>
  );
}
