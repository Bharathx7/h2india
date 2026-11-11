import { createDb, type DbHandle } from "@h2india/db";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearThrottle, hitThrottle, pruneThrottle, readThrottle, startThrottle } from "./throttle";

// Step 3.2: the per-email sign-in counters against a real PostgreSQL (TEST_DATABASE_URL).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("sign-in counters", () => {
  let h: DbHandle;
  beforeAll(() => {
    h = createDb(url ?? "", { max: 20 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("counts every hit exactly once, even all at once", async () => {
    const key = `t:parallel:${String(Date.now())}`;
    const results = await Promise.all(Array.from({ length: 40 }, () => hitThrottle(h.db, key, 60)));
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(new Set(results.map((r) => r.expiresAt.getTime())).size).toBe(1);
  });

  it("starts again at 1 once the window has ended", async () => {
    const key = `t:window:${String(Date.now())}`;
    await hitThrottle(h.db, key, 60);
    await hitThrottle(h.db, key, 60);
    await h.db.execute(
      sql`UPDATE core.sign_in_throttle SET expires_at = now() - interval '1 second' WHERE key = ${key}`,
    );
    expect(await readThrottle(h.db, key)).toBeNull();
    const again = await hitThrottle(h.db, key, 60);
    expect(again.count).toBe(1);
    expect(again.expiresAt.getTime()).toBeGreaterThan(Date.now() + 50_000);
  });

  it("starts, reads and clears a pause", async () => {
    const key = `t:pause:${String(Date.now())}`;
    const pause = await startThrottle(h.db, key, 15 * 60);
    const read = await readThrottle(h.db, key);
    expect(read?.expiresAt.getTime()).toBe(pause.expiresAt.getTime());
    await clearThrottle(h.db, key);
    expect(await readThrottle(h.db, key)).toBeNull();
  });

  it("prunes only counters that ended more than a day ago", async () => {
    const old = `t:old:${String(Date.now())}`;
    const fresh = `t:fresh:${String(Date.now())}`;
    await hitThrottle(h.db, old, 60);
    await hitThrottle(h.db, fresh, 60);
    await h.db.execute(sql`UPDATE core.sign_in_throttle SET expires_at = now() - interval '2 days' WHERE key = ${old}`);
    expect(await pruneThrottle(h.db)).toBeGreaterThanOrEqual(1);
    const left = await h.db.execute(sql`SELECT key FROM core.sign_in_throttle WHERE key IN (${old}, ${fresh})`);
    expect(left.rows.map((r) => r.key)).toEqual([fresh]);
  });
});
