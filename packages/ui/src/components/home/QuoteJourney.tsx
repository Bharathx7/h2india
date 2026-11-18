"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { useReducedMotion } from "./Motion";

// Hero card · Quote journey (founder v2, 18 Nov 2026; replaces the tabbed "On H2 Economy now" card). One white card,
// lifted in 3D off two glass plates on the dark hero, that plays the platform's core story as an example: a request
// is sent, H2 Economy checks it, three verified suppliers quote in one format, the best fit is marked, then the
// supplier confirms and the money waits in escrow. Every value is labelled "Example" (no claims, no prices).
//
// Motion: one authored loop. Each stage holds 1.6 s; the last holds 3 s, then the journey starts again. It runs
// twice and rests on the finished state, pauses while hovered or focused, and never runs with reduced motion
// (WCAG 2.2.2, founder change F6: no pause buttons). The card tilts up to 6° toward the pointer (fine pointers only);
// its quote table, best-fit badge and floating chips sit on raised layers, so the tilt reads as depth.

export const JOURNEY_STAGES = [
  "Request sent",
  "Checked by H2 Economy",
  "Quotes received",
  "Best fit marked",
  "Order confirmed",
] as const;
const LAST = JOURNEY_STAGES.length - 1;
const STAGE_MS = 1600;
const HOLD_MS = 3000;
const LOOPS = 2;
const TILT_DEG = 6;

const STEPS = ["Sent", "Checked", "Quotes", "Order"] as const;
/** Which stepper node each stage has reached (the best-fit stage stays on Quotes). */
const NODE_OF: readonly number[] = [0, 1, 2, 2, 3];

const QUOTES = [
  { supplier: "Hydrotek Systems", lead: "14–16 wk", fit: "92%" },
  { supplier: "PEM Power India", lead: "18–20 wk", fit: "86%" },
  { supplier: "Deccan Electrolysis", lead: "20–24 wk", fit: "81%" },
];

