import { tokens } from "@h2india/ui";
import type { CSSProperties } from "react";

// Every token from Figma page 01 "Design System" (node 10:2), for side-by-side comparison.

const USAGE: Record<string, string> = {
  "fresh/50": "Mint bands, hero",
  "fresh/100": "Poster tiles",
  "fresh/200": "Chips, soft badges",
  "fresh/300": "Heading marker",
  "fresh/500": "Primary fill, never text",
  "fresh/600": "Links, selected",
  "fresh/700": "Link hover",
  "ink/0": "Page, cards",
  "ink/50": "Grey bands, footer",
  "ink/200": "Dividers, card borders",
  "ink/300": "Outline buttons",
  "ink/400": "Hover border",
  "ink/500": "Secondary text, inputs",
  "ink/700": "Body text",
  "ink/900": "Headings, focus",
  "success/subtle": "Success fill",
  "warning/subtle": "Warning fill",
  "error/subtle": "Error fill",
};

const SAMPLE: Record<string, string> = {
  Display: "The marketplace for hydrogen equipment",
  "Heading/H1": "Electrolysers from verified suppliers",
  "Heading/H2": "Compare by specification",
  "Heading/H3": "Rated specifications",
  "Heading/H4": "PEM electrolyser stack, 1 MW",
  "Body/Large": "Buy hydrogen equipment from verified Indian and global suppliers.",
  "Body/Default": "Request quotes from several suppliers and compare them line by line.",
  "Body/Small": "Delivery to Pune in 6 to 8 weeks · GST invoice",
  "Label/Large": "Request a quote",
  "Label/Default": "Company GSTIN",
  "Label/Small": "Verified",
  "Label/Nav": "Marketplace",
  Caption: "Updated 11 Nov 2026, 18:13 IST",
  "Spec/Default": "ORD-2026-000418 · 27AABCU9603R1ZM · ₹48,79,400",
  "Spec/Eyebrow": "Green hydrogen",
};

const cssVar = tokens.cssVar as Record<string, string>;
const v = (name: string) => `var(${cssVar[name] ?? ""})`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="type-h2">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Swatch({ name, hex, style }: { name: string; hex: string; style: CSSProperties }) {
  return (
    <figure className="w-36">
      <div className="h-22 rounded-control border border-default" style={style} />
      <figcaption className="mt-2">
        <span className="type-label block text-primary">{name}</span>
        <span className="type-spec block text-secondary">{hex.toUpperCase()}</span>
        {USAGE[name] ? <span className="type-caption block text-secondary">{USAGE[name]}</span> : null}
      </figcaption>
    </figure>
  );
}

