// Read-only Figma Plugin API script that exports the design tokens in the shape of
// packages/ui/tokens.json. It changes nothing in the file.
//
// Run it through the Figma MCP `use_figma` tool on file swxSe4zWyngLYdZ2Qe9CWJ
// (load the figma-use skill first), save the returned JSON as
// packages/ui/tokens.figma.json, then run `pnpm tokens:diff`.
// See docs/design-tokens.md.

const round = (n) => Math.round(n * 100) / 100;
const hex = (c) =>
  "#" +
  [c.r, c.g, c.b, ...(c.a !== undefined && c.a < 1 ? [c.a] : [])]
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const hex8 = (c) =>
  "#" +
  [c.r, c.g, c.b, c.a]
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const weights = {
  Regular: 400,
  Medium: 500,
  "Semi Bold": 600,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  "Extra Bold": 800,
};

const collections = [];
for (const c of await figma.variables.getLocalVariableCollectionsAsync()) {
  const variables = [];
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    const raw = v.valuesByMode[c.defaultModeId];
    const entry = { name: v.name, type: v.resolvedType };
    if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS") {
      entry.alias = (await figma.variables.getVariableByIdAsync(raw.id)).name;
    } else if (raw && typeof raw === "object" && "r" in raw) {
      entry.value = hex(raw);
    } else {
      entry.value = raw;
    }
    entry.scopes = v.scopes;
    entry.codeSyntax = v.codeSyntax.WEB ?? "";
    variables.push(entry);
  }
  collections.push({ name: c.name, modes: c.modes.map((m) => m.name), variables });
}

// Aliased variables carry the code syntax of the primitive they point to.
const primitiveSyntax = new Map(collections.flatMap((c) => c.variables.map((v) => [v.name, v.codeSyntax])));
for (const c of collections)
  for (const v of c.variables) if (v.alias && !v.codeSyntax) v.codeSyntax = primitiveSyntax.get(v.alias) ?? "";

const textStyles = (await figma.getLocalTextStylesAsync()).map((s) => ({
  name: s.name,
  fontFamily: s.fontName.family,
  fontStyle: s.fontName.style,
  fontWeight: weights[s.fontName.style],
  fontSize: s.fontSize,
  lineHeight:
    s.lineHeight.unit === "AUTO" ? { unit: "AUTO" } : { unit: s.lineHeight.unit, value: round(s.lineHeight.value) },
  letterSpacing: { unit: s.letterSpacing.unit, value: round(s.letterSpacing.value) },
  textCase: s.textCase,
  description: s.description,
}));

const effectStyles = (await figma.getLocalEffectStylesAsync()).map((s) => ({
  name: s.name,
  description: s.description,
  effects: s.effects.map((e) =>
    e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW"
      ? { type: e.type, color: hex8(e.color), x: e.offset.x, y: e.offset.y, blur: e.radius, spread: e.spread }
      : { type: e.type, blur: e.radius },
  ),
}));

return { collections, textStyles, effectStyles };
