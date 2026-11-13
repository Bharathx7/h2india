import config from "@payload-config";
import { getDb } from "@h2india/core";
import { confirmedCount, sendFor } from "@h2india/core/newsletter/sends";
import { formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { SendSettings } from "@/admin/content/Controls";
import { issueContent } from "@/admin/content/issue";
import { AdminShell, requireOperator } from "@/admin/shell";

// Newsletter composer (648:312), step 11.3: the issue as subscribers get it (auto-filled from the week's published
// items, with the editor's note) and the send settings. It sends at the set IST time to confirmed subscribers only.
export const metadata: Metadata = { title: "Newsletter · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const local = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .format(d)
        .replace(" ", "T")
    : "";

export default async function ComposerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireOperator("content.view", `/admin/content/newsletter/${id}`);
  if (!/^\d+$/.test(id)) notFound();
  const payload = await getPayload({ config });
  const issue = await payload
    .findByID({ collection: "newsletter-issues", id: Number(id), depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!issue) notFound();
  const db = getDb();
  const [send, audience] = await Promise.all([sendFor(db, id), confirmedCount(db)]);
  const at = send?.sendAt ?? (issue.sentOn ? new Date(issue.sentOn) : new Date());
  const content = await issueContent(payload, issue, at);
  const status = send?.status ?? "Draft";
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <Link href="/admin/content?tab=newsletter" className="inline-flex items-center gap-1 type-label">
        <Icon name="arrow-left" size={16} />
        Content · Newsletter
      </Link>
      <div>
        <h1 className="type-h2">{issue.title}</h1>
        <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
          <StatusBadge
            status={status}
            tone={status === "Sent" ? "success" : status === "Scheduled" ? "progress" : "neutral"}
          />
          {send?.sendAt ? `${formatIstDateTime(send.sendAt)} IST` : "Not scheduled"} · All subscribers (
          {audience.toLocaleString("en-IN")})
        </p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Preview" className="rounded-card bg-subtle p-6">
          <div className="mx-auto flex max-w-150 flex-col gap-5 rounded-card bg-page p-6">
            <p className="type-caption text-secondary">{content.masthead}</p>
            {send?.editorNote ? (
              <div className="rounded-input border border-dashed border-default p-3">
                <p className="type-eyebrow text-secondary">Editor&apos;s note</p>
                <p className="type-body-sm">{send.editorNote}</p>
              </div>
            ) : null}
            {content.sections.map((s) => (
              <div key={s.heading} className="flex flex-col gap-2">
                <p className="flex items-center justify-between type-eyebrow text-secondary">
                  {s.heading}
                  <span className="rounded-pill bg-subtle px-2 py-0.5 type-caption normal-case">Auto-filled</span>
                </p>
                {s.items.length ? (
                  s.items.map((i) => (
                    <div key={i.href} className="border-t border-default pt-2">
                      <p className="type-label text-link">{i.title}</p>
                      <p className="type-caption text-secondary">{i.meta}</p>
                    </div>
                  ))
                ) : (
                  <p className="type-caption text-secondary">
                    Nothing this week. The section is left out of the email.
                  </p>
                )}
              </div>
            ))}
            <p className="type-caption text-secondary">
              You get this because you subscribed to India H₂ Weekly. Manage preferences · Unsubscribe
            </p>
          </div>
        </section>
        <section className="self-start rounded-card border border-default bg-page p-5">
          <SendSettings
            issueId={id}
            status={status}
            audience={audience}
            lastTest={send?.lastTestAt ? formatIstDateTime(send.lastTestAt) : null}
            start={{
              subject: send?.subject ?? "",
              preview: send?.preview ?? "",
              editorNote: send?.editorNote ?? "",
              sendAt: local(send?.sendAt ?? null),
            }}
          />
        </section>
      </div>
    </AdminShell>
  );
}
