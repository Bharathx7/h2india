import config from "@payload-config";
import { getDb } from "@h2india/core";
import { firstIssueDate } from "@h2india/core/newsletter";
import { confirmedCount, sendFor, type IssueContent } from "@h2india/core/newsletter/sends";

type IssueSection = IssueContent["sections"][number];
import { formatIstDateTime } from "@h2india/core/time";
import { Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { SendSettings } from "@/admin/content/Controls";
import { issueContent, NEWSLETTER_CHARTS } from "@/admin/content/issue";
import { AdminShell, requireOperator } from "@/admin/shell";

// Newsletter composer (648:312), step 11.3: the issue as subscribers get it (auto-filled from the week's published
// items, with the editor's note) and the send settings. It sends at the set IST time to confirmed subscribers only.
// New issues default to the next Monday at 8:00 AM IST (A172).
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
  const content = await issueContent(payload, issue, at, { chart: send?.chart ?? null });
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
            {content.sections
              .filter((s) => !s.late)
              .map((s) => (
                <PreviewSection key={s.heading} section={s} />
              ))}
            {content.chart ? (
              <div className="flex flex-col gap-2">
                <p className="type-eyebrow text-secondary">Chart of the week</p>
                <p className="type-label">{content.chart.title}</p>
                <ul className="flex flex-col gap-1">
                  {content.chart.bars.map((b) => {
                    const max = Math.max(...(content.chart?.bars.map((x) => x.value) ?? [1]), 1);
                    return (
                      <li
                        key={b.label}
                        className="grid grid-cols-[120px_minmax(0,1fr)_48px] items-center gap-2 type-caption"
                      >
                        <span className="truncate">{b.label}</span>
                        <span
                          className="h-2.5 rounded-pill bg-accent"
                          style={{ width: `${String(Math.max(2, Math.round((b.value / max) * 100)))}%` }}
                        />
                        <span className="text-right">{b.value.toLocaleString("en-IN")}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="type-caption text-secondary">{content.chart.source}</p>
              </div>
            ) : null}
            {send?.sponsor ? (
              <div className="flex flex-col gap-1 rounded-card bg-mint p-4">
                <p className="type-eyebrow text-secondary">Sponsored</p>
                <p className="type-label">
                  {send.sponsor.name} · {send.sponsor.headline}
                </p>
                {send.sponsor.text ? <p className="type-caption">{send.sponsor.text}</p> : null}
              </div>
            ) : null}
            {content.sections
              .filter((s) => s.late)
              .map((s) => (
                <PreviewSection key={s.heading} section={s} />
              ))}
            <p className="type-caption text-secondary">
              You get this because you subscribed to India H₂ Weekly. Manage preferences · Unsubscribe
            </p>
          </div>
        </section>
        <section className="self-start rounded-card border border-default bg-page p-5">
          <SendSettings
            charts={NEWSLETTER_CHARTS}
            issueId={id}
            status={status}
            audience={audience}
            lastTest={send?.lastTestAt ? formatIstDateTime(send.lastTestAt) : null}
            start={{
              subject: send?.subject ?? "",
              preview: send?.preview ?? "",
              editorNote: send?.editorNote ?? "",
              sendAt: local(send?.sendAt ?? firstIssueDate()), // A172: Mondays at 8:00 AM IST,
              chart: send?.chart ?? "",
              sponsor: send?.sponsor ?? { name: "", headline: "", text: "", url: "" },
            }}
          />
        </section>
      </div>
    </AdminShell>
  );
}

function PreviewSection({ section: s }: { section: IssueSection }) {
  return (
    <div className="flex flex-col gap-2">
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
        <p className="type-caption text-secondary">Nothing this week. The section is left out of the email.</p>
      )}
    </div>
  );
}