export default function TokensPage() {
  const colors = Object.entries(tokens.color);
  const primitives = colors.filter(([n]) => /^(fresh|ink|success|warning|error)\//.test(n));
  const semantic = colors.filter(([n]) => /^(text|bg|border|icon)\//.test(n));

  return (
    <main className="mx-auto max-w-[1312px] px-6 py-16">
      <p className="type-label-sm text-secondary">Developer · step 2.1</p>
      <h1 className="type-h1 mt-2">Foundations</h1>
      <p className="type-body-lg mt-2 max-w-3xl">
        Generated from Figma page 01 (file swxSe4zWyngLYdZ2Qe9CWJ, node 10:2). Compare with the Figma frame at 1440. To
        change a value, change it in Figma and run the token sync (docs/design-tokens.md).
      </p>

      <Section title="Colour">
        {["fresh", "ink", "success", "warning", "error"].map((group) => (
          <div key={group} className="mb-8">
            <h3 className="type-label-sm text-secondary uppercase">{group}</h3>
            <div className="mt-3 flex flex-wrap gap-4">
              {primitives
                .filter(([n]) => n.startsWith(`${group}/`))
                .map(([n, hex]) => (
                  <Swatch key={n} name={n} hex={hex} style={{ background: v(n) }} />
                ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Semantic colours">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="type-label border-b border-default">
              <th className="py-2">Figma token</th>
              <th className="py-2">Class</th>
              <th className="py-2">CSS variable</th>
              <th className="py-2">Value</th>
              <th className="py-2">Sample</th>
            </tr>
          </thead>
          <tbody className="type-body-sm">
            {semantic.map(([n, hex]) => {
              const [group, ...rest] = n.split("/");
              const cls = group === "icon" ? `text-icon-${rest.join("-")}` : `${group}-${rest.join("-")}`;
              const sample: CSSProperties =
                group === "text" || group === "icon"
                  ? { color: v(n) }
                  : group === "bg"
                    ? { background: v(n) }
                    : { border: `2px solid ${v(n)}` };
              return (
                <tr key={n} className="border-b border-default">
                  <td className="type-spec py-2">{n}</td>
                  <td className="type-spec py-2">{cls}</td>
                  <td className="type-spec py-2 text-secondary">{cssVar[n]}</td>
                  <td className="type-spec py-2 text-secondary">{hex.toUpperCase()}</td>
                  <td className="py-2">
                    <span
                      className="type-label inline-flex h-8 min-w-20 items-center rounded-control px-3"
                      style={sample}
                    >
                      {group === "text" || group === "icon" ? "Aa ₹" : ""}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-6">
          {Object.entries(tokens.textStyle).map(([name, cls]) => (
            <div key={name} className="grid grid-cols-1 gap-2 md:grid-cols-[280px_1fr] md:items-baseline">
              <span className="type-spec text-secondary">
                {name} · .{cls}
              </span>
              <span className={`${cls} text-primary`}>{SAMPLE[name] ?? name}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-card bg-subtle p-6" data-testid="glyph-check">
          <h3 className="type-h3">Glyph check</h3>
          <p className="type-display mt-4">H₂ Economy ₹48,79,400</p>
          <p className="type-h1 mt-2">H₂ Economy ₹48,79,400 → × •</p>
          <p className="type-body mt-2">H₂ Economy ₹48,79,400 → × •</p>
          <p className="type-spec mt-2">H₂ Economy ₹48,79,400 → × •</p>
        </div>
      </Section>

      <Section title="Spacing (base 8)">
        <div className="flex flex-col gap-3">
          {Object.entries(tokens.space).map(([n, px]) => (
            <div key={n} className="flex items-center gap-4">
              <span className="type-spec w-24 text-secondary">{n}</span>
              <span className="h-4 rounded-control bg-accent" style={{ width: v(n) }} />
              <span className="type-spec text-secondary">{px}px</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-6">
          {Object.entries(tokens.radius).map(([n, px]) => (
            <div key={n} className="text-center">
              <div className="size-24 border-2 border-focus bg-mint" style={{ borderRadius: v(n) }} />
              <p className="type-spec mt-2 text-secondary">
                {n} · {px >= 999 ? "pill" : `${px}px`}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="flex flex-wrap gap-8 bg-subtle p-8">
          {Object.keys(tokens.shadow).map((n) => (
            <div key={n} className="flex h-28 w-48 items-end rounded-card bg-page p-4" style={{ boxShadow: v(n) }}>
              <span className="type-spec text-secondary">{n}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Controls and motion">
        <div className="flex flex-wrap items-end gap-4">
          {Object.entries(tokens.size).map(([n, px]) => (
            <div
              key={n}
              className="rounded-control border border-control px-4 type-spec flex items-center"
              style={{ height: v(n) }}
            >
              {n} · {px}px
            </div>
          ))}
        </div>
        <ul className="type-spec mt-6 grid grid-cols-1 gap-1 text-secondary md:grid-cols-2">
          {Object.entries(tokens.motion).map(([n, val]) => (
            <li key={n}>
              {n}: {typeof val === "number" ? (n.includes("duration") ? `${val}ms` : `${val}px`) : val}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
