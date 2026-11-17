import { getDb } from "@h2india/core";
import { alertContacts, myAlerts, type AlertRow } from "@h2india/core/alerts";
import { getNotifySettings } from "@h2india/core/notify";
import { formatIstDate } from "@h2india/core/time";
import { Alert, Icon, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { emptyAlert, prefillAlert } from "@/member/alert-prefill";
import { AlertsList, type AlertCard } from "@/member/AlertsList";
import { MemberShell, requireMember } from "@/member/shell";

// Alerts (534:8; phones 536:414), step 7.3. Create alert links across the site arrive as ?type=tenders, ?tender=slug,
// ?scheme=slug, ?grant=slug and open the Create alert modal (534:587) filled in.
export const metadata: Metadata = { title: "Alerts · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

function ago(at: Date, now: Date): string {
  const days = Math.floor((now.getTime() - at.getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${String(days)} days ago`;
}

function statusLine(a: AlertRow, now: Date): string {
  if (!a.on) return a.pausedAt ? `Paused by you on ${formatIstDate(a.pausedAt)}` : "Paused";
  const month = `${String(a.thisMonth)} ${a.thisMonth === 1 ? "match" : "matches"} this month`;
  return a.lastMatchedAt ? `Last matched ${ago(a.lastMatchedAt, now)} · ${month}` : "No matches yet";
}

const twelve = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return `${String(h % 12 || 12)}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const userId = await requireMember("/member/alerts", sp);
  const db = getDb();
  const now = new Date();
  const forced = forcedState(sp.state);
  const [rows, reach, quiet, start] = await Promise.all([
    myAlerts(db, userId, now),
    alertContacts(db, userId),
    getNotifySettings(db, userId),
    prefillAlert(sp),
  ]);
  const cards: AlertCard[] = rows.map((a) => ({ ...a, status: statusLine(a, now) }));
  const missing = (sp.tender ?? sp.scheme ?? sp.grant) && !start;
  return (
    <MemberShell userId={userId} current="/member/alerts">
      {missing ? <Alert tone="warning" title="That item isn't available any more." /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <LiveSection
            label="Alerts"
            state={forced ?? "ready"}
            skeleton={
              <div className="flex flex-col gap-4">
                <Skeleton kind="card" />
                <Skeleton kind="card" />
              </div>
            }
            empty={null}
          >
            <AlertsList alerts={cards} reach={reach} start={start} blank={emptyAlert()} />
          </LiveSection>
        </div>
        <div className="flex flex-col gap-6 self-start">
          <section
            aria-labelledby="reach"
            className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
          >
            <h2 id="reach" className="type-h4">
              How we reach you
            </h2>
            <dl className="flex flex-col gap-3">
              <div>
                <dt className="type-label">Email</dt>
                <dd className="type-caption text-secondary">{reach.email}</dd>
              </div>
              <div>
                <dt className="type-label">WhatsApp</dt>
                <dd className="type-caption text-secondary">
                  {reach.mobile ? `On for ${reach.mobile}` : "Add and confirm a mobile number in Profile"}
                </dd>
              </div>
              <div>
                <dt className="type-label">In-app</dt>
                <dd className="type-caption text-secondary">Bell icon, top right</dd>
              </div>
            </dl>
            <Link href="/member/preferences" className="inline-flex items-center gap-1.5 type-label text-link">
              Change in Preferences
              <Icon name="arrow-right" size={16} />
            </Link>
          </section>
          {quiet.quietHours ? (
            <section
              aria-labelledby="quiet"
              className="flex flex-col gap-2 rounded-card border border-default bg-page p-5"
            >
              <h2 id="quiet" className="type-h4">
                Quiet hours
              </h2>
              <p className="type-body-sm text-body">
                No instant alerts between {twelve(quiet.quietFrom)} and {twelve(quiet.quietTo)} IST. They wait until the
                morning.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </MemberShell>
  );
}