export function QuoteJourney({ ctaHref, className }: { ctaHref: string; className?: string }) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [loop, setLoop] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const fine = useRef(false);
  const done = loop >= LOOPS;
  const running = !reduced && !done && !paused;
  const shown = reduced || done ? LAST : stage;

  useEffect(() => {
    fine.current = window.matchMedia("(pointer: fine)").matches;
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(
      () => {
        if (stage < LAST) setStage(stage + 1);
        else {
          setLoop((l) => l + 1);
          if (loop + 1 < LOOPS) setStage(0);
        }
      },
      stage === LAST ? HOLD_MS : STAGE_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [running, stage, loop]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || !fine.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * TILT_DEG * 2, y: px * TILT_DEG * 2 });
  };

  const node = NODE_OF[shown] ?? 0;
  const quotesIn = shown >= 2;
  const bestFit = shown >= 3;
  const confirmed = shown >= 4;
  const raised = (z: number): CSSProperties => ({ transform: `translateZ(${String(z)}px)` });

  return (
    <div
      data-testid="hero-card"
      data-stage={shown}
      data-running={running}
      className={cx("relative w-full max-w-140 [perspective:1400px]", className)}
      onPointerEnter={() => {
        setPaused(true);
      }}
      onPointerMove={onMove}
      onPointerLeave={() => {
        setPaused(false);
        setTilt({ x: 0, y: 0 });
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div
        className="relative transition-transform duration-(--motion-duration-slower) ease-standard [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${String(tilt.x)}deg) rotateY(${String(tilt.y)}deg)` }}
      >
        {/* Two glass plates behind the card give the stack its depth on the dark hero. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-feature border border-neutral-0/12 bg-neutral-0/6 backdrop-blur-glass-16"
          style={{ transform: "translate3d(28px, 28px, -60px)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-feature border border-neutral-0/16 bg-neutral-0/8"
          style={{ transform: "translate3d(14px, 14px, -30px)" }}
        />

        <section
          aria-label="Example quote request on H2 Economy"
          className="relative flex flex-col gap-5 rounded-feature bg-page p-6 shadow-ink-float [transform-style:preserve-3d] xl:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="type-label-sm text-secondary">Example request</span>
            <span
              aria-live="polite"
              className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-mint px-2.5 type-label-sm text-primary"
            >
              <span aria-hidden="true" className="hero-live-dot size-1.5 rounded-pill bg-accent" />
              {JOURNEY_STAGES[shown]}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="type-h4 text-primary">PEM electrolyser, 1 MW</p>
            <p className="type-body-sm text-secondary">One request, sent to three verified suppliers</p>
          </div>

          {/* Stepper: the fill grows to the node the stage has reached. */}
          <ol aria-label="Request progress" className="relative grid grid-cols-4">
            <span
              aria-hidden="true"
              className="absolute top-3 right-[12.5%] left-[12.5%] h-0.5 rounded-pill bg-ink-200"
            />
            <span
              aria-hidden="true"
              className="absolute top-3 left-[12.5%] h-0.5 origin-left rounded-pill bg-accent transition-transform duration-(--motion-duration-slower) ease-standard"
              style={{ width: "75%", transform: `scaleX(${String(node / (STEPS.length - 1))})` }}
            />
            {STEPS.map((s, i) => {
              const reached = i <= node;
              return (
                <li key={s} className="relative flex flex-col items-center gap-1.5">
                  <span
                    className={cx(
                      "flex size-6 items-center justify-center rounded-pill ring-4 ring-neutral-0 transition-colors duration-(--motion-duration-base) ease-standard",
                      reached ? "bg-accent text-primary" : "bg-subtle text-secondary",
                    )}
                  >
                    {reached ? <Icon name="check" size={14} /> : <span className="size-1.5 rounded-pill bg-ink-400" />}
                  </span>
                  <span className={cx("type-label-sm", reached ? "text-primary" : "text-secondary")}>{s}</span>
                  <span className="sr-only">{reached ? "(done)" : "(next)"}</span>
                </li>
              );
            })}
          </ol>

          {/* The quote table sits on a raised layer, so it floats above the card when it tilts. */}
          <div
            className="relative rounded-card border border-default bg-page shadow-ink-float-sm [transform-style:preserve-3d]"
            style={raised(36)}
          >
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-default px-4 py-2.5 type-label-sm text-secondary">
              <span>Supplier</span>
              <span>Lead time</span>
              <span className="w-10 text-right">Fit</span>
            </div>
            {/* Before the quotes arrive (founder v2: the box looked empty), the same box shows what the stage is doing:
                the request itself while it is sent, then H2 Economy's checks ticking in one by one. */}
            <div
              aria-hidden={quotesIn}
              className={cx(
                "absolute inset-x-0 top-10 bottom-0 flex flex-col justify-center gap-2.5 px-4 transition-opacity duration-(--motion-duration-slow) ease-standard",
                quotesIn ? "pointer-events-none opacity-0" : "opacity-100",
              )}
            >
              {shown === 0 ? (
                <dl className="grid grid-cols-3 gap-2" aria-label="Example request details">
                  {[
                    ["Quantity", "1 unit"],
                    ["Delivery", "Kutch, Gujarat"],
                    ["Needed by", "March 2027"],
                  ].map(([k, v], i) => (
                    <div
                      key={k}
                      className="hero-item flex flex-col gap-0.5 rounded-control bg-subtle px-3 py-2"
                      style={{ ["--hero-i" as string]: i }}
                    >
                      <dt className="type-caption text-secondary">{k}</dt>
                      <dd className="type-label-sm text-primary">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <ul className="flex flex-col gap-2" aria-label="Checks by H2 Economy">
                  {["Specifications complete", "Delivery site and date given", "Sent to 3 verified suppliers"].map(
                    (t, i) => (
                      <li
                        key={t}
                        className="hero-item flex items-center gap-2 type-label-sm text-primary"
                        style={{ ["--hero-i" as string]: i * 3 }}
                      >
                        <span className="flex size-5 items-center justify-center rounded-pill bg-accent text-primary">
                          <Icon name="check" size={12} />
                        </span>
                        {t}
                      </li>
                    ),
                  )}
                </ul>
              )}
              <p className="type-caption text-secondary">
                {shown === 0 ? "Sending to suppliers who make this…" : "Waiting for quotes…"}
              </p>
            </div>
            <ul aria-label="Example quotes">
              {QUOTES.map((q, i) => {
                const best = bestFit && i === 0;
                return (
                  <li
                    key={q.supplier}
                    className={cx(
                      "relative grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-2.5 type-body-sm",
                      "transition-[opacity,transform,background-color] duration-(--motion-duration-slower) ease-standard",
                      i < QUOTES.length - 1 && "border-b border-default",
                      quotesIn ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
                      best && "bg-mint",
                    )}
                    style={{ transitionDelay: quotesIn && !bestFit ? `${String(i * 120)}ms` : "0ms" }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon name="shield-check" size={16} className="shrink-0 text-icon-success" />
                      <span className="truncate type-label text-primary">{q.supplier}</span>
                    </span>
                    <span className="text-primary">{q.lead}</span>
                    <span className={cx("w-10 text-right type-label", best ? "text-link" : "text-primary")}>
                      {q.fit}
                    </span>
                    {best ? (
                      <span
                        className="absolute -top-3 left-[38%] inline-flex h-6 items-center gap-1 rounded-pill bg-inverse px-2 type-label-sm text-inverse shadow-ink-float-sm"
                        style={raised(30)}
                      >
                        <Icon name="check-circle" size={12} className="text-fresh-300" />
                        Best fit
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-wrap gap-2" aria-label="After you choose">
              {["Supplier confirmed", "Paid into escrow"].map((t, i) => (
                <li
                  key={t}
                  className={cx(
                    "inline-flex h-7 items-center gap-1.5 rounded-pill border px-2.5 type-label-sm",
                    "transition-[opacity,border-color,background-color] duration-(--motion-duration-slow) ease-standard",
                    confirmed ? "border-transparent bg-accent text-primary" : "border-default text-secondary",
                  )}
                  style={{ transitionDelay: confirmed ? `${String(i * 160)}ms` : "0ms" }}
                >
                  <Icon name={confirmed ? "check" : "clock"} size={12} />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href={ctaHref}
              className="group/cta inline-flex items-center gap-1.5 rounded-control type-label text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Request a quote
              <Icon
                name="arrow-right"
                size={16}
                className="transition-transform duration-(--motion-duration-fast) ease-standard group-hover/cta:translate-x-1"
              />
            </a>
          </div>
        </section>

        {/* Floating chips on the highest layer: they lift furthest off the card when it tilts. */}
        <span
          aria-hidden="true"
          className="absolute -top-4 -left-6 inline-flex h-9 items-center gap-2 rounded-pill bg-inverse px-3.5 type-label-sm text-inverse shadow-ink-float"
          style={raised(70)}
        >
          <Icon name="shield-check" size={16} className="text-fresh-300" />
          Verified suppliers only
        </span>
        <span
          aria-hidden="true"
          className="absolute -right-5 -bottom-5 inline-flex h-9 items-center gap-2 rounded-pill bg-accent px-3.5 type-label-sm text-primary shadow-ink-float"
          style={raised(60)}
        >
          <Icon name="file-text" size={16} />
          GST invoice on every order
        </span>
      </div>
    </div>
  );
}
