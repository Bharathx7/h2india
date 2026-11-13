import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeUser, useTestEnv } from "../testing/factory";
import { createAlert, listAlerts } from "./alerts";
import {
  completeOnboarding,
  follow,
  followingIds,
  listFollows,
  memberProfile,
  needsOnboarding,
  savePersona,
  saveTopicsAndStates,
  unfollow,
} from "./profile";
import { suggestAlerts } from "./rules";

// Step 7.1 DONE WHEN: a new member completes onboarding and their choices are stored (and drive the feed, 7.2);
// skipping leaves a usable member with nothing followed.
const url = process.env.TEST_DATABASE_URL;

describe("suggested alerts", () => {
  it("follows the persona and topics", () => {
    expect(suggestAlerts("researcher", ["electrolysers", "green-ammonia"]).map((a) => [a.key, a.on])).toEqual([
      ["grants", true],
      ["news", false],
    ]);
    expect(suggestAlerts("enthusiast", ["electrolysers", "green-ammonia"]).find((a) => a.key === "news")?.label).toBe(
      "News · Electrolysers and Green ammonia",
    );
    expect(suggestAlerts(null, []).length).toBe(0);
  });
});

describe.skipIf(!url)("member onboarding and follows", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("stores persona, topics and states, follows them, and isn't offered again", async () => {
    const u = await makeUser(h.db, "Rohan");
    expect(await needsOnboarding(h.db, u.id)).toBe(true);
    await savePersona(h.db, u.id, "researcher");
    await saveTopicsAndStates(h.db, u.id, ["electrolysers", "made-up"], ["Gujarat", "Atlantis"]);
    expect(await memberProfile(h.db, u.id)).toMatchObject({
      persona: "researcher",
      topics: ["electrolysers"],
      states: ["Gujarat"],
    });
    expect((await listFollows(h.db, u.id)).map((f) => `${f.targetType}:${f.targetId}`).sort()).toEqual([
      "state:Gujarat",
      "topic:electrolysers",
    ]);
    // Changing step 2 replaces the topic and state follows, but keeps companies.
    await follow(h.db, u.id, { targetType: "company", targetId: "c1", label: "Hydrotek" });
    await saveTopicsAndStates(h.db, u.id, ["tenders"], []);
    expect((await listFollows(h.db, u.id)).map((f) => `${f.targetType}:${f.targetId}`).sort()).toEqual([
      "company:c1",
      "topic:tenders",
    ]);
    expect(await followingIds(h.db, u.id, "company", ["c1", "c2"])).toEqual(new Set(["c1"]));
    await unfollow(h.db, u.id, "company", "c1");
    await createAlert(h.db, u.id, { label: "New hydrogen tenders", indexUid: "tenders", frequency: "daily" });
    expect((await listAlerts(h.db, u.id)).map((a) => [a.label, a.frequency, a.channels])).toEqual([
      ["New hydrogen tenders", "daily", ["email"]],
    ]);
    await completeOnboarding(h.db, u.id);
    expect(await needsOnboarding(h.db, u.id)).toBe(false);
  });

  it("skipping marks onboarding done with nothing followed", async () => {
    const u = await makeUser(h.db, "Skipper");
    await completeOnboarding(h.db, u.id);
    expect(await needsOnboarding(h.db, u.id)).toBe(false);
    expect(await h.db.select().from(schema.follows).where(eq(schema.follows.userId, u.id))).toEqual([]);
  });
});
