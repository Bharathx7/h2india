import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type DbHandle } from "@h2india/db";
import { useTestEnv } from "./testing/factory";
import { checkForm, FORM_LIMITS, looksAutomated } from "./protect";

// Step 5.9 DONE WHEN: 50 rapid posts to a public form are blocked; the honeypot and timing stop simple bots.
const url = process.env.TEST_DATABASE_URL;

describe("form guard", () => {
  it("flags a filled honeypot, a missing guard and a form sent too fast", () => {
    expect(looksAutomated(undefined)).toBe(true);
    expect(looksAutomated({ website: "http://spam.example", elapsedMs: 9000 })).toBe(true);
    expect(looksAutomated({ website: "", elapsedMs: 120 })).toBe(true);
    expect(looksAutomated({ website: "", elapsedMs: 4000 })).toBe(false);
  });
});

describe.skipIf(!url)("public form limits", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 2 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("lets a burst of 5 through, then blocks the rest of 50 rapid posts", async () => {
    const ip = `198.51.100.${String(Math.floor(Math.random() * 250))}-${String(Date.now())}`;
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(await checkForm({ form: "contact", ip, guard: { website: "", elapsedMs: 5000 } }));
    }
    expect(results.filter((r) => r.ok)).toHaveLength(FORM_LIMITS.burst.max);
    expect(results.slice(FORM_LIMITS.burst.max).every((r) => !r.ok && r.reason === "limited")).toBe(true);
    // Another form from the same address has its own counter.
    expect(await checkForm({ form: "grievance", ip, guard: { website: "", elapsedMs: 5000 } })).toEqual({ ok: true });
  });

  it("refuses bots without telling them which layer caught them", async () => {
    const ip = `203.0.113.${String(Date.now())}`;
    expect(await checkForm({ form: "contact", ip, guard: { website: "x", elapsedMs: 5000 } })).toEqual({
      ok: false,
      reason: "bot",
    });
  });
});
