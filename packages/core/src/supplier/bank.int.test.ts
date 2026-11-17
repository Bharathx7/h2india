import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { scopeFor } from "../authz/scope";
import { runDeadlines } from "../clocks/clocks";
import { recordStepUp } from "../sign-in/step-up";
import { makeCompany, makeUser, useTestEnv } from "../testing/factory";
import {
  addBankAccount,
  bankState,
  BankError,
  cancelBankChange,
  confirmBankAccount,
  openAccount,
  payoutsHeld,
} from "./bank";

// Step 8.6 DONE WHEN: a change without a fresh confirmation code is refused; every supplier admin gets the notice; the hold end time
// is shown and enforced; full account numbers never appear in logs or the audit log. Needs TEST_DATABASE_URL; Mailpit.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("payout bank account", () => {
  let h: DbHandle;
  let a: Awaited<ReturnType<typeof makeCompany>>;
  beforeAll(async () => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
    a = await makeCompany(h.db, "Pranava H2", "supplier");
    await h.db
      .update(schema.organisations)
      .set({ legalName: "Pranava H2 Private Limited" })
      .where(eq(schema.organisations.id, a.org.id));
  });
  afterAll(async () => {
    await h.pool.end();
  });

  const first = "50100234564417";
  const second = "50100987659083";

  it("adds, then changes with a confirmation code, a hold, and notices to every admin; the number stays secret", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    const other = await makeUser(h.db, "Second Admin");
    await h.db
      .update(schema.users)
      .set({ mobile: "+919800000001", mobileVerifiedAt: new Date() })
      .where(eq(schema.users.id, other.id));
    await h.db.insert(schema.memberships).values({ organisationId: a.org.id, userId: other.id, role: "Admin" });

    // A Viewer can't touch it.
    await expect(
      addBankAccount(h.db, await loadActor(h.db, a.requester.id), a.org.id, {
        holderName: "x",
        accountNumber: first,
        confirmNumber: first,
        ifsc: "HDFC0001234",
      }),
    ).rejects.toBeInstanceOf(BankError);
    const one = await addBankAccount(h.db, actor, a.org.id, {
      holderName: "Pranava H2 Private Limited",
      accountNumber: first,
      confirmNumber: first,
      ifsc: "HDFC0001234",
    });
    expect(one.status).toBe("Pending");
    await expect(confirmBankAccount(h.db, actor, a.org.id, { id: one.id })).rejects.toThrow("Confirm it's you");
    await recordStepUp(h.db, a.admin.id);
    expect((await confirmBankAccount(h.db, actor, a.org.id, { id: one.id })).holdUntil).toBeNull();

    // The change: checked, confirmed with the code, held for the clock.
    const now = new Date();
    const two = await addBankAccount(h.db, actor, a.org.id, {
      holderName: "Pranava H2 Pvt Ltd",
      accountNumber: second,
      confirmNumber: second,
      ifsc: "ICIC0000456",
    });
    const { holdUntil } = await confirmBankAccount(h.db, actor, a.org.id, { id: two.id }, now);
    expect(holdUntil && Math.round((holdUntil.getTime() - now.getTime()) / 3_600_000)).toBe(72);
    expect(await payoutsHeld(h.db, a.org.id)).toBe(true);
    const state = await bankState(h.db, scopeFor(actor), a.org.id);
    expect(state.current?.accountLast4).toBe("4417");
    expect(state.change?.status).toBe("Held");
    expect(JSON.stringify(state)).not.toContain(second);

    // Every admin: email to both, SMS to the one with a confirmed mobile.
    const sent = await h.db
      .select()
      .from(schema.notificationDeliveries)
      .where(eq(schema.notificationDeliveries.event, "bank.changed"));
    const mine = sent.filter((d) => d.userId === a.admin.id || d.userId === other.id);
    expect(mine.filter((d) => d.channel === "email").length).toBe(2);
    expect(mine.filter((d) => d.channel === "sms").length).toBe(1);

    // Never the full number in the audit log or the messages; the cipher opens to it.
    const logs = await h.db.execute(
      sql`select count(*)::int as n from core.audit_log where before::text like ${`%${second}%`} or after::text like ${`%${second}%`}`,
    );
    expect((logs.rows[0] as { n: number }).n).toBe(0);
    expect(JSON.stringify(mine)).not.toContain(second);
    const [row] = await h.db.select().from(schema.payoutBankAccounts).where(eq(schema.payoutBankAccounts.id, two.id));
    expect(openAccount(row?.accountCipher ?? "")).toBe(second);

    // The hold ends: the new account becomes current.
    await runDeadlines(h.db, new Date(now.getTime() + 73 * 3_600_000));
    const after = await bankState(h.db, scopeFor(actor), a.org.id);
    expect(after.current?.accountLast4).toBe("9083");
    expect(await payoutsHeld(h.db, a.org.id, new Date(now.getTime() + 73 * 3_600_000))).toBe(false);
  });

  it("a name that doesn't match fails and leaves payouts where they were; a change can be cancelled", async () => {
    const actor = await loadActor(h.db, a.admin.id);
    const bad = await addBankAccount(h.db, actor, a.org.id, {
      holderName: "Pranava",
      accountNumber: "0000000000",
      confirmNumber: "0000000000",
      ifsc: "HDFC0001234",
    });
    expect(bad.status).toBe("Failed");
    expect(bad.failReason).toContain("doesn't match your GST legal name");
    const c = await addBankAccount(h.db, actor, a.org.id, {
      holderName: "Pranava H2 Private Limited",
      accountNumber: "123456789012",
      confirmNumber: "123456789012",
      ifsc: "SBIN0000001",
    });
    await cancelBankChange(h.db, actor, a.org.id, { id: c.id });
    expect((await bankState(h.db, scopeFor(actor), a.org.id)).change).toBeNull();
  });

  it("supplier B can't see or change supplier A's account", async () => {
    const b = await makeCompany(h.db, "Bharat", "supplier");
    const bActor = await loadActor(h.db, b.admin.id);
    const s = await bankState(h.db, scopeFor(bActor), a.org.id);
    expect(s.current).toBeNull();
    await expect(
      addBankAccount(h.db, bActor, a.org.id, {
        holderName: "x",
        accountNumber: first,
        confirmNumber: first,
        ifsc: "HDFC0001234",
      }),
    ).rejects.toBeInstanceOf(BankError);
  });
});
