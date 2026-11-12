import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import { renderJoinRequestAnswered, renderJoinRequestToAdmin, renderVerifyEmail } from "@h2india/emails";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { deliverEmail } from "../notify/channels";
import { notify } from "../notify/notify";
import { companyAdmins } from "./join-requests";

// Join emails (step 3.3). Wording: decision M21 (page 16 does not draw them yet).

const { joinRequests: r, organisations: o, users: u } = schema;

/** The Verify email link (365:27778), sent by Better Auth's magic-link plugin. */
export async function sendVerifyEmail(email: string, url: string): Promise<void> {
  const env = parseServerEnv();
  await deliverEmail({
    template: "email.verify_email",
    event: "join.verify_email",
    to: email,
    mail: await renderVerifyEmail(env.APP_URL, { email, url }),
    security: true,
  });
}

async function requestDetails(requestId: string) {
  const [row] = await getDb()
    .select({
      organisationId: r.organisationId,
      company: o.legalName,
      kind: o.kind,
      requesterId: u.id,
      requesterName: u.name,
      requesterEmail: u.email,
      status: r.status,
      reason: r.reason,
      decidedBy: r.decidedBy,
    })
    .from(r)
    .innerJoin(o, eq(o.id, r.organisationId))
    .innerJoin(u, eq(u.id, r.userId))
    .where(eq(r.id, requestId));
  return row ?? null;
}

const workspaceOf = (kind: string) => (kind === "supplier" ? "/supplier" : "/buyer");

export async function notifyAdminsOfRequest(requestId: string, options: { reminder?: boolean } = {}): Promise<void> {
  const env = parseServerEnv();
  const row = await requestDetails(requestId);
  if (!row) return;
  const admins = await companyAdmins(getDb(), row.organisationId);
  for (const admin of admins) {
    const mail = await renderJoinRequestToAdmin(env.APP_URL, {
      adminName: admin.name.split(/\s+/)[0] ?? "",
      requesterName: row.requesterName || row.requesterEmail,
      requesterEmail: row.requesterEmail,
      company: row.company,
      url: `${env.APP_URL}${workspaceOf(row.kind)}`,
      reminder: options.reminder ?? false,
    });
    const who = row.requesterName || row.requesterEmail;
    await notify({
      event: options.reminder ? "join.request_reminder" : "join.request",
      topic: "team.requests",
      userId: admin.id,
      scope: row.organisationId,
      email: { template: "email.join_request_admin", mail },
      inApp: {
        category: "team",
        icon: "users",
        title: options.reminder
          ? `Reminder: ${who} asked to join ${row.company}`
          : `${who} asked to join ${row.company}`,
        body: row.requesterEmail,
        href: workspaceOf(row.kind),
        actionLabel: "Review request",
      },
    });
  }
}

export async function notifyRequester(requestId: string): Promise<void> {
  const env = parseServerEnv();
  const row = await requestDetails(requestId);
  if (!row || (row.status !== "Approved" && row.status !== "Rejected")) return;
  let adminName = "The company admin";
  if (row.decidedBy) {
    const [admin] = await getDb().select({ name: u.name }).from(u).where(eq(u.id, row.decidedBy));
    if (admin?.name) adminName = admin.name;
  }
  const approved = row.status === "Approved";
  const mail = await renderJoinRequestAnswered(env.APP_URL, {
    approved,
    adminName,
    company: row.company,
    reason: row.reason,
    url: `${env.APP_URL}${approved ? workspaceOf(row.kind) : "/join/request"}`,
  });
  await notify({
    event: approved ? "join.approved" : "join.rejected",
    topic: "account.security",
    userId: row.requesterId,
    email: { template: "email.join_request_answered", mail },
    inApp: {
      category: "team",
      icon: approved ? "check-circle" : "alert-triangle",
      title: approved ? `You're in ${row.company}` : `${row.company} didn't approve your request`,
      body: approved ? `${adminName} approved your request` : (row.reason ?? undefined),
      href: approved ? workspaceOf(row.kind) : "/join/request",
      actionLabel: approved ? "Go to your workspace" : "See your options",
    },
  });
}
