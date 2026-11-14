import type { DatasheetReader, ExtractedField } from "./types";

// The fake engine (M8 not chosen): fixed, predictable results so the review screen, the rules and the tests work
// without a provider. Every third field reads with medium confidence and every fifth with low; text fields are left
// out (as "not in the datasheet"). Never used in production once M8 is answered.

const SCORES = [0.97, 0.95, 0.7, 0.96, 0.4];

export const fakeDatasheetReader: DatasheetReader = {
  extract: ({ attributes }) => {
    const fields: ExtractedField[] = [
      {
        attributeKey: "name",
        value: "Product from datasheet",
        score: 0.97,
        sourcePage: 1,
        sourceText: "Product from datasheet",
      },
    ];
    attributes.forEach((a, i) => {
      if (a.type === "text") return;
      const score = SCORES[i % SCORES.length] ?? 0.9;
      const value =
        a.type === "number"
          ? 100 + i
          : a.type === "range"
            ? { min: 10 + i, max: 20 + i }
            : a.type === "boolean"
              ? "yes"
              : null;
      if (value === null) return;
      fields.push({
        attributeKey: a.key,
        value,
        unit: a.unit ?? undefined,
        score,
        sourcePage: 1 + (i % 3),
        sourceText:
          `${a.label}  ${typeof value === "object" ? `${String(value.min)}–${String(value.max)}` : String(value)} ${a.unit ?? ""}`.trim(),
      });
    });
    return Promise.resolve({ engine: "fake", version: "1", region: "local", fields });
  },
};
