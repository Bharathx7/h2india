"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cx } from "../../lib/cx";
import { useReducedMotion } from "./Motion";

// Hero card · ecosystem network (375:7052, Standard layout 600 x 560; the Wide layout is not built, F5).
// Motion spec 781:7247: focus moves Buyers → Suppliers → Schemes → Tenders → News and repeats, every 2.5 s, each change
// 400 ms ease-in-out; the detail box changes with it. Reduced motion shows the static Buyers frame. No pause button:
// founder change to F6, 16 Nov 2026 (the loop keeps moving). Positions are the frame's, in container units so the card scales on narrower screens.

type Focus = "buyers" | "suppliers" | "schemes" | "tenders" | "news";

const ORDER: Focus[] = ["buyers", "suppliers", "schemes", "tenders", "news"];

const NODES: Record<Focus, { label: string; x: number; y: number; end: [number, number] }> = {
  buyers: { label: "Buyers", x: 240, y: 30, end: [300, 50] },
  suppliers: { label: "Suppliers", x: 409, y: 147, end: [461.68, 167.47] },
  schemes: { label: "Schemes", x: 354, y: 338, end: [399.92, 357.53] },
  tenders: { label: "Tenders", x: 155, y: 338, end: [200.08, 357.53] },
  news: { label: "News", x: 91, y: 147, end: [138.32, 167.47] },
};

const DETAIL: Record<Focus, { eyebrow: string; chips: string[] }> = {
  buyers: {
    eyebrow: "Buyers · find, compare, request",
    chips: ["Electrolysers", "Fuel cells", "Storage tanks", "Request a quote"],
  },
  suppliers: {
    eyebrow: "Suppliers · verified with dated checks",
    chips: ["Manufacturers", "Traders", "EPC firms", "Testing labs"],
  },
  schemes: { eyebrow: "Schemes · central and state", chips: ["SIGHT", "Hydrogen hubs", "State policies", "R&D calls"] },
  tenders: { eyebrow: "Tenders · closing soon", chips: ["SECI", "PSUs", "State agencies", "Ports"] },
  news: { eyebrow: "News · India first", chips: ["Policy", "Projects", "Technology", "Mobility"] },
};

const HUB: [number, number] = [300, 220];
/** The pulse sits 62% of the way from the hub to the focused node, as drawn. */
const PULSE_AT = 0.62;
const STEP_MS = 2500;

/** Frame pixels (600 wide) to container units, so the drawing scales with the card. */
const u = (px: number) => `${(px / 6).toFixed(4)}cqw`;

const change: CSSProperties = { transition: "all 400ms ease-in-out" };

export function HeroNetwork({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const running = !reduced;

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ORDER.length);
    }, STEP_MS);
    return () => {
      clearInterval(timer);
    };
  }, [running]);

  const focus: Focus = reduced ? "buyers" : (ORDER[index] ?? "buyers");
  const end = NODES[focus].end;
  const pulse: [number, number] = [HUB[0] + (end[0] - HUB[0]) * PULSE_AT, HUB[1] + (end[1] - HUB[1]) * PULSE_AT];
  const detail = DETAIL[focus];

  return (
    <div
      className={cx("@container relative w-full max-w-150", className)}
      data-testid="hero-network"
      data-focus={focus}
      data-running={running}
    >
      <div
        className="relative aspect-[600/560] w-full overflow-hidden rounded-feature bg-inverse shadow-ink-float"
        role="img"
        aria-label="H2 Economy connects buyers, suppliers, schemes, tenders and news"
      >
        <svg viewBox="0 0 600 560" className="absolute inset-0 size-full" aria-hidden="true">
          <circle
            cx="300"
            cy="220"
            r="170"
            fill="none"
            stroke="var(--color-ink-700)"
            strokeWidth="1.5"
            strokeDasharray="1.5 7"
            strokeLinecap="round"
          />
          {ORDER.map((id) => {
            const [x, y] = NODES[id].end;
            const on = id === focus;
            return (
              <line
                key={id}
                x1={HUB[0]}
                y1={HUB[1]}
                x2={x}
                y2={y}
                stroke={on ? "var(--color-fresh-500)" : "var(--color-ink-700)"}
                strokeWidth={on ? 2 : 1.5}
                strokeDasharray={on ? undefined : "5 5"}
                style={change}
              />
            );
          })}
          <circle
            r="6"
            cx="0"
            cy="0"
            fill="var(--color-fresh-500)"
            style={{ ...change, transform: `translate(${String(pulse[0])}px, ${String(pulse[1])}px)` }}
          />
        </svg>

        <div
          className="absolute flex flex-col items-center justify-center rounded-pill bg-accent text-primary shadow-ink-float-sm"
          style={{ left: u(238), top: u(158), width: u(124), height: u(124), gap: u(2) }}
        >
          <span
            className="font-display font-bold"
            style={{ fontSize: u(20), lineHeight: 1.3, letterSpacing: "-0.015em" }}
          >
            H2 Economy
          </span>
          <span
            className="font-mono font-medium uppercase"
            style={{ fontSize: u(12), lineHeight: u(16), letterSpacing: "0.08em" }}
          >
            Ecosystem
          </span>
        </div>

        {ORDER.map((id) => {
          const n = NODES[id];
          const on = id === focus;
          return (
            <span
              key={id}
              data-node={id}
              data-focused={on}
              className={cx(
                "absolute rounded-pill font-sans font-semibold whitespace-nowrap",
                on ? "bg-accent text-primary shadow-ink-lift" : "bg-ink-700 text-inverse",
              )}
              style={{
                ...change,
                left: u(n.x),
                top: u(n.y),
                padding: `${u(10)} ${u(16)}`,
                fontSize: u(14),
                lineHeight: u(20),
              }}
            >
              {n.label}
            </span>
          );
        })}

        <div
          className="absolute flex flex-col overflow-hidden border border-ink-700"
          style={{
            left: u(32),
            top: u(398),
            width: u(536),
            height: u(130),
            padding: `${u(18)} ${u(20)}`,
            gap: u(12),
            borderRadius: u(14),
          }}
          aria-live="off"
        >
          <p
            key={`e-${focus}`}
            className="animate-[h2-fade_400ms_ease-in-out] font-mono font-medium text-fresh-300 uppercase"
            style={{ fontSize: u(12), lineHeight: u(16), letterSpacing: "0.08em" }}
          >
            {detail.eyebrow}
          </p>
          <ul key={`c-${focus}`} className="flex animate-[h2-fade_400ms_ease-in-out] flex-wrap" style={{ gap: u(8) }}>
            {detail.chips.map((c) => (
              <li
                key={c}
                className="rounded-pill bg-ink-700 font-sans font-semibold whitespace-nowrap text-inverse"
                style={{ padding: `${u(6)} ${u(12)}`, fontSize: u(12), lineHeight: u(16) }}
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
