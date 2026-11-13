import config from "@payload-config";
import { getDb } from "@h2india/core";
import { sendStats } from "@h2india/core/newsletter/sends";
import { formatIstDateTime } from "@h2india/core/time";
import { buttonClasses, EmptyState, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { AdminShell, requireOperator } from "@/admin/shell";

// Newsletter stats (647:660), step 11.3: how an issue did. Sent and delivered come from our deliveries; opens, clicks
// and link clicks only as the email provider reports them (M6), so until then they show "—". Counts only.
export const metadata: Metadata = { title: "Newsletter stats · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const n = (x: number) => x.toLocaleString("en-IN");
const pct = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toFixed(1)}%` : "—");

export default async function NewsletterStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireOperator("content.view", `/admin/content/newsletter/${id}/stats`);
  if (!/^\d+$/.test(id)) notFound();
  const payload = await getPayload({ config });
  const issue = await payload
    .findByID({ collection: "newsletter-issues", id: Number(id), depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!issue) notFound();
  const stats = await sendStats(getDb(), id);

  const tiles = stats
    ? [
        {
          value: n(stats.delivered),
          label: "delivered",
          note: `${pct(stats.delivered, stats.sent)} of ${n(stats.sent)} sent`,
        },
        {
          value: stats.opens === null ? "—" : pct(stats.opens, stats.delivered),
          label: "opened",
          note: stats.opens === null ? "When the email provider reports it" : `${n(stats.opens)} people`,
        },
        {
          value: stats.clicks === null ? "—" : pct(stats.clicks, stats.delivered),
          label: "clicked",
          note: stats.clicks === null ? "When the email provider reports it" : `${n(stats.clicks)} people`,
        },
        {
          value: n(stats.unsubscribed),
          label: "unsubscribed",
          note: `${pct(stats.unsubscribed, stats.delivered)} of delivered`,
        },
      ]
    : [];

  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <div className="flex flex-col gap-1">
        <h1 className="type-h2">Content</h1>
        <p className="type-body-sm text-secondary">
          How {issue.title} did, from the email provider&apos;s delivery and click data.
        </p>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="type-h3">{issue.title}</h2>
          <p className="type-caption text-secondary">
            {stats?.sentAt
              ? `Sent ${formatIstDateTime(stats.sentAt)} IST to all subscribers (${n(stats.sent)})`
              : "Not sent yet"}
          </p>
        </div>
        <span className="flex items-center gap-3">
          {stats ? <StatusBadge status={stats.status} tone={stats.status === "Sent" ? "success" : "progress"} /> : null}
          <Link href="/admin/content?tab=newsletter" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <Icon name="arrow-left" size={14} />
            Back to issues
          </Link>
        </span>
      </div>

      {!stats || !stats.sent ? (
        <div className="rounded-card border border-default bg-page">
          <EmptyState
            title="No figures yet"
            action={
              <Link href={`/admin/content/newsletter/${id}`} className={buttonClasses({ variant: "outline" })}>
                Open the issue
              </Link>
            }
          >
            Figures show here once the issue has gone to subscribers.
          </EmptyState>
        </div>
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.label} className="flex flex-col gap-1 rounded-card bg-mint p-6">
                <span className="type-display">{t.value}</span>
                <span className="type-label">{t.label}</span>
                <span className="type-caption text-secondary">{t.note}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="Link clicks aren't reported yet">
              Clicks for each link, and their share, show here once the email provider sends click data (M6).
            </EmptyState>
          </div>
        </>
      )}
      <p className="type-caption text-secondary">
        Opens can be under-counted when readers block images. Clicks are the more reliable signal.
      </p>
    </AdminShell>
  );
}
