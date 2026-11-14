import { createDb, schema, type DbHandle } from "@h2india/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { makeUser, useTestEnv } from "../testing/factory";
import {
  addReadingTime,
  cancelRegistration,
  courseSummary,
  finishChapter,
  learningProgress,
  listApplications,
  MAX_REPORT_SECONDS,
  myRegistrations,
  recordApplication,
  recordQuizAnswer,
  setApplicationStatus,
  startChapter,
} from "./learning";

// Step 7.5 DONE WHEN: reading to the end of a chapter updates progress (both pages read learningProgress); a webinar
// registration appears in Event registrations immediately; job applications are the member's own.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("Hydrogen 101, registrations and applications", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("records chapter progress, time and the first quiz answers", async () => {
    const u = await makeUser(h.db, "Rohan");
    await startChapter(h.db, u.id, "1");
    await addReadingTime(h.db, u.id, "1", 120);
    await addReadingTime(h.db, u.id, "1", 99_999);
    await recordQuizAnswer(h.db, u.id, "1", 0, true);
    await recordQuizAnswer(h.db, u.id, "1", 0, false);
    await recordQuizAnswer(h.db, u.id, "1", 1, false);
    let rows = await learningProgress(h.db, u.id);
    expect(rows[0]).toMatchObject({
      status: "in_progress",
      secondsSpent: 120 + MAX_REPORT_SECONDS,
      quiz: { "0": true, "1": false },
    });
    await finishChapter(h.db, u.id, "1");
    await finishChapter(h.db, u.id, "1");
    await startChapter(h.db, u.id, "2");
    rows = await learningProgress(h.db, u.id);
    expect(courseSummary(rows, ["1", "2", "3"])).toMatchObject({ done: 1, total: 3, minutes: 7, quizAverage: 50 });
    expect(rows.find((r) => r.chapterId === "1")?.status).toBe("done");
  });

  it("shows a webinar registration at once, and only the member can cancel it", async () => {
    const u = await makeUser(h.db, "Asha");
    const other = await makeUser(h.db, "Bala");
    const [mine] = await h.db
      .insert(schema.webinarRegistrations)
      .values({ eventId: 9001, eventSlug: "pem-sizing", userId: u.id, name: "Asha", email: u.email })
      .returning();
    // Registered signed out with the same email: still theirs.
    await h.db
      .insert(schema.webinarRegistrations)
      .values({ eventId: 9002, eventSlug: "peso", name: "Asha", email: u.email.toUpperCase() });
    expect((await myRegistrations(h.db, u.id)).map((r) => r.eventSlug).sort()).toEqual(["pem-sizing", "peso"]);
    expect(await myRegistrations(h.db, other.id)).toEqual([]);
    expect(await cancelRegistration(h.db, other.id, mine?.id ?? "")).toBe(false);
    expect(await cancelRegistration(h.db, u.id, mine?.id ?? "")).toBe(true);
    expect((await myRegistrations(h.db, u.id)).map((r) => r.eventSlug)).toEqual(["peso"]);
  });

  it("keeps one application per job, with a status only its member can change", async () => {
    const u = await makeUser(h.db, "Chitra");
    const other = await makeUser(h.db, "Dev");
    const job = {
      slug: "commissioning-engineer",
      role: "Commissioning engineer",
      company: "Konkan",
      location: "Ratnagiri",
      closesAt: null,
    };
    await recordApplication(h.db, u.id, job);
    await recordApplication(h.db, u.id, job);
    const [app] = await listApplications(h.db, u.id);
    expect((await listApplications(h.db, u.id)).length).toBe(1);
    expect(app?.status).toBe("Applied");
    await setApplicationStatus(h.db, other.id, app?.id ?? "", "Closed");
    expect((await listApplications(h.db, u.id))[0]?.status).toBe("Applied");
    await setApplicationStatus(h.db, u.id, app?.id ?? "", "Interviewing");
    expect((await listApplications(h.db, u.id))[0]?.status).toBe("Interviewing");
    await expect(setApplicationStatus(h.db, u.id, app?.id ?? "", "Hired?")).rejects.toThrow();
    expect(await listApplications(h.db, other.id)).toEqual([]);
  });
});
