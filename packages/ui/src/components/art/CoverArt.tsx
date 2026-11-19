import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { DRAWINGS, type EquipmentKind } from "./EquipmentArt";

/*
 * News and insight covers (design upgrade phase 1, 19 Nov 2026, beyond Figma): every story showed the same newspaper
 * icon. A cover is the story's topic drawn in the same drafting vocabulary as the equipment drawings, enlarged and
 * cropped by the card's edge, its position varied by the story's address so a row of stories never repeats.
 * Covers are decorative; a real image from the CMS always replaces one.
 */

export type CoverTopic =
  "policy" | "tenders" | "projects" | "technology" | "mobility" | "markets" | "global" | "press" | "general";

const TOPIC_WORDS: [RegExp, CoverTopic][] = [
  [/tender|award|auction|bid/, "tenders"],
  [/polic|regulat|rule|scheme|standard|law/, "policy"],
  [/project|invest|plant|site|land|park/, "projects"],
  [/mobility|refuel|vehicle|bus|truck|transport/, "mobility"],
  [/market|price|cost|lcoh/, "markets"],
  [/global|world|international/, "global"],
  [/press/, "press"],
  [/tech|electroly|research|innovation|stack/, "technology"],
];

export function coverTopic(...words: (string | null | undefined)[]): CoverTopic {
  const text = words.filter(Boolean).join(" ").toLowerCase();
  return TOPIC_WORDS.find(([w]) => w.test(text))?.[1] ?? "general";
}

const line = "stroke-fresh-700";
const soft = "stroke-fresh-300";
const body = "fill-neutral-0 stroke-fresh-700";
const accent = "fill-fresh-500";

/* Topic motifs in the same 240 × 150 box as the equipment drawings. */
const MOTIFS: Record<Exclude<CoverTopic, "technology" | "mobility" | "general">, () => ReactNode> = {
  /* A gazette page with its numbered clauses and the issuing seal. */
  policy: () => (
    <>
      <path d="M84 20 H146 L160 34 V128 H84 Z" className={body} />
      <path d="M146 20 V34 H160" fill="none" className={line} />
      {[46, 58, 70, 82, 94].map((y, i) => (
        <g key={y}>
          <circle cx={96} cy={y} r={2} className={accent} stroke="none" />
          <line x1={104} y1={y} x2={i % 2 ? 136 : 148} y2={y} className={soft} />
        </g>
      ))}
      <circle cx={140} cy={112} r={10} className={body} />
      <circle cx={140} cy={112} r={5} className={accent} stroke="none" />
    </>
  ),
  /* A bid timeline: issue, pre-bid, the bid due date marked, opening. */
  tenders: () => (
    <>
      <line x1={36} y1={84} x2={204} y2={84} className={line} strokeWidth={2} />
      {[48, 92, 150, 192].map((x, i) => (
        <g key={x}>
          <line x1={x} y1={76} x2={x} y2={92} className={line} />
          {i === 2 ? (
            <>
              <circle cx={x} cy={84} r={9} className={accent} stroke="none" />
              <path d={`M${x} 75 V40 H${x + 34} V58 H${x}`} className={body} />
            </>
          ) : (
            <circle cx={x} cy={84} r={4} className={body} />
          )}
        </g>
      ))}
      <path d="M48 100 V112 H92 V100" fill="none" className={soft} />
    </>
  ),
  /* A site plan: plots, the pipeline corridor and the plant marker. */
  projects: () => (
    <>
      {[
        [40, 30, 52, 34],
        [100, 30, 40, 34],
        [148, 30, 56, 70],
        [40, 72, 100, 46],
      ].map(([x, y, w, h]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={w} height={h} rx={2} className={body} />
      ))}
      <path
        d="M24 126 C70 120 120 112 148 100 S200 92 220 96"
        fill="none"
        className={line}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <path d="M90 92 m-10 0 a10 10 0 1 1 20 0 c0 8 -10 16 -10 16 s-10 -8 -10 -16 Z" className={accent} stroke="none" />
      <circle cx={90} cy={92} r={3.5} className="fill-neutral-0" stroke="none" />
    </>
  ),
  /* A stepped index line against its grid, with no figures: a sign for markets, never a chart of real data. */
  markets: () => (
    <>
      <path d="M36 118 H204 M36 118 V28" fill="none" className={line} />
      <path d="M44 104 H70 V92 H96 V98 H122 V70 H148 V76 H174 V46 H200" fill="none" className={line} strokeWidth={2} />
      {[70, 122, 174].map((x, i) => (
        <circle key={x} cx={x} cy={[92, 70, 46][i]} r={4} className={accent} stroke="none" />
      ))}
    </>
  ),
  /* Meridians and parallels, with a route arriving from the west. */
  global: () => (
    <>
      <circle cx={132} cy={75} r={48} className={body} />
      {[-30, 0, 30].map((dy) => (
        <ellipse key={dy} cx={132} cy={75 + dy} rx={Math.sqrt(48 * 48 - dy * dy)} ry={4} className={soft} fill="none" />
      ))}
      {[16, 32].map((rx) => (
        <ellipse key={rx} cx={132} cy={75} rx={rx} ry={48} className={soft} fill="none" />
      ))}
      <line x1={132} y1={27} x2={132} y2={123} className={soft} />
      <path d="M28 104 C56 52 96 44 124 60" fill="none" className={line} strokeWidth={2} />
      <circle cx={124} cy={60} r={5} className={accent} stroke="none" />
    </>
  ),
  /* A release sheet with signal arcs. */
  press: () => (
    <>
      <rect x={64} y={30} width={64} height={88} rx={3} className={body} />
      {[46, 56, 66, 76, 86].map((y, i) => (
        <line
          key={y}
          x1={74}
          y1={y}
          x2={i === 0 ? 108 : 118}
          y2={y}
          className={i === 0 ? line : soft}
          strokeWidth={i === 0 ? 2 : 1.5}
        />
      ))}
      {[18, 30, 42].map((r) => (
        <path
          key={r}
          d={`M140 ${74 - r} A${r} ${r} 0 0 1 140 ${74 + r}`}
          fill="none"
          className={r === 18 ? line : soft}
        />
      ))}
    </>
  ),
};

