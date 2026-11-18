#!/usr/bin/env node
// Design-token tool for packages/ui (playbook step 2.1).
//
//   node scripts/tokens.mjs build        regenerate src/styles/tokens.css and src/tokens.ts from tokens.json
//   node scripts/tokens.mjs check        fail if the generated files are out of date (run in CI)
//   node scripts/tokens.mjs diff <file>  compare a fresh Figma export with tokens.json; --write adopts it
//
// tokens.json is the Figma export (see scripts/figma-export.js and docs/design-tokens.md).
// Names follow Figma. Values are never adjusted here: if a value looks wrong, raise it
// with the designer and change it in Figma.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "tokens.json");
const CSS_OUT = join(root, "src/styles/tokens.css");
const TS_OUT = join(root, "src/tokens.ts");

const HEADER = "Generated from packages/ui/tokens.json by `pnpm tokens:build`. Do not edit by hand.";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const varFromSyntax = (syntax) => /^var\((--[a-z0-9-]+)\)$/.exec(syntax)?.[1];
const rem = (px) => `${+(px / 16).toFixed(4)}rem`;

// Semantic colour groups map onto Tailwind 4 theme namespaces so the class reads like the Figma name:
// text/primary -> text-primary, bg/accent -> bg-accent, border/focus -> border-focus, icon/link -> text-icon-link.
const SEMANTIC_NAMESPACE = {
  text: "--text-color-",
  bg: "--background-color-",
  border: "--border-color-",
  icon: "--color-icon-",
};

// Text styles become utilities named after the Figma style.
const TYPE_UTILITY = {
  Display: "type-display",
  "Heading/H1": "type-h1",
  "Heading/H2": "type-h2",
  "Heading/H3": "type-h3",
  "Heading/H4": "type-h4",
  "Body/Large": "type-body-lg",
  "Body/Default": "type-body",
  "Body/Small": "type-body-sm",
  "Label/Large": "type-label-lg",
  "Label/Default": "type-label",
  "Label/Small": "type-label-sm",
  "Label/Nav": "type-label-nav",
  Caption: "type-caption",
  "Spec/Default": "type-spec",
  "Spec/Eyebrow": "type-label-sm",
};
const FONT_VAR = { Manrope: "--font-display", Inter: "--font-sans", "IBM Plex Mono": "--font-mono" };

// Shadow names follow the code tokens given in each Figma effect style's description.
const SHADOW_NAME = {
  "Shadow/Soft": "soft",
  "Shadow/Lift": "ink-lift",
  "Shadow/Float small": "ink-float-sm",
  "Shadow/Float": "ink-float",
  "Shadow/Header": "ink-header",
  "Focus/Ring": "focus-ring",
};

