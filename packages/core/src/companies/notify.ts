import { parseServerEnv } from "@h2india/config";
import { schema } from "@h2india/db";
import {
  renderJoinRequestAnswered,
  renderJoinRequestToAdmin,
  renderVerifyEmail,
  type RenderedEmail,
} from "@h2india/emails";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { mailTransport } from "../mail/transport";
import { companyAdmins } from "./join-requests";

// Join emails (step 3.3). Wording: decision M21 (page 16 does not draw them yet).

const { joinRequests: r, organisations: o, users: u } = schema;

async function send(to: string, mail: RenderedEmail, security = false) {
  const env = parseServerEnv();
  await mailTransport(env).sendMail({
    from: security ? (env.EMAIL_FROM_SECURITY ?? env.EMAIL_FROM) : env.EMAIL_FROM,
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

/** The Verify email link (365:27778), sent by Better Auth's magic-link plugin. */
export async function sendVerifyEmail(email: string, url: string): Promise<void> {
  const env = parseServerEnv();
  await send(email, await renderVerifyEmail(env.APP_URL, { email, url }), true);
}

async function requestDetails(requestId: string) {
  const [row] = await getDb()
    .select({
      organisationId: r.organisationId,
      company: o.legalName,
      kind: o.kind,
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
    await send(admin.email, mail);
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
  await send(row.requesterEmail, mail);
}
