import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { launchBlockers } from "./decisions";

const TABLE = `
| ID | Question | Owner | Blocks | Safe default until answered | Status | Answer and date |
|---|---|---|---|---|---|---|
| A1 | Legal texts | You | Launch 1 | Placeholders | Open |  |
| A2 | Payment keys | You | Gate 3 | Simulated partner | Open |  |
| A3 | Card colour | You | Step 6.2 | As drawn | Open |  |
| A4 | Hero words | You | Step 5.1 | As drawn; must answer before launch | Open |  |
| A5 | Domain | You | Before Launch 1 | Staging domain | Answered | 1 Nov |
`;

describe("launch blockers (step 13.4)", () => {
  it("counts open decisions that name the launch, its gate or say must answer", () => {
    expect(launchBlockers(TABLE, 1).map((b) => b.id)).toEqual(["A1", "A4"]);
    expect(launchBlockers(TABLE, 2).map((b) => b.id)).toEqual(["A1", "A2", "A4"]);
  });

  it("reads the real decisions file", () => {
    const md = readFileSync(new URL("../../../../docs/decisions.md", import.meta.url), "utf8");
    const blockers = launchBlockers(md, 1);
    expect(blockers.every((b) => /^[A-Z]+\d+$/.test(b.id))).toBe(true);
  });
});
