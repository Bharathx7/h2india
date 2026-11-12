import { createDb, schema, type DbHandle } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestEnv } from "../testing/factory";
import { findGrievance, moveGrievance, raiseGrievance } from "./grievances";
import { checkGrievance, grievanceSteps, normaliseTicket } from "./rules";

// Step 5.8 DONE WHEN: a grievance gets a GRV reference and its two clocks (acknowledge in 24 hours, resolve in 15
// days); the status lookup needs the ticket and the email together and reveals nothing else.
const url = process.env.TEST_DATABASE_URL;

const complaint = (email: string, over: Record<string, string> = {}) => ({
  type: "Listing",
  pageUrl: "https://h2india.example/marketplace/type-iv-cylinder",
  description: "The listing shows a PESO certificate that expired in March; please check it.",
  name: "Suresh Natarajan",
  email,
  mobile: "",
  ...over,
});

describe("grievance rules", () => {
  it("checks the form with the drawn messages", () => {
    const bad = checkGrievance({ type: "", pageUrl: "x", description: "short", name: "", email: "no", mobile: "1" });
    expect(bad.ok ? null : bad.errors).toEqual({
      type: "Choose the type of complaint",
      pageUrl: "Paste the link, starting with https://",
      description: "Tell us what happened in a few sentences",
      name: "Enter your full name",
      email: "Enter an email, like you@example.com",
      mobile: "Enter a 10-digit Indian mobile number",
    });
    // Other doesn't need a page link.
    expect(checkGrievance(complaint("a@example.com", { type: "Other", pageUrl: "" })).ok).toBe(true);
    expect(normaliseTicket(" grv-2026-00318 ")).toBe("GRV-2026-00318");
    expect(normaliseTicket("GRV-26-1")).toBeNull();
  });
});

describe.skipIf(!url)("grievances", () => {
  let h: DbHandle;
  const now = new Date("2026-11-10T16:10:00Z");

  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("files a complaint with a GRV reference and starts both clocks", async () => {
    const r = await raiseGrievance(h.db, complaint("suresh@example.com"), { now });
    if (!r.ok) throw new Error("not raised");
    expect(r.grievance.reference).toMatch(/^GRV-2026-\d{5}$/);
    expect(r.grievance.resolveBy.toISOString()).toBe("2026-11-25T16:10:00.000Z");
    const deadlines = await h.db
      .select()
      .from(schema.deadlines)
      .where(and(eq(schema.deadlines.subjectType, "grievance"), eq(schema.deadlines.subjectId, r.grievance.id)));
    expect(Object.fromEntries(deadlines.map((d) => [d.type, d.dueAt.toISOString()]))).toEqual({
      grievanceAcknowledge: "2026-11-11T16:10:00.000Z",
      grievanceResolve: "2026-11-25T16:10:00.000Z",
    });
  });

  it("shows the status only for the right ticket and email together", async () => {
    const r = await raiseGrievance(h.db, complaint("meera@example.com"), { now });
    if (!r.ok) throw new Error("not raised");
    const ref = r.grievance.reference;
    expect(await findGrievance(h.db, ref, "someone-else@example.com")).toBeNull();
    expect(await findGrievance(h.db, "GRV-2026-99999", "meera@example.com")).toBeNull();
    const found = await findGrievance(h.db, ref.toLowerCase(), "MEERA@example.com");
    expect(found).toMatchObject({ reference: ref, status: "Received", type: "Listing" });
    // Nothing personal comes back: no name, email, description or link.
    expect(Object.keys(found ?? {})).not.toEqual(expect.arrayContaining(["email", "name", "description"]));
  });

  it("moves through the steps and closes the clocks", async () => {
    const r = await raiseGrievance(h.db, complaint("rohit@example.com"), { now });
    if (!r.ok) throw new Error("not raised");
    const actor = (await h.db.select({ id: schema.users.id }).from(schema.users).limit(1))[0]?.id ?? null;
    if (!actor) return;
    const id = r.grievance.id;
    await moveGrievance(h.db, { id, to: "Acknowledged", actorId: actor, now });
    await moveGrievance(h.db, {
      id,
      to: "In review",
      actorId: actor,
      publicNote: "We've asked the supplier for documents",
    });
    await expect(moveGrievance(h.db, { id, to: "Resolved", actorId: actor })).rejects.toThrow("outcome");
    const g = await findGrievance(h.db, r.grievance.reference, "rohit@example.com");
    expect(g && grievanceSteps(g).map((s) => `${s.label}:${s.state}`)).toEqual([
      "Received:done",
      "Acknowledged:done",
      "In review:current",
      "Resolved:next",
    ]);
    const open = await h.db
      .select()
      .from(schema.deadlines)
      .where(and(eq(schema.deadlines.subjectId, id), eq(schema.deadlines.type, "grievanceAcknowledge")));
    expect(open[0]?.status).toBe("Done");
  });
});
