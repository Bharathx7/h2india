"use client";

import { useState } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { VerifiedBadge } from "../Badges";
import { buttonClasses } from "../Button";
import type { MegaLink, MegaSection } from "./types";

const LINK = "rounded-control type-body text-body hover:text-link-hover hover:underline underline-offset-4";

function Promo({ section }: { section: MegaSection }) {
  const p = section.promo;
  if (!p) return null;
  return (
    <div className="flex w-75 shrink-0 flex-col gap-3 bg-mint p-6">
      <p className="type-eyebrow text-secondary">{p.eyebrow}</p>
      <p className="type-h4">{p.title}</p>
      <p className="type-body-sm text-body">{p.text}</p>
      {p.action.style === "button" ? (
        <a href={p.action.href} className={cx(buttonClasses({ size: "sm" }), "self-start")}>
          {p.action.label}
        </a>
      ) : (
        <a
          href={p.action.href}
          className="inline-flex items-center gap-1.5 self-start rounded-control type-label text-link hover:gap-2.5"
        >
          {p.action.label}
          <Icon name="arrow-right" size={16} />
        </a>
      )}
    </div>
  );
}

function LinkColumns({ title, links }: { title?: string; links: MegaLink[] }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-8 py-6">
      {title ? <p className="type-h4">{title}</p> : null}
      <ul className={cx("grid gap-x-8 gap-y-4", links.length > 4 && "grid-cols-2")}>
        {links.map((l) => (
          <li key={l.href + l.label}>
            <a href={l.href} className={LINK}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Marketplace({ section }: { section: MegaSection }) {
  const classes = section.classes ?? [];
  const [selected, setSelected] = useState(classes[0]?.id);
  const current = classes.find((c) => c.id === selected) ?? classes[0];
  return (
    <>
      <div className="flex w-68 shrink-0 flex-col gap-1 bg-subtle px-4 py-6">
        <p className="px-2 pb-2 type-eyebrow text-secondary">{section.eyebrow}</p>
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === current?.id}
            onClick={() => {
              setSelected(c.id);
            }}
            onFocus={() => {
              setSelected(c.id);
            }}
            className={cx(
              "flex items-center gap-2 rounded-control px-2 py-2 text-left",
              c.id === current?.id ? "bg-page shadow-soft" : "hover:bg-page",
            )}
          >
            <span className="flex-1">
              <span className="block type-label-lg text-primary">{c.label}</span>
              {c.count !== undefined ? (
                <span className="block type-caption text-secondary">{c.count} categories</span>
              ) : null}
            </span>
            <Icon name="chevron-right" size={16} className="text-icon-secondary" />
          </button>
        ))}
      </div>
      {current ? (
        <div className="flex flex-1 flex-col gap-4 px-8 py-6">
          <a href={current.href} className="self-start rounded-control type-h4 hover:underline underline-offset-4">
            {current.label}
          </a>
          <ul className="flex flex-col gap-4">
            {current.categories.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={LINK}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {section.applications?.length ? (
        <div className="flex w-50 shrink-0 flex-col gap-3 py-6 pr-6">
          <p className="type-eyebrow text-secondary">Browse by application</p>
          <ul className="flex flex-col gap-3">
            {section.applications.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={LINK}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex w-70 shrink-0 flex-col gap-4 bg-mint p-6">
        <ul className="flex flex-col gap-4">
          {(section.tools ?? []).map((t) => (
            <li key={t.href}>
              <a
                href={t.href}
                className="flex items-center gap-2 rounded-control type-label text-primary hover:text-link-hover"
              >
                <Icon name={t.icon} size={18} className="text-icon-primary" />
                {t.label}
              </a>
            </li>
          ))}
        </ul>
        {section.sponsor ? (
          <div className="mt-auto flex flex-col gap-2 rounded-card bg-page p-4">
            <p className="type-eyebrow text-secondary">Sponsored</p>
            <p className="type-label-lg text-primary">{section.sponsor.name}</p>
            <p className="type-caption text-secondary">{section.sponsor.detail}</p>
            {section.sponsor.verified ? <VerifiedBadge kind="supplier" className="self-start" /> : null}
            <a
              href={section.sponsor.href}
              className="inline-flex items-center gap-1.5 self-start rounded-control type-label text-link hover:gap-2.5"
            >
              View storefront
              <Icon name="arrow-right" size={16} />
            </a>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** The panel for one section. Placed below the section nav by SiteHeader. */
export function MegaMenuPanel({ section, id }: { section: MegaSection; id: string }) {
  return (
    <div
      id={id}
      role="region"
      aria-label={`${section.label} menu`}
      className="menu-enter flex w-full max-w-300 overflow-hidden rounded-modal border border-default bg-page shadow-ink-float-sm"
    >
      {section.classes ? (
        <Marketplace section={section} />
      ) : (
        <>
          <div className="flex w-80 shrink-0 flex-col gap-1 bg-subtle px-4 py-6">
            <p className="px-2 pb-2 type-eyebrow text-secondary">{section.eyebrow}</p>
            {(section.primary ?? []).map((l) => (
              <a key={l.href} href={l.href} className="rounded-control px-2 py-2 hover:bg-page">
                <span className="block type-label-lg text-primary">{l.label}</span>
                <span className="block type-caption text-secondary">{l.description}</span>
              </a>
            ))}
          </div>
          <LinkColumns title={section.linksTitle} links={section.links ?? []} />
          <Promo section={section} />
        </>
      )}
    </div>
  );
}
