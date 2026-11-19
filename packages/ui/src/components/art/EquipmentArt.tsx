import type { ReactNode } from "react";
import { cx } from "../../lib/cx";

/*
 * Equipment drawings (design upgrade phase 1, founder-approved 19 Nov 2026, beyond Figma): every product, category
 * and news card used the same bolt or newspaper on a mint gradient. These are drawn the way process engineers draw
 * plant, in the vocabulary of P&ID and general-arrangement drawings: a stack with its tie rods, a vessel with dished
 * heads on saddles, the compressor and valve symbols, an instrument bubble. Crisp geometry only, from the Figma
 * tokens (fresh and ink), on a faint drafting grid with a dimension line under the object.
 *
 * A real product photo, when a supplier uploads one, always takes the place of the drawing.
 */

export type EquipmentKind =
  | "electrolyser"
  | "fuel-cell"
  | "compressor"
  | "vessel"
  | "cylinders"
  | "valve"
  | "regulator"
  | "sensor"
  | "gauge"
  | "dispenser"
  | "trailer"
  | "column"
  | "exchanger"
  | "rectifier"
  | "generator"
  | "lattice"
  | "flowsheet"
  | "molecule";

/** Matched on words in a category's address or label, like the tile icons, so new categories need no code change. */
const KIND_WORDS: [RegExp, EquipmentKind][] = [
  [/electroly|stack|generator|production|pem|alkaline|soec|aem/, "electrolyser"],
  [/fuel.?cell/, "fuel-cell"],
  [/compress|booster|pump/, "compressor"],
  [/cylinder|tank/, "cylinders"],
  [/storage|vessel|buffer/, "vessel"],
  [/regulator/, "regulator"],
  [/valve/, "valve"],
  [/sensor|detector|analy[sz]er/, "sensor"],
  [/test|certif|inspection|safety|hazop/, "gauge"],
  [/dispens|refuel|station|mobility/, "dispenser"],
  [/trailer|transport|truck|logistic/, "trailer"],
  [/purif|treatment|dryer|separator/, "column"],
  [/liquef|heat|exchanger|cool/, "exchanger"],
  [/rectifier|power.?conversion|converter|inverter/, "rectifier"],
  [/chp|combined/, "generator"],
  [/catalyst|membrane|material|coating|electrode/, "lattice"],
  [/service|epc|engineering|consult|design|o.?m\b/, "flowsheet"],
];

export function equipmentKind(...words: (string | null | undefined)[]): EquipmentKind {
  const text = words.filter(Boolean).join(" ").toLowerCase();
  return KIND_WORDS.find(([w]) => w.test(text))?.[1] ?? "molecule";
}

/* Drawing helpers. Every drawing lives in a 240 × 150 box, object centred around (120, 72). */

const line = "stroke-fresh-700";
const body = "fill-neutral-0 stroke-fresh-700";
const accent = "fill-fresh-500";
const label = "fill-fresh-700";

function Grid() {
  // Runs well past the 240 × 150 box, so a wide tile shows more grid around the drawing rather than bare mint.
  const v = Array.from({ length: 81 }, (_, i) => -360 + i * 12);
  const h = Array.from({ length: 41 }, (_, i) => -168 + i * 12);
  return (
    <g className="stroke-fresh-200" strokeWidth={0.5}>
      {v.map((x) => (
        <line key={`v${x}`} x1={x} y1={-168} x2={x} y2={318} />
      ))}
      {h.map((y) => (
        <line key={`h${y}`} x1={-360} y1={y} x2={600} y2={y} />
      ))}
    </g>
  );
}

/** A drafting dimension line with end ticks under the object. */
function Dimension({ x1, x2, y = 132 }: { x1: number; x2: number; y?: number }) {
  return (
    <g className="stroke-fresh-300" strokeWidth={1}>
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} />
    </g>
  );
}

function Tag({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={9} fontWeight={600} className={label} stroke="none">
      {children}
    </text>
  );
}

