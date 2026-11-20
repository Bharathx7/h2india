import { auditLog, createDb, schema, type DbHandle } from "@h2india/db";
import { and, desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadActor } from "../authz/actor";
import { recordStepUp } from "../sign-in/step-up";
import { makeUser, useTestEnv } from "../testing/factory";
import {
  addStaffMember,
  deleteOperatorRole,
  listStaff,
  saveOperatorRole,
  setStaffSections,
  staffSections,
} from "./staff";

// Team and roles (founder, 20 Nov 2026): a Super admin adds staff (making the account when there is none), limits an
// editor to content sections and makes custom roles; nobody else can; built-in roles stay locked; Super admin-only
// permissions never go to a custom role; sensitive access needs Confirm it's you; everything is audited.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("team and roles", () => {
  let h: DbHandle;
  const grant = async (userId: string, role: string) => {
    const [r] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, role)));
    await h.db
      .insert(schema.operatorRoles)
      .values({ userId, roleId: r?.id ?? "" })
      .onConflictDoNothing();
  };
  const latest = async (action: string, resourceId: string) => {
    const [row] = await h.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, action), eq(auditLog.resourceId, resourceId)))
      .orderBy(desc(auditLog.at))
      .limit(1);
    return row;
  };
  const tag = () => Math.random().toString(36).slice(2, 8);

  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 5 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("adds a new person as a section-limited editor, and only a Super admin can", async () => {
    const boss = await makeUser(h.db, "Team Boss");
    await grant(boss.id, "Super admin");
    const editor = await makeUser(h.db, "Team Editor");
    await grant(editor.id, "Editor-in-chief");
    const bossActor = await loadActor(h.db, boss.id);
    const editorActor = await loadActor(h.db, editor.id);
    const email = `new.editor.${tag()}@example.org`;

    await expect(
      addStaffMember(h.db, editorActor, { email, name: "Asha", role: "Content editor", sections: null, reason: "x" }),
    ).rejects.toThrow("Not allowed");

    const made = await addStaffMember(h.db, bossActor, {
      email: email.toUpperCase(),
      name: "Asha Iyer",
      role: "Content editor",
      sections: ["tracker", "knowledge", "tracker"],
      reason: "Tracker desk",
    });
    expect(made.created).toBe(true);
    expect(await staffSections(h.db, made.userId)).toEqual(["knowledge", "tracker"]);
    expect((await loadActor(h.db, made.userId)).operator.has("content.edit")).toBe(true);
    expect(await latest("staff.add", made.userId)).toMatchObject({
      actorId: boss.id,
      after: { roles: ["Content editor"], sections: ["knowledge", "tracker"], newAccount: true },
      reason: "Tracker desk",
    });

    const staff = await listStaff(h.db, bossActor);
    expect(staff.find((s) => s.userId === made.userId)).toMatchObject({
      email,
      roles: ["Content editor"],
      sections: ["knowledge", "tracker"],
    });

    await setStaffSections(h.db, bossActor, { userId: made.userId, sections: null, reason: "Whole desk now" });
    expect(await staffSections(h.db, made.userId)).toBeNull();
    await expect(
      setStaffSections(h.db, bossActor, { userId: made.userId, sections: [], reason: "" }),
    ).rejects.toMatchObject({ code: "BAD_SECTIONS" });
    await expect(
      setStaffSections(h.db, bossActor, { userId: made.userId, sections: ["nope"], reason: "" }),
    ).rejects.toMatchObject({ code: "BAD_SECTIONS" });
  });

  it("asks a Super admin to confirm before giving sensitive access", async () => {
    const boss = await makeUser(h.db, "Team Boss Two");
    await grant(boss.id, "Super admin");
    const bossActor = await loadActor(h.db, boss.id);
    const input = { email: `finance.${tag()}@example.org`, name: "Ravi", role: "Finance", sections: null, reason: "" };
    await expect(addStaffMember(h.db, bossActor, input)).rejects.toMatchObject({ code: "CONFIRM" });
    await recordStepUp(h.db, boss.id);
    await expect(addStaffMember(h.db, bossActor, input)).resolves.toMatchObject({ created: true });
  });

  it("makes, changes and deletes a custom role, but never a built-in one", async () => {
    const boss = await makeUser(h.db, "Team Boss Three");
    await grant(boss.id, "Super admin");
    const bossActor = await loadActor(h.db, boss.id);
    const name = `Tracker desk ${tag()}`;

    const { roleId } = await saveOperatorRole(h.db, bossActor, {
      name,
      description: "Tracker and knowledge only",
      permissions: ["content.edit", "reports.view"],
      reason: "New desk",
    });
    const perms = await h.db
      .select({ key: schema.rolePermissions.permissionKey })
      .from(schema.rolePermissions)
      .where(eq(schema.rolePermissions.roleId, roleId));
    // Edit brings View.
    expect(perms.map((x) => x.key).sort()).toEqual(["content.edit", "content.view", "reports.view"]);
    expect(await latest("operator_role.create", roleId)).toMatchObject({ actorId: boss.id, reason: "New desk" });

    await expect(
      saveOperatorRole(h.db, bossActor, {
        name: `${name} 2`,
        description: "",
        permissions: ["roles.manage"],
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "BAD_PERMISSIONS" });
    await expect(
      saveOperatorRole(h.db, bossActor, {
        name: name.toUpperCase(),
        description: "",
        permissions: ["content.view"],
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "NAME_TAKEN" });
    // Money is sensitive: it needs Confirm it's you.
    await expect(
      saveOperatorRole(h.db, bossActor, { roleId, name, description: "", permissions: ["money.edit"], reason: "" }),
    ).rejects.toMatchObject({ code: "CONFIRM" });

    const [builtIn] = await h.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(and(eq(schema.roles.scope, "operator"), eq(schema.roles.name, "Content editor")));
    await expect(
      saveOperatorRole(h.db, bossActor, {
        roleId: builtIn?.id ?? "",
        name: "Content editor",
        description: "",
        permissions: ["content.view"],
        reason: "",
      }),
    ).rejects.toMatchObject({ code: "BUILT_IN" });
    await expect(deleteOperatorRole(h.db, bossActor, { roleId: builtIn?.id ?? "", reason: "" })).rejects.toMatchObject({
      code: "BUILT_IN",
    });

    const holder = await makeUser(h.db, "Desk Holder");
    await grant(holder.id, name);
    await expect(deleteOperatorRole(h.db, bossActor, { roleId, reason: "" })).rejects.toMatchObject({
      code: "ROLE_IN_USE",
    });
    await h.db.delete(schema.operatorRoles).where(eq(schema.operatorRoles.userId, holder.id));
    await deleteOperatorRole(h.db, bossActor, { roleId, reason: "Desk closed" });
    expect(await latest("operator_role.delete", roleId)).toMatchObject({ reason: "Desk closed" });
  });

  it("never limits a Super admin to sections (founder, 20 Nov 2026)", async () => {
    const boss = await makeUser(h.db, "Unlimited Boss");
    await grant(boss.id, "Super admin");
    await h.db.insert(schema.operatorSections).values({ userId: boss.id, section: "tracker" });
    expect(await staffSections(h.db, boss.id)).toBeNull();
  });
});