function generate(tokens) {
  const byCollection = Object.fromEntries(tokens.collections.map((c) => [c.name, c.variables]));
  const primitives = byCollection.Primitives ?? [];
  const semantic = byCollection.Color ?? [];
  const layout = byCollection.Layout ?? [];

  const primitiveVar = new Map();
  for (const v of primitives) {
    const cssVar = varFromSyntax(v.codeSyntax) ?? `--color-${slug(v.name)}`;
    primitiveVar.set(v.name, cssVar);
  }

  const theme = [];
  const root = [];
  const ts = { color: {}, space: {}, radius: {}, size: {}, motion: {}, shadow: {}, textStyle: {}, cssVar: {} };

  theme.push("  /* Only Figma values exist. Tailwind's default palette, type scale, radii, shadows,");
  theme.push("     easings and fonts are removed, so an off-design value has no class to use. */");
  for (const ns of [
    "color",
    "text",
    "tracking",
    "leading",
    "font-weight",
    "radius",
    "shadow",
    "inset-shadow",
    "drop-shadow",
    "blur",
    "ease",
    "font",
  ]) {
    theme.push(`  --${ns}-*: initial;`);
  }
  theme.push("");
  theme.push(
    "  /* Font weights present in the self-hosted font files (Inter 400-600, Manrope 700-800, Plex Mono 500). */",
  );
  for (const [name, w] of [
    ["normal", 400],
    ["medium", 500],
    ["semibold", 600],
    ["bold", 700],
    ["extrabold", 800],
  ]) {
    theme.push(`  --font-weight-${name}: ${w};`);
  }
  theme.push("");
  theme.push("  /* Primitives (Figma collection Primitives, named by its code syntax) */");
  for (const v of primitives) {
    theme.push(`  ${primitiveVar.get(v.name)}: ${v.value}; /* ${v.name} */`);
    ts.color[v.name] = v.value;
    ts.cssVar[v.name] = primitiveVar.get(v.name);
  }

  theme.push("");
  theme.push("  /* Semantic colours (Figma collection Color) */");
  for (const v of semantic) {
    const [group, ...rest] = v.name.split("/");
    const ns = SEMANTIC_NAMESPACE[group];
    if (!ns) throw new Error(`Unknown colour group "${group}" in ${v.name}: add it to SEMANTIC_NAMESPACE`);
    const target = primitiveVar.get(v.alias);
    if (!target) throw new Error(`${v.name} points at ${v.alias}, which is not a primitive`);
    theme.push(`  ${ns}${slug(rest.join("-"))}: var(${target}); /* ${v.name} */`);
    ts.color[v.name] = ts.color[v.alias];
    ts.cssVar[v.name] = `${ns}${slug(rest.join("-"))}`;
  }

  const layoutByGroup = (prefix) => layout.filter((v) => v.name.startsWith(prefix));

  theme.push("");
  theme.push(
    "  /* Spacing: Figma code syntax is calc(var(--spacing) * n), so p-4 = space/16. Text styles are type-* utilities below. */",
  );
  theme.push("  --spacing: 0.25rem;");
  for (const v of layoutByGroup("space/")) {
    root.push(`  --${slug(v.name)}: ${rem(v.value)}; /* ${v.name} */`);
    ts.space[v.name] = v.value;
    ts.cssVar[v.name] = `--${slug(v.name)}`;
  }

  theme.push("");
  theme.push("  /* Radius (rounded-control, rounded-card, rounded-modal, rounded-feature, rounded-pill) */");
  for (const v of layoutByGroup("radius/")) {
    const value = v.value >= 999 ? "9999px" : `${v.value}px`;
    theme.push(`  --radius-${slug(v.name.slice(7))}: ${value}; /* ${v.name} */`);
    ts.radius[v.name] = v.value;
    ts.cssVar[v.name] = `--radius-${slug(v.name.slice(7))}`;
  }

  for (const v of layoutByGroup("size/")) {
    root.push(`  --${slug(v.name)}: ${v.value}px; /* ${v.name} */`);
    ts.size[v.name] = v.value;
    ts.cssVar[v.name] = `--${slug(v.name)}`;
  }

  theme.push("");
  theme.push("  /* Motion easing (ease-standard, ease-enter, ease-exit) */");
  for (const v of layout.filter((x) => x.name.startsWith("motion/"))) {
    const parts = v.name.split("/");
    if (parts[1] === "easing") theme.push(`  --ease-${slug(parts[2])}: ${v.value}; /* ${v.name} */`);
    else if (parts[1] === "duration") root.push(`  --${slug(v.name)}: ${v.value}ms; /* ${v.name} */`);
    else root.push(`  --${slug(v.name)}: ${v.value}px; /* ${v.name} */`);
    ts.motion[v.name] = v.value;
  }

  theme.push("");
  theme.push("  /* Shadows (Figma effect styles; names are the code tokens in each style's description) */");
  const blurs = [];
  for (const s of tokens.effectStyles) {
    if (s.effects.every((e) => e.type === "BACKGROUND_BLUR")) {
      blurs.push(s);
      continue;
    }
    const name = SHADOW_NAME[s.name] ?? slug(s.name);
    const value = s.effects
      .filter((e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
      .map((e) => `${e.type === "INNER_SHADOW" ? "inset " : ""}${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${e.color}`)
      // Figma's effects array lists the bottom layer first; CSS paints the first shadow on top.
      .reverse();
    theme.push(`  --shadow-${name}: ${value.join(", ")}; /* ${s.name} */`);
    ts.shadow[s.name] = value.join(", ");
    ts.cssVar[s.name] = `--shadow-${name}`;
  }

  theme.push("");
  theme.push("  /* Background blur (backdrop-blur-glass-16, backdrop-blur-glass-20).");
  theme.push("     CSS blur() takes half of Figma's blur radius, as Figma's own CSS export does. */");
  for (const s of blurs) {
    theme.push(`  --blur-${slug(s.name.replace("Blur/", ""))}: ${s.effects[0].blur / 2}px; /* ${s.name} */`);
    ts.cssVar[s.name] = `--blur-${slug(s.name.replace("Blur/", ""))}`;
  }

  theme.push("");
  theme.push("  /* Fonts: the font files are loaded by the app (next/font) and set these three variables. */");
  theme.push("  --font-display: var(--font-manrope), var(--font-inter), ui-sans-serif, system-ui, sans-serif;");
  theme.push("  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;");
  theme.push("  --font-mono: var(--font-plex-mono), ui-monospace, monospace;");

  const utilities = [];
  for (const s of tokens.textStyles) {
    const name = TYPE_UTILITY[s.name];
    if (!name) throw new Error(`Text style "${s.name}" has no utility name: add it to TYPE_UTILITY`);
    const lh =
      s.lineHeight.unit === "PIXELS"
        ? rem(s.lineHeight.value)
        : s.lineHeight.unit === "PERCENT"
          ? `${+(s.lineHeight.value / 100).toFixed(4)}`
          : "normal";
    const ls =
      s.letterSpacing.unit === "PERCENT"
        ? `${+(s.letterSpacing.value / 100).toFixed(4)}em`
        : `${s.letterSpacing.value}px`;
    const lines = [
      `  font-family: var(${FONT_VAR[s.fontFamily] ?? "--font-sans"});`,
      `  font-weight: ${s.fontWeight};`,
      `  font-size: ${rem(s.fontSize)};`,
      `  line-height: ${lh};`,
      `  letter-spacing: ${s.letterSpacing.value === 0 ? "0" : ls};`,
    ];
    if (s.textCase === "UPPER") lines.push("  text-transform: uppercase;");
    utilities.push(`/* ${s.name} · ${s.fontFamily} ${s.fontWeight} · ${s.fontSize}. ${s.description} */`);
    utilities.push(`@utility ${name} {\n${lines.join("\n")}\n}`);
    ts.textStyle[s.name] = name;
  }

  const css = `/* ${HEADER} */

@theme {
${theme.join("\n")}
}

:root {
${root.join("\n")}
}

${utilities.join("\n")}
`;

  const tsOut = `// ${HEADER}

export const tokens = ${JSON.stringify(ts, null, 2)} as const;

export type ColorToken = keyof typeof tokens.color;
export type TextStyle = keyof typeof tokens.textStyle;
`;
  return { css, ts: tsOut };
}

function diff(current, next) {
  const flatten = (t) => {
    const out = new Map();
    for (const c of t.collections)
      for (const v of c.variables) out.set(`${c.name} · ${v.name}`, JSON.stringify(v.alias ?? v.value));
    for (const s of t.textStyles) out.set(`Text · ${s.name}`, JSON.stringify(s));
    for (const s of t.effectStyles) out.set(`Effect · ${s.name}`, JSON.stringify(s.effects));
    return out;
  };
  const a = flatten(current);
  const b = flatten(next);
  const lines = [];
  for (const [k, v] of b) if (!a.has(k)) lines.push(`+ ${k}: ${v}`);
  for (const [k, v] of a) if (!b.has(k)) lines.push(`- ${k}: ${v}`);
  for (const [k, v] of b) if (a.has(k) && a.get(k) !== v) lines.push(`~ ${k}: ${a.get(k)} -> ${v}`);
  return lines;
}

const [command, file, flag] = process.argv.slice(2);
const tokens = readJson(SOURCE);

if (command === "build") {
  const out = generate(tokens);
  writeFileSync(CSS_OUT, out.css);
  writeFileSync(TS_OUT, out.ts);
  const vars = tokens.collections.reduce((n, c) => n + c.variables.length, 0);
  console.log(
    `tokens: ${vars} variables, ${tokens.textStyles.length} text styles, ${tokens.effectStyles.length} effects`,
  );
} else if (command === "check") {
  const out = generate(tokens);
  const stale = [
    [CSS_OUT, out.css],
    [TS_OUT, out.ts],
  ].filter(([p, content]) => readFileSync(p, "utf8") !== content);
  if (stale.length > 0) {
    console.error(
      `Generated token files are out of date. Run: pnpm tokens:build\n${stale.map(([p]) => `  ${p}`).join("\n")}`,
    );
    process.exit(1);
  }
  console.log("tokens: generated files are up to date");
} else if (command === "diff") {
  if (!file) {
    console.error("Usage: node scripts/tokens.mjs diff <figma-export.json> [--write]");
    process.exit(2);
  }
  const fresh = readJson(file);
  const lines = diff(tokens, fresh);
  console.log(lines.length === 0 ? "tokens: Figma and tokens.json match" : lines.join("\n"));
  if (flag === "--write" && lines.length > 0) {
    writeFileSync(
      SOURCE,
      `${JSON.stringify({ ...tokens, ...fresh, $exportedAt: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
    );
    console.log("tokens.json updated. Now run: pnpm tokens:build");
  }
} else {
  console.error("Usage: node scripts/tokens.mjs <build|check|diff>");
  process.exit(2);
}
