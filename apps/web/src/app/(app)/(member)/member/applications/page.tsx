import { getDb } from "@h2india/core";
import { listApplications, listSaved } from "@h2india/core/members";
import { Alert, buttonClasses, EmptyState, Icon, Skeleton } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { ApplicationStatus, RemoveSavedJob } from "@/member/ApplicationControls";
import { MemberShell, requireMember } from "@/member/shell";

// Job applications (725:1038; empty 726:5662), step 7.5. Applications happen on the employer's site (A70), so a job
// is added when the member clicks Apply; the status is theirs to keep and employers never see it. Reached from the
// home feed, not the sidebar (F3 safe default).
export const metadata: Metadata = { title: "Job applications · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

const dm = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(d);

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const sp = await searchParams;
  const userId = await requireMember("/member/applications");
  const db = getDb();
  const [apps, saved] = await Promise.all([listApplications(db, userId), listSaved(db, userId)]);
  const applied = new Set(apps.map((a) => a.jobSlug));
  const savedJobs = saved.filter((s) => s.targetType === "job" && !applied.has(s.targetId));
  const now = new Date().getTime();
  return (
    <MemberShell userId={userId} current="/member/applications">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Job applications</h1>
          <p className="type-body-sm text-secondary">
            Jobs you've applied for from H2 India. Only you see the status you set; employers don't.
          </p>
        </div>
        <Link href="/member/alerts?type=jobs" className={buttonClasses({ variant: "outline" })}>
          <Icon name="mail" size={18} />
          Manage job alerts
        </Link>
      </div>
      <Alert tone="info" title="We add a job here when you click Apply">
        Applications happen on the employer's site, so we don't know what happens next. Update the status yourself to
        keep track.
      </Alert>
      <LiveSection
        label="Job applications"
        state={forcedState(sp.state) ?? (apps.length || savedJobs.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-3 rounded-card border border-default bg-page p-6">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState
              title="You haven't applied for any jobs yet"
              action={
                <Link href="/opportunities/jobs" className={buttonClasses({})}>
                  Browse jobs
                </Link>
              }
            >
              When you click Apply on a H2 India job, we add it here so you can track it.
            </EmptyState>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {apps.length ? (
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5 md:p-6">
              <h2 className="type-h4">Applied · {apps.length}</h2>
              <div tabIndex={0} role="region" aria-label="Jobs you applied for" className="relative overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="bg-subtle text-left type-caption text-secondary">
                      <th scope="col" className="px-3 py-2">
                        Job
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Location
                      </th>
                      <th scope="col" className="px-3 py-2">
                        You applied
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Closes
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Your status
                      </th>
                      <th scope="col" className="px-3 py-2">
                        <span className="sr-only">Job page</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((a) => {
                      const closed = a.closesAt ? a.closesAt.getTime() < now : false;
                      return (
                        <tr key={a.id} className="border-b border-default last:border-0">
                          <th scope="row" className="px-3 py-3 text-left">
                            <span className="block type-label text-primary">{a.role}</span>
                            <span className="block type-caption text-secondary">{a.company}</span>
                          </th>
                          <td className="px-3 py-3 type-body-sm">{a.location || "—"}</td>
                          <td className="px-3 py-3 type-body-sm">{dm(a.appliedAt)}</td>
                          <td className={closed ? "px-3 py-3 type-body-sm text-secondary" : "px-3 py-3 type-body-sm"}>
                            {a.closesAt ? (closed ? "Closed" : dm(a.closesAt)) : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <ApplicationStatus id={a.id} status={a.status} role={a.role} />
                          </td>
                          <td className="px-3 py-3">
                            <Link
                              href={`/opportunities/jobs/${a.jobSlug}`}
                              className="type-label text-primary hover:underline"
                            >
                              View job<span className="sr-only"> {a.role}</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
          {savedJobs.length ? (
            <section className="flex flex-col gap-1 rounded-card border border-default bg-page p-5 md:p-6">
              <h2 className="type-h4">Saved jobs · {savedJobs.length}</h2>
              <p className="type-caption text-secondary">Jobs you saved but haven't applied for yet.</p>
              <ul className="pt-2">
                {savedJobs.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 border-t border-default py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={s.href} className="type-label text-primary hover:underline">
                        {s.title}
                      </Link>
                      <p className="type-caption text-secondary">{s.meta}</p>
                    </div>
                    <a
                      href={`/opportunities/jobs/${s.targetId}/apply`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses({ variant: "inverse", size: "sm" })}
                    >
                      <Icon name="external-link" size={16} />
                      Apply<span className="sr-only"> for {s.title} (opens in a new tab)</span>
                    </a>
                    <RemoveSavedJob id={s.id} role={s.title} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </LiveSection>
    </MemberShell>
  );
}
