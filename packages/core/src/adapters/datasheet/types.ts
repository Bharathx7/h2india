// The datasheet reader (step 8.4, playbook types). The engine (M8) returns, per attribute in the category's schema, the
// value it read with a score; H2 Economy turns the score into High, Medium or Low with thresholds from settings.

export interface ExtractedField {
  /** From the category's attribute schema (step 6.1), or name / model for the product itself. */
  attributeKey: string;
  value: string | number | { min: number; max: number } | null;
  unit?: string;
  /** 0 to 1, the engine's own measure. */
  score: number;
  sourcePage?: number;
  /** Shown beside the field so the supplier can check it. */
  sourceText?: string;
}

export interface DatasheetReader {
  extract(input: {
    fileId: string;
    categoryId: string;
    attributes: { key: string; label: string; type: string; unit: string | null }[];
  }): Promise<{ engine: string; version: string; region: string; fields: ExtractedField[] }>;
}
