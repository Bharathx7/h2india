import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { consentHistory } from "../consent/records";
import { notify } from "../notify/notify";
import { setChoices } from "../notify/preferences";
import { makeUser, useTestEnv } from "../testing/factory";
import { exportCsv, exportMemberData, ProfileError, saveProfile } from "./account";
import { createAlert } from "./alerts";
import { listedMember, listedMembers } from "./directory";
import { saveMemberPreferences, unsubscribeEverything } from "./preferences";
import { follow } from "./profile";
import { saveItem } from "./saved";

// Step 7.4 DONE WHEN: turning off WhatsApp stops WhatsApp messages immediately; a member not opted in never appears in
// the people directory; Download my data returns only the member's own records.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("member profile, preferences and data", () => {
  let h: DbHandle;
  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  const profile = (listed: boolean) => ({
    name: "Rohan Mehta",
    persona: "researcher",
    interests: ["electrolysers", "nonsense"],
    listed,
    fields: { headline: "Research scientist", location: "Vadodara, Gujarat", affiliation: "Indus Institute" },
  });

  it("lists a member only after they turn on Public profile", async () => {
    const u = await makeUser(h.db, "Rohan");
    await expect(saveProfile(h.db, u.id, { ...profile(true), fields: { headline: "x" } })).rejects.toBeInstanceOf(
      ProfileError,
    );
    await saveProfile(h.db, u.id, profile(false));
    expect((await listedMembers(h.db)).some((m) => m.userId === u.id)).toBe(false);
    expect(await listedMember(h.db, `m-${u.id}`)).toBeNull();
    await saveProfile(h.db, u.id, profile(true));
    const m = await listedMember(h.db, `m-${u.id}`);
    expect(m).toMatchObject({ name: "Rohan Mehta", organisation: "Indus Institute", interests: ["Electrolysers"] });
    expect(JSON.stringify(m)).not.toContain("@");
    await saveProfile(h.db, u.id, profile(false));
    expect((await listedMembers(h.db)).some((x) => x.userId === u.id)).toBe(false);
    const changes = await h.db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.resourceId, u.id), eq(schema.auditLog.resourceType, "member_profile")));
    expect(changes.map((c) => c.action).sort()).toEqual(["member.listed", "member.unlisted"]);
  });

  it("records each consent choice with its words and version (step 12.2)", async () => {
    const u = await makeUser(h.db, "Consent");
    await saveProfile(h.db, u.id, profile(true));
    await saveProfile(h.db, u.id, profile(true)); // no change, no new record
    await saveProfile(h.db, u.id, profile(false));
    await setChoices(h.db, u.id, [
      { topic: "alert.matches", channel: "whatsapp", enabled: false },
      { topic: "alert.matches", channel: "email", enabled: true }, // already on by default: not a change
    ]);
    const history = await consentHistory(h.db, u.id);
    expect(history.map((c) => [c.purpose, c.granted]).reverse()).toEqual([
      ["member-directory", true],
      ["member-directory", false],
      ["marketing:alert.matches:whatsapp", false],
    ]);
    expect(history.every((c) => c.version && c.wording)).toBe(true);
    expect(history.find((c) => c.purpose === "member-directory")?.wording).toContain("research details");
    expect((await exportMemberData(h.db, u.id)).consents).toHaveLength(3);
  });

  it("turning off WhatsApp stops the next WhatsApp message", async () => {
    const u = await makeUser(h.db, "Asha");
    await h.db
      .update(schema.users)
      .set({ mobile: "+919812332109", mobileVerifiedAt: new Date() })
      .where(eq(schema.users.id, u.id));
    const send = () =>
      notify({
        event: "alert.matches",
        topic: "alert.matches",
        userId: u.id,
        whatsapp: { template: "whatsapp.webinar_reminder", data: { name: "Asha", title: "Test", time: "4:00 PM" } },
      });
    expect((await send()).whatsapp).toBe("Sent");
    await saveMemberPreferences(h.db, u.id, {
      newsletter: { weekly: false, tenderDigest: false },
      choices: [{ topic: "alert.matches", channel: "whatsapp", enabled: false }],
      quiet: { quietHours: false, quietFrom: "22:00", quietTo: "07:00" },
    });
    expect((await send()).whatsapp).toBe("Skipped");
    // Unsubscribing from everything stops WhatsApp for every topic too.
    const v = await makeUser(h.db, "Bala");
    await h.db
      .update(schema.users)
      .set({ mobile: "+919812300000", mobileVerifiedAt: new Date() })
      .where(eq(schema.users.id, v.id));
    await unsubscribeEverything(h.db, v.id, true);
    const out = await notify({
      event: "event.reminder",
      topic: "event.reminders",
      userId: v.id,
      whatsapp: { template: "whatsapp.webinar_reminder", data: { name: "Bala", title: "Test", time: "4:00 PM" } },
    });
    expect(out.whatsapp).toBe("Skipped");
  });

  it("the newsletter switch uses the account email without a second confirmation", async () => {
    const u = await makeUser(h.db, "Chitra");
    const prefs = (weekly: boolean) => ({
      newsletter: { weekly, tenderDigest: weekly },
      choices: [],
      quiet: { quietHours: false, quietFrom: "22:00", quietTo: "07:00" },
    });
    await saveMemberPreferences(h.db, u.id, prefs(true));
    const [row] = await h.db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, u.email));
    expect(row).toMatchObject({ status: "confirmed", tenderDigest: true, source: "preferences" });
    await saveMemberPreferences(h.db, u.id, prefs(false));
    const [after] = await h.db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, u.email));
    expect(after?.status).toBe("unsubscribed");
  });

  it("Download my data holds only the member's own records", async () => {
    const a = await makeUser(h.db, "Dev");
    const b = await makeUser(h.db, "Esha");
    for (const [u, word] of [
      [a, "alpha"],
      [b, "bravo"],
    ] as const) {
      await follow(h.db, u.id, { targetType: "topic", targetId: `t-${word}`, label: `Topic ${word}` });
      await saveItem(h.db, u.id, { targetType: "tender", targetId: word, title: `Tender ${word}`, href: `/x/${word}` });
      await createAlert(h.db, u.id, { label: `Alert ${word}`, indexUid: "tenders", query: word });
    }
    const data = await exportMemberData(h.db, a.id);
    const text = JSON.stringify(data) + exportCsv(data);
    expect(text).toContain("alpha");
    expect(text).not.toContain("bravo");
    expect(text).not.toContain(b.email);
    expect(data.account.email).toBe(a.email);
    expect(exportCsv(data).split("\n")[0]).toBe("section,item,details");
  });
});
