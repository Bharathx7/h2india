"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { StatusBadge, type BadgeTone } from "../Badges";
import { useReducedMotion } from "./Motion";

// Hero card · "On H2 Economy now" (founder upgrade, 17 Nov 2026; replaces the network drawing 375:7052). One dark card
// with five tabs (Buyers, Suppliers, Schemes, Tenders, News); each panel shows what the platform holds right now: the
// live tenders, schemes and news, the buyer's steps and the supplier checks. Palette unchanged: ink card, accent tab,
// white panel. The tabs advance every 5 s with a progress line; hovering or focusing the card pauses them, choosing a
// tab stops them for good, and reduced motion never starts them (WCAG 2.2.2). Rows fade up 8 px, 40 ms apart.

export type HeroTab = "buyers" | "suppliers" | "schemes" | "tenders" | "news";

export interface HeroRow {
  title: string;
  meta: string;
  href: string;
  status?: { label: string; tone: BadgeTone };
}

export interface HeroPanel {
  id: HeroTab;
  tab: string;
  eyebrow: string;
  /** Live records; when empty the panel shows its chips instead. */
  rows: HeroRow[];
  /** Numbered steps (buyers) shown before the chips. */
  steps?: { title: string; text: string }[];
  chips: { label: string; href?: string }[];
  note?: string;
  cta: { label: string; href: string };
}

const STEP_MS = 5000;

export function HeroConsole({ panels, className }: { panels: HeroPanel[]; className?: string }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [paused, setPaused] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const auto = !reduced && !stopped;
  const running = auto && !paused;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % panels.length);
    }, STEP_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [running, index, panels.length]);

  const choose = (i: number, focus = false) => {
    setStopped(true);
    setIndex(i);
    if (focus) tabs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = panels.length;
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % n
        : e.key === "ArrowLeft"
          ? (i - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    choose(next, true);
  };

  const panel = panels[index] ?? panels[0];
  if (!panel) return null;

  return (
    <section
      aria-label="On H2 Economy now"
      data-testid="hero-card"
      data-focus={panel.id}
      data-running={running}
      className={cx(
        "relative isolate flex w-full max-w-150 flex-col gap-5 overflow-hidden rounded-feature bg-inverse p-6 shadow-ink-float xl:p-7",
        className,
      )}
      onPointerEnter={() => {
        setPaused(true);
      }}
      onPointerLeave={() => {
        setPaused(false);
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div aria-hidden="true" className="depth-dot-grid absolute -top-24 -right-24 -z-10 size-96 opacity-25" />
      <div aria-hidden="true" className="depth-accent-glow absolute -bottom-40 -left-32 -z-10 size-96 opacity-60" />

      <p className="flex h-4 items-center gap-2 font-mono text-xs font-medium tracking-wider text-fresh-300 uppercase">
        <span aria-hidden="true" className="hero-live-dot size-2 rounded-pill bg-accent" />
        On H2 Economy now
      </p>

      <div role="tablist" aria-label="What H2 Economy holds" className="grid grid-cols-5 gap-1.5">
        {panels.map((p, i) => {
          const selected = i === index;
          return (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`hero-tab-${p.id}`}
              aria-selected={selected}
              aria-controls="hero-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                choose(i);
              }}
              onKeyDown={(e) => {
                onKey(e, i);
              }}
              className={cx(
                "relative inline-flex h-9 items-center justify-center overflow-hidden rounded-pill px-1 type-label",
                "transition-[background-color,color,transform] duration-(--motion-duration-base) ease-standard active:scale-[0.97]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fresh-300",
                selected ? "bg-accent text-primary" : "bg-ink-700 text-inverse hover:bg-ink-500",
              )}
            >
              {p.tab}
              {selected && auto ? (
                <span
                  key={index}
                  aria-hidden="true"
                  className="hero-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ink-900/40"
                  style={{ animationPlayState: paused ? "paused" : "running" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id="hero-panel"
        role="tabpanel"
        aria-labelledby={`hero-tab-${panel.id}`}
        className="flex h-86 flex-col gap-4 rounded-card bg-page p-5 shadow-soft"
      >
        <div key={panel.id} className="flex min-h-0 flex-1 flex-col gap-4">
          <p className="hero-item type-eyebrow text-secondary" style={{ ["--hero-i" as string]: 0 }}>
            {panel.eyebrow}
          </p>
          {panel.rows.length ? (
            <ul className="flex min-h-0 flex-col">
              {panel.rows.map((r, i) => (
                <li
                  key={r.href + r.title}
                  className="hero-item border-b border-default last:border-b-0"
                  style={{ ["--hero-i" as string]: i + 1 }}
                >
                  <a href={r.href} className="group/row flex items-start gap-3 py-2.5 first:pt-0">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="line-clamp-1 type-label-lg text-primary group-hover/row:text-link-hover">
                        {r.title}
                      </span>
                      <span className="line-clamp-1 type-caption text-secondary">{r.meta}</span>
                    </span>
                    {r.status ? (
                      <StatusBadge status={r.status.label} tone={r.status.tone} className="shrink-0" />
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {panel.steps?.length ? (
                <ol className="flex flex-col gap-3">
                  {panel.steps.map((s, i) => (
                    <li
                      key={s.title}
                      className="hero-item flex items-start gap-3"
                      style={{ ["--hero-i" as string]: i + 1 }}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-inverse type-label-sm text-inverse">
                        {i + 1}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="type-label text-primary">{s.title}</span>
                        <span className="line-clamp-1 type-caption text-secondary">{s.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              <ul
                className="hero-item flex flex-wrap gap-2"
                style={{ ["--hero-i" as string]: (panel.steps?.length ?? 0) + 1 }}
              >
                {panel.chips.map((c) => (
                  <li key={c.label}>
                    {c.href ? (
                      <a
                        href={c.href}
                        className="inline-flex h-8 items-center rounded-pill border border-control bg-page px-3 type-label text-primary transition-[border-color,background-color,transform] duration-(--motion-duration-fast) ease-standard hover:border-focus hover:bg-subtle active:scale-[0.97]"
                      >
                        {c.label}
                      </a>
                    ) : (
                      <span className="inline-flex h-8 items-center rounded-pill bg-mint px-3 type-label text-primary">
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {panel.note ? (
                <p
                  className="hero-item type-body-sm text-body"
                  style={{ ["--hero-i" as string]: (panel.steps?.length ?? 0) + 2 }}
                >
                  {panel.note}
                </p>
              ) : null}
            </>
          )}
          <a
            href={panel.cta.href}
            className="group/cta hero-item mt-auto inline-flex items-center gap-1.5 self-start type-label text-link hover:text-link-hover"
            style={{ ["--hero-i" as string]: 6 }}
          >
            {panel.cta.label}
            <Icon
              name="arrow-right"
              size={16}
              className="transition-transform duration-(--motion-duration-fast) ease-standard group-hover/cta:translate-x-1"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
