import type { MapPoint, MapProvider } from "./MapView";

/* A map stand-in that needs no tiles vendor (A176, until M7): one bubble per state at its capital's approximate position,
   sized by how many points it holds. It draws no country or state outline, so it never shows a boundary; the list by
   state (MapView's "Show the list instead") stays the keyboard and screen-reader alternative. */

/** Approximate capital positions (lat, lng) for each state and union territory. */
const CAPITALS: Record<string, [number, number]> = {
  "Andaman and Nicobar Islands": [11.62, 92.73],
  "Andhra Pradesh": [16.51, 80.52],
  "Arunachal Pradesh": [27.08, 93.61],
  Assam: [26.14, 91.79],
  Bihar: [25.59, 85.14],
  Chandigarh: [30.73, 76.78],
  Chhattisgarh: [21.25, 81.63],
  "Dadra and Nagar Haveli and Daman and Diu": [20.4, 72.83],
  Delhi: [28.61, 77.21],
  Goa: [15.49, 73.83],
  Gujarat: [23.22, 72.65],
  Haryana: [30.73, 76.78],
  "Himachal Pradesh": [31.1, 77.17],
  "Jammu and Kashmir": [34.08, 74.8],
  Jharkhand: [23.34, 85.31],
  Karnataka: [12.97, 77.59],
  Kerala: [8.52, 76.94],
  Ladakh: [34.15, 77.58],
  Lakshadweep: [10.57, 72.64],
  "Madhya Pradesh": [23.26, 77.41],
  Maharashtra: [19.08, 72.88],
  Manipur: [24.82, 93.94],
  Meghalaya: [25.58, 91.89],
  Mizoram: [23.73, 92.72],
  Nagaland: [25.67, 94.11],
  Odisha: [20.3, 85.82],
  Puducherry: [11.94, 79.81],
  Punjab: [30.73, 76.78],
  Rajasthan: [26.91, 75.79],
  Sikkim: [27.33, 88.61],
  "Tamil Nadu": [13.08, 80.27],
  Telangana: [17.39, 78.49],
  Tripura: [23.83, 91.29],
  "Uttar Pradesh": [26.85, 80.95],
  Uttarakhand: [30.32, 78.03],
  "West Bengal": [22.57, 88.36],
};

const W = 600;
const H = 640;
const x = (lng: number) => ((lng - 67) / (98 - 67)) * W;
const y = (lat: number) => ((37.5 - lat) / (37.5 - 6)) * H;

function StateBubbles({ points, label }: { points: MapPoint[]; label: string }) {
  const counts = new Map<string, number>();
  for (const p of points) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
  const placed = [...counts.entries()].filter(([g]) => g in CAPITALS).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...placed.map(([, n]) => n));
  const summary = placed.map(([g, n]) => `${g} ${String(n)}`).join(", ");
  return (
    <figure className="flex flex-col gap-2 bg-page p-4">
      <svg
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        role="img"
        aria-label={`${label}: ${summary}`}
        className="mx-auto h-auto w-full max-w-130"
      >
        {placed.map(([g, n]) => {
          const [lat, lng] = CAPITALS[g] ?? [0, 0];
          const r = 8 + 32 * Math.sqrt(n / max);
          return (
            <g key={g}>
              <circle cx={x(lng)} cy={y(lat)} r={r} className="fill-fresh-500/40 stroke-fresh-600" strokeWidth={1.5} />
              <text x={x(lng)} y={y(lat) + 4} textAnchor="middle" className="fill-ink-900 type-label-sm">
                {n}
              </text>
              <text x={x(lng)} y={y(lat) + r + 14} textAnchor="middle" className="fill-ink-700 type-caption">
                {g}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="type-caption text-secondary">
        One circle per state, at its capital; positions are approximate and no boundaries are drawn.
      </figcaption>
    </figure>
  );
}

/** The provider MapView takes until a tiles vendor is chosen (M7). */
export const stateBubbles: MapProvider = {
  name: "state-bubbles",
  render: (props) => <StateBubbles {...props} />,
};
