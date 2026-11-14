import { schema, type Executor } from "@h2india/db";
import { eq } from "drizzle-orm";
import { onDeadline } from "../clocks/clocks";
import { notify } from "../notify/notify";

// Grievance escalation (step 11.7): when a grievance isn't acknowledged in time or isn't resolved by its date, or a
// data-rights request passes its due date, every operator who can act on compliance hears about it in-app, once per
// event (the deadline engine fires each event once). The officer and deputy are operators with compliance.edit.

async function complianceOperators(tx: Executor) {
  return tx
    .selectDistinct({ id: schema.operatorRoles.userId })
    .from(schema.operatorRoles)
    .innerJoin(schema.rolePermissions, eq(schema.rolePermissions.roleId, schema.operatorRoles.roleId))
    .where(eq(schema.rolePermissions.permissionKey, "compliance.edit"));
}

async function tell(tx: Executor, title: string, href: string, event: string) {
  for (const op of await complianceOperators(tx)) {
    try {
      await notify({
        event,
        topic: "account.security",
        userId: op.id,
        inApp: { category: "account", icon: "alert-triangle", title, href },
      });
    } catch (error) {
      console.error("escalation notice failed", error);
    }
  }
}

async function grievanceRef(tx: Executor, id: string) {
  const [g] = await tx
    .select({ reference: schema.grievances.reference, status: schema.grievances.status })
    .from(schema.grievances)
    .where(eq(schema.grievances.id, id));
  return g ?? null;
}

onDeadline("grievanceAcknowledge", async (tx, deadline, event) => {
  const g = await grievanceRef(tx, deadline.subjectId);
  if (!g || g.status !== "Received") return;
  await tell(
    tx,
    event === "warn" ? `${g.reference} must be acknowledged soon` : `${g.reference} wasn't acknowledged in 24 hours`,
    `/admin/compliance?grievance=${deadline.subjectId}`,
    `grievance.${event}`,
  );
});

onDeadline("grievanceResolve", async (tx, deadline, event) => {
  const g = await grievanceRef(tx, deadline.subjectId);
  if (!g || g.status === "Resolved") return;
  await tell(
    tx,
    event === "warn" ? `${g.reference} is due for resolution soon` : `${g.reference} is past its resolution date`,
    `/admin/compliance?grievance=${deadline.subjectId}`,
    `grievance.${event}`,
  );
});

onDeadline("dataRightsDue", async (tx, deadline, event) => {
  const [row] = await tx
    .select({ reference: schema.dataRightsRequests.reference, status: schema.dataRightsRequests.status })
    .from(schema.dataRightsRequests)
    .where(eq(schema.dataRightsRequests.id, deadline.subjectId));
  if (!row || row.status === "Completed" || row.status === "Rejected") return;
  await tell(
    tx,
    event === "warn" ? `${row.reference} is due soon` : `${row.reference} is past its due date`,
    `/admin/compliance?tab=data-rights`,
    `data_rights.${event}`,
  );
});