const TOPIC_DRAWING: Partial<Record<CoverTopic, EquipmentKind>> = {
  technology: "electrolyser",
  mobility: "dispenser",
  general: "molecule",
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* Where the enlarged motif sits: cropped by one edge or corner, so it reads as a cover rather than a centred icon. */
const PLACEMENTS: [dx: number, dy: number, scale: number][] = [
  [44, 6, 1.3],
  [-44, 4, 1.3],
  [28, 20, 1.2],
  [-30, -12, 1.25],
  [36, -14, 1.35],
];

/** Enlarge about the drawing's centre, then shift. */
function placement(seed: string): string {
  const [dx, dy, s] = PLACEMENTS[hash(seed) % PLACEMENTS.length] ?? [0, 0, 1.25];
  return `translate(${dx} ${dy}) translate(120 75) scale(${s}) translate(-120 -75)`;
}

export interface CoverArtProps {
  topic: CoverTopic;
  /** The story's address or title: picks the placement, so neighbouring covers differ. */
  seed: string;
  className?: string;
}

export function CoverArt({ topic, seed, className }: CoverArtProps) {
  const kind = TOPIC_DRAWING[topic];
  const motif = kind ? DRAWINGS[kind]() : MOTIFS[topic as keyof typeof MOTIFS]();
  // The grid runs well past the 240 × 150 box: a wide card shows more grid around the motif instead of enlarging it.
  const v = Array.from({ length: 81 }, (_, i) => -360 + i * 12);
  const h = Array.from({ length: 41 }, (_, i) => -168 + i * 12);
  return (
    <svg
      viewBox="0 0 240 150"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("block size-full overflow-hidden [&_*]:[vector-effect:non-scaling-stroke]", className)}
    >
      <g className="stroke-fresh-200" strokeWidth={0.5}>
        {v.map((x) => (
          <line key={`v${x}`} x1={x} y1={-168} x2={x} y2={318} />
        ))}
        {h.map((y) => (
          <line key={`h${y}`} x1={-360} y1={y} x2={600} y2={y} />
        ))}
      </g>
      <g transform={placement(seed)}>
        <g className="transition-transform duration-(--motion-duration-slow) ease-standard [transform-origin:120px_75px] group-hover:scale-[1.03]">
          {motif}
        </g>
      </g>
    </svg>
  );
}
