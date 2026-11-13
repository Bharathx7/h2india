import { describe, expect, it } from "vitest";
import { Authors } from "../../cms/collections/Authors";
import { Media } from "../../cms/collections/Media";
import { Tags, Topics } from "../../cms/collections/Taxonomy";
import { Events, Grants, Jobs, Schemes, Tenders } from "../../cms/records/collections";
import { describeFields, type FieldSpec } from "./fields";

// Every record type the native editor opens is drawn completely: each field it shows has a control.
const count = (list: FieldSpec[]): { all: number; unsupported: string[] } =>
  list.reduce(
    (acc, f) => {
      const inner = f.fields ? count(f.fields) : { all: 0, unsupported: [] };
      return {
        all: acc.all + 1 + inner.all,
        unsupported: [...acc.unsupported, ...(f.kind === "unsupported" ? [f.name] : []), ...inner.unsupported],
      };
    },
    { all: 0, unsupported: [] as string[] },
  );

describe("content types in the native editor", () => {
  it.each([Schemes, Tenders, Grants, Jobs, Events, Authors, Topics, Tags, Media])(
    "$slug has a control for every field",
    (c) => {
      const specs = describeFields(c.fields);
      const r = count(specs);
      expect(r.all).toBeGreaterThan(0);
      expect(r.unsupported).toEqual([]);
      expect(specs.some((s) => s.kind === "text" || s.kind === "textarea")).toBe(true);
    },
  );
});
