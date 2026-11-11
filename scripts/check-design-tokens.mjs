#!/usr/bin/env node
// Fails when code uses a colour that is not a Figma token (playbook step 2.1).
// Run by `pnpm lint`. Generated token files and the Figma export are the only places a hex value may appear.
//
// Catches:  hex colours (#1b2126), rgb()/hsl()/oklch() literals, Tailwind arbitrary colours (bg-[#fff]),
//           and Tailwind default-palette classes (bg-red-500, text-white) that the theme no longer provides.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN = ["apps", "packages"];
const EXT = /\.(tsx?|jsx?|mjs|css)$/;
const SKIP_DIR = new Set(["node_modules", ".next", "dist", "build", "coverage", ".turbo"]);
const ALLOW = [
  "packages/ui/src/styles/tokens.css", // generated
  "packages/ui/src/tokens.ts", // generated
  "packages/ui/scripts/", // the token tools themselves
  "packages/emails/", // email clients need literal colours; checked against tokens in step 3.9
];

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTIL =
  "bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow";
const RULES = [
  { name: "hex colour", re: /(?<![\w&/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![-\w])/g },
  { name: "colour function", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(\s*[\d.]/g },
  { name: "arbitrary colour class", re: new RegExp(String.raw`\b(?:${UTIL})-\[(?:#|rgb|hsl|oklch|color:)`, "g") },
  {
    name: "Tailwind palette class",
    re: new RegExp(String.raw`\b(?:${UTIL})-(?:(?:${PALETTE})-\d{2,3}|white|black)\b`, "g"),
  },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXT.test(entry)) yield path;
  }
}

const problems = [];
for (const top of SCAN) {
  for (const file of walk(join(ROOT, top))) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (ALLOW.some((a) => rel === a || (a.endsWith("/") && rel.startsWith(a)))) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("design-tokens-ignore")) return;
      for (const rule of RULES) {
        for (const m of line.matchAll(rule.re)) problems.push(`${rel}:${i + 1}  ${rule.name}: ${m[0]}`);
      }
    });
  }
}

if (problems.length > 0) {
  console.error(`Colours must come from the Figma tokens (packages/ui/tokens.json):\n${problems.join("\n")}`);
  console.error("\nUse a token class (text-primary, bg-accent, border-default ...). See docs/design-tokens.md.");
  process.exit(1);
}
console.log("design tokens: no off-palette colours");