function Stack({ terminals }: { terminals?: boolean }) {
  const cells = Array.from({ length: 13 }, (_, i) => 86 + i * 5.6);
  return (
    <>
      {/* tie rods */}
      <line x1={62} y1={50} x2={178} y2={50} className={line} />
      <line x1={62} y1={96} x2={178} y2={96} className={line} />
      {/* end plates and cell block */}
      <rect x={68} y={42} width={14} height={62} rx={2} className={body} />
      <rect x={158} y={42} width={14} height={62} rx={2} className={body} />
      <rect x={82} y={48} width={76} height={50} className={body} />
      {cells.map((x) => (
        <line key={x} x1={x} y1={48} x2={x} y2={98} className="stroke-fresh-300" />
      ))}
      {/* nuts */}
      {[62, 178].map((x) =>
        [50, 96].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={2.5} className={accent} stroke="none" />),
      )}
      {terminals ? (
        <>
          <line x1={75} y1={42} x2={75} y2={28} className={line} />
          <line x1={165} y1={42} x2={165} y2={28} className={line} />
          <Tag x={75} y={24}>
            +
          </Tag>
          <Tag x={165} y={24}>
            −
          </Tag>
          <Tag x={120} y={36}>
            H₂ · air
          </Tag>
        </>
      ) : (
        <>
          <path d="M100 48 V30 H88" fill="none" className={line} />
          <path d="M140 48 V30 H152" fill="none" className={line} />
          <Tag x={78} y={33}>
            H₂
          </Tag>
          <Tag x={162} y={33}>
            O₂
          </Tag>
        </>
      )}
      {/* feet */}
      <path d="M72 104 v8 h10 M158 104 v8 h10" fill="none" className={line} />
      <Dimension x1={68} x2={172} y={126} />
    </>
  );
}

function Pipe({ y = 76, x1 = 24, x2 = 216 }: { y?: number; x1?: number; x2?: number }) {
  return <line x1={x1} y1={y} x2={x2} y2={y} className={line} strokeWidth={2} />;
}

function FlowArrow({ x, y }: { x: number; y: number }) {
  return <path d={`M${x} ${y - 5} L${x + 8} ${y} L${x} ${y + 5} Z`} className={accent} stroke="none" />;
}

