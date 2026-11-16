"use server";

import config from "@payload-config";
import { audit, checkForm, getDb, nextReference, underLimit, type FormGuard } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { CHECKS, NEEDS_ACCOUNT, SUBMISSION_PREFIX, type SubmissionKind } from "@h2india/core/events";
import { sendSubmissionReceived } from "@h2india/core/notify";
import { jobPosters } from "@h2india/core/opportunities";
import { parseServerEnv } from "@h2india/config";
import { getPayload } from "payload";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// The public submission forms (step 5.7), and Contact, Partnership and Advertise (step 5.8). Every check runs here (CHECKS in @h2india/core/events). A submission gets
// its reference (EV-, PR-, COR-, WFU-), enters the Submissions queue under review, and the sender gets Submission
// received (673:352) when we have their email. Events and press releases need an account (505:421).

export type SubmitResult =
  | { ok: true; reference: string }
  | { ok: false; errors?: Record<string, string>; reason?: "signed-out" | "limited" | "failed" };

const ROWS: Record<SubmissionKind, (d: Record<string, unknown>) => { label: string; value: string }[]> = {
  event: (d) => [
    { label: "Event", value: typeof d.title === "string" ? d.title : "" },
    {
      label: "Type and date",
      value: `${String(d.type)} · ${new Date(`${String(d.startDate)}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`,
    },
    { label: "Place", value: String(d.format === "Online" ? "Online" : d.venue) },
  ],
  press_release: (d) => [
    { label: "Headline", value: String(d.headline) },
    { label: "Company", value: String(d.company) },
  ],
  correction: (d) => [{ label: "Page", value: String(d.page) }],
  pitch: (d) => [{ label: "Topic", value: String(d.topic) }],
  contact: (d) => [
    { label: "About", value: String(d.topic) },
    { label: "Company", value: String(d.company) },
  ],
  partnership: (d) => [
    { label: "Organisation", value: String(d.organisation) },
    { label: "Partner type", value: String(d.partnerType) },
  ],
  advertising: (d) => [
    { label: "Company", value: String(d.company) },
    { label: "Interested in", value: Array.isArray(d.interests) ? d.interests.map(String).join(", ") : "" },
  ],
};

const RETURN_PATH: Record<SubmissionKind, string> = {
  event: "events/submit",
  press_release: "news/submit",
  correction: "legal/corrections",
  pitch: "knowledge/insights/write",
  contact: "contact",
  partnership: "contact/partnerships",
  advertising: "advertise",
};

export async function submitContent(
  requested: SubmissionKind,
  input: Record<string, unknown>,
  guard?: FormGuard,
): Promise<SubmitResult> {
  // A server action's arguments come from the browser: only a known kind picks a check (CodeQL
  // js/unvalidated-dynamic-method-call).
  const kind = (Object.keys(RETURN_PATH) as SubmissionKind[]).find((k) => k === requested);
  if (!kind) return { ok: false, reason: "failed" };
  const ctx = await requestContext();
  if (!(await underLimit(`submission:${kind}:${ctx.ip ?? "unknown"}`, 3600, 10)))
    return { ok: false, reason: "limited" };
  const session = await getSession().catch(() => null);
  if (NEEDS_ACCOUNT[kind] && !session) return { ok: false, reason: "signed-out" };

  const db = getDb();
  let organisationId: string | null = null;
  let company: string | null = null;
  if (session && (kind === "event" || kind === "press_release")) {
    const poster = (await jobPosters(db, await loadActor(db, session.user.id)))[0];
    organisationId = poster?.organisationId ?? null;
    company = poster?.name ?? null;
  }
  // The press release's company is the sender's own (504:8 "Verified company, from your profile").
  const checked = CHECKS[kind](kind === "press_release" ? { ...input, company: company ?? "" } : input);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  // Form protection (step 5.9): honeypot, timing, burst and hourly limits, checked only for a submission that would be
  // saved, so people always see their mistakes first.
  if (!(await checkForm({ form: `submission:${kind}`, ip: ctx.ip ?? null, guard })).ok)
    return { ok: false, reason: "limited" };
  const v = checked.value;
  const contact = {
    name: v.contact.name ?? session?.user.name ?? null,
    email: v.contact.email ?? session?.user.email ?? null,
    phone: v.contact.phone,
  };
  try {
    const reference = await nextReference(db, SUBMISSION_PREFIX[kind]);
    const images: unknown[] = Array.isArray(v.details.images) ? (v.details.images as unknown[]) : [];
    const files = [v.details.logo, ...images].filter((x): x is string => typeof x === "string" && x.length > 0);
    const payload = await getPayload({ config });
    const doc = await payload.create({
      collection: "submissions",
      data: {
        reference,
        kind,
        status: "Under review",
        title: v.title,
        details: { ...v.details, title: v.title },
        contactName: contact.name,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        files,
        submittedBy: session?.user.id ?? null,
        organisationId,
      },
      overrideAccess: true,
    });
    await audit(db, {
      actorId: session?.user.id ?? null,
      action: "submission.received",
      resourceType: "submissions",
      resourceId: String(doc.id),
      companyId: organisationId,
      after: { reference, kind, title: v.title },
      context: ctx,
    });
    if (contact.email) {
      await sendSubmissionReceived(
        { email: contact.email, userId: session?.user.id ?? null },
        {
          kind,
          name: contact.name ?? "",
          reference,
          title: v.title,
          rows: ROWS[kind]({ ...v.details, title: v.title }),
          url: `${parseServerEnv().APP_URL}/${RETURN_PATH[kind]}`,
        },
      );
    }
    return { ok: true, reference };
  } catch (error) {
    console.error("[submissions] failed", { kind }, error);
    return { ok: false, reason: "failed" };
  }
}