export const DRAWINGS: Record<EquipmentKind, () => ReactNode> = {
  electrolyser: () => <Stack />,
  "fuel-cell": () => <Stack terminals />,
  compressor: () => (
    <>
      <Pipe />
      <circle cx={120} cy={76} r={30} className={body} />
      <path d="M96 58 L144 68 M96 94 L144 84" fill="none" className={line} />
      <FlowArrow x={50} y={76} />
      <FlowArrow x={178} y={76} />
      <rect x={104} y={106} width={32} height={8} rx={1} className={body} />
      <Dimension x1={90} x2={150} y={128} />
    </>
  ),
  vessel: () => (
    <>
      <path d="M70 48 H170 A22 26 0 0 1 170 100 H70 A22 26 0 0 1 70 48 Z" className={body} />
      <line x1={70} y1={48} x2={70} y2={100} className="stroke-fresh-300" />
      <line x1={170} y1={48} x2={170} y2={100} className="stroke-fresh-300" />
      <path d="M120 48 V32 M112 32 H128" fill="none" className={line} />
      <circle cx={120} cy={24} r={6} className={body} />
      <path d="M120 24 L123 21" className={line} />
      <path d="M80 100 L74 114 H102 L96 100 M144 100 L138 114 H166 L160 100" fill="none" className={line} />
      <Dimension x1={48} x2={192} y={128} />
    </>
  ),
  cylinders: () => (
    <>
      {[88, 120, 152].map((x) => (
        <g key={x}>
          <rect x={x - 12} y={38} width={24} height={76} rx={12} className={body} />
          <rect x={x - 4} y={28} width={8} height={10} rx={1} className={body} />
          <circle cx={x} cy={25} r={3} className={accent} stroke="none" />
        </g>
      ))}
      <line x1={70} y1={70} x2={170} y2={70} className="stroke-fresh-300" />
      <Dimension x1={76} x2={164} y={128} />
    </>
  ),
  valve: () => (
    <>
      <Pipe />
      <path d="M100 62 L120 76 L100 90 Z M140 62 L120 76 L140 90 Z" className={body} />
      <path d="M120 76 V46 M106 46 H134" fill="none" className={line} strokeWidth={2} />
      <FlowArrow x={52} y={76} />
      <Dimension x1={96} x2={144} y={112} />
    </>
  ),
  regulator: () => (
    <>
      <Pipe />
      <path d="M100 62 L120 76 L100 90 Z M140 62 L120 76 L140 90 Z" className={body} />
      <line x1={120} y1={76} x2={120} y2={56} className={line} />
      <path d="M102 56 A18 14 0 0 1 138 56 Z" className={body} />
      <path d="M150 76 V50 H138" fill="none" className="stroke-fresh-300" strokeDasharray="3 3" />
      <FlowArrow x={52} y={76} />
      <Dimension x1={96} x2={144} y={112} />
    </>
  ),
  sensor: () => (
    <>
      <Pipe y={104} />
      <line x1={120} y1={104} x2={120} y2={74} className="stroke-fresh-300" strokeDasharray="3 3" />
      <circle cx={120} cy={52} r={24} className={body} />
      <line x1={96} y1={52} x2={144} y2={52} className={line} />
      <Tag x={120} y={46}>
        AT
      </Tag>
      <Tag x={120} y={66}>
        H₂
      </Tag>
      <FlowArrow x={52} y={104} />
    </>
  ),
  gauge: () => (
    <>
      <Pipe y={112} />
      <line x1={120} y1={112} x2={120} y2={90} className={line} strokeWidth={2} />
      <circle cx={120} cy={58} r={32} className={body} />
      {Array.from({ length: 11 }, (_, i) => {
        const a = ((-210 + i * 24) * Math.PI) / 180;
        const r1 = i % 5 === 0 ? 22 : 25;
        return (
          <line
            key={i}
            x1={120 + Math.cos(a) * r1}
            y1={58 + Math.sin(a) * r1}
            x2={120 + Math.cos(a) * 28}
            y2={58 + Math.sin(a) * 28}
            className={line}
          />
        );
      })}
      <line x1={120} y1={58} x2={138} y2={44} className={line} strokeWidth={2} />
      <circle cx={120} cy={58} r={3} className={accent} stroke="none" />
    </>
  ),
  dispenser: () => (
    <>
      <rect x={92} y={26} width={48} height={92} rx={4} className={body} />
      <rect x={100} y={36} width={32} height={20} rx={2} className="fill-fresh-50 stroke-fresh-700" />
      <line x1={104} y1={46} x2={128} y2={46} className="stroke-fresh-300" />
      <path d="M140 70 C170 70 170 104 150 104" fill="none" className={line} strokeWidth={2} />
      <rect x={140} y={100} width={14} height={8} rx={2} className={body} />
      <rect x={86} y={118} width={60} height={6} rx={1} className={body} />
      <Tag x={116} y={84}>
        H₂
      </Tag>
    </>
  ),
  trailer: () => (
    <>
      {[46, 62, 78].map((y) => (
        <rect key={y} x={46} y={y} width={150} height={14} rx={7} className={body} />
      ))}
      <rect x={40} y={94} width={166} height={8} className={body} />
      <path d="M206 98 H218" className={line} />
      {[72, 92, 170, 190].map((x) => (
        <circle key={x} cx={x} cy={110} r={8} className={body} />
      ))}
      <Dimension x1={40} x2={206} y={130} />
    </>
  ),
  column: () => (
    <>
      <path d="M104 34 A16 10 0 0 1 136 34 V110 A16 10 0 0 1 104 110 Z" className={body} />
      {[50, 64, 78, 92].map((y) => (
        <line key={y} x1={104} y1={y} x2={136} y2={y} className="stroke-fresh-300" strokeDasharray="4 3" />
      ))}
      <path d="M104 100 H80 M136 44 H160 M120 24 V16" fill="none" className={line} />
      <FlowArrow x={84} y={100} />
      <Dimension x1={96} x2={144} y={130} />
    </>
  ),
  exchanger: () => (
    <>
      <Pipe />
      <circle cx={120} cy={76} r={30} className={body} />
      <path d="M90 76 L100 62 L110 90 L120 62 L130 90 L140 62 L150 76" fill="none" className={line} />
      <path d="M120 46 V28 M120 106 V124" fill="none" className="stroke-fresh-300" />
      <FlowArrow x={50} y={76} />
    </>
  ),
  rectifier: () => (
    <>
      <rect x={88} y={44} width={64} height={64} rx={4} className={body} />
      <line x1={88} y1={108} x2={152} y2={44} className={line} />
      <path d="M96 62 C100 54 104 54 108 62 S116 70 120 62" fill="none" className={line} />
      <path d="M124 92 H144 M124 98 H144" fill="none" className={line} strokeDasharray="0" />
      <path d="M40 76 H88 M152 76 H200" fill="none" className={line} strokeWidth={2} />
      <Tag x={60} y={68}>
        AC
      </Tag>
      <Tag x={180} y={68}>
        DC
      </Tag>
    </>
  ),
  generator: () => (
    <>
      <Pipe />
      <circle cx={120} cy={76} r={28} className={body} />
      <Tag x={120} y={80}>
        G
      </Tag>
      {/* exhaust heat recovered in an exchanger above the set */}
      <path d="M120 48 V30 H150" fill="none" className={line} />
      <circle cx={162} cy={30} r={12} className={body} />
      <path d="M150 30 L155 23 L159 37 L164 23 L168 37 L174 30" fill="none" className={line} />
      <FlowArrow x={50} y={76} />
      <Dimension x1={92} x2={148} y={124} />
    </>
  ),
  lattice: () => {
    const pts: [number, number][] = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) pts.push([76 + c * 22 + (r % 2) * 11, 34 + r * 20]);
    return (
      <>
        {pts.map(([x, y], i) =>
          pts
            .slice(i + 1)
            .filter(([x2, y2]) => Math.hypot(x2 - x, y2 - y) < 23)
            .map(([x2, y2]) => (
              <line key={`${x}${y}${x2}${y2}`} x1={x} y1={y} x2={x2} y2={y2} className="stroke-fresh-300" />
            )),
        )}
        {pts.map(([x, y], i) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={i % 3 === 0 ? 5 : 4} className={i % 3 === 0 ? accent : body} />
        ))}
        <Dimension x1={72} x2={186} y={124} />
      </>
    );
  },
  flowsheet: () => (
    <>
      <path d="M40 48 A10 8 0 0 1 60 48 V104 A10 8 0 0 1 40 104 Z" className={body} />
      <path d="M60 60 H96" fill="none" className={line} />
      <path d="M96 52 L108 60 L96 68 Z M120 52 L108 60 L120 68 Z" className={body} />
      <path d="M120 60 H140" className={line} />
      <circle cx={156} cy={60} r={16} className={body} />
      <path d="M146 50 L168 56 M146 70 L168 64" fill="none" className={line} />
      <path d="M172 60 H200 V96 H176" fill="none" className={line} />
      <rect x={146} y={88} width={30} height={20} rx={2} className={body} />
      <FlowArrow x={74} y={60} />
    </>
  ),
  molecule: () => (
    <>
      <line x1={98} y1={76} x2={142} y2={76} className={line} strokeWidth={3} />
      <circle cx={92} cy={76} r={24} className={body} />
      <circle cx={148} cy={76} r={24} className={body} />
      <Tag x={92} y={80}>
        H
      </Tag>
      <Tag x={148} y={80}>
        H
      </Tag>
    </>
  ),
};

export interface EquipmentArtProps {
  kind: EquipmentKind;
  className?: string;
  /** Leave the drafting grid out, for small tiles. */
  plain?: boolean;
}

/** A decorative drawing: hidden from screen readers, since the card's own words name the product. */
export function EquipmentArt({ kind, className, plain = false }: EquipmentArtProps) {
  return (
    <svg
      viewBox="0 0 240 150"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("block size-full overflow-hidden [&_*]:[vector-effect:non-scaling-stroke]", className)}
    >
      {plain ? null : <Grid />}
      <g className="transition-transform duration-(--motion-duration-base) ease-standard [transform-origin:120px_72px] group-hover:scale-[1.04]">
        {DRAWINGS[kind]()}
      </g>
    </svg>
  );
}
