import { getDb } from "@h2india/core";
import { courseSummary, learningProgress } from "@h2india/core/members";
import { formatIstDate } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon, Skeleton, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { allChapters } from "@/knowledge/data";
import { forcedState } from "@/lib/dev-state";
import { MemberShell, requireMember } from "@/member/shell";

// Hydrogen 101 progress (725:8; phones 726:8; loading 726:5662), step 7.5: chapters done, time spent, quiz average,
// and where to pick up. Progress is saved as the member reads (ChapterTracker).
export const metadata: Metadata = { title: "Hydrogen 101 · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LearningPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const sp = await searchParams;
  const userId = await requireMember("/member/hydrogen-101");
  const [chapters, rows] = await Promise.all([allChapters(), learningProgress(getDb(), userId)]);
  const ids = chapters.map((c) => String(c.id));
  const s = courseSummary(rows, ids);
  const row = (id: number) => rows.find((r) => r.chapterId === String(id));
  const current = chapters.find((c) => row(c.id)?.status === "in_progress") ?? chapters.find((c) => !row(c.id));
  const currentRow = current ? row(current.id) : undefined;
  const totalMinutes = chapters.reduce((n, c) => n + (c.readingMinutes ?? 0), 0);
  const href = (slug: string) => `/knowledge/hydrogen-101/${slug}`;
  return (
    <MemberShell userId={userId} current="/member/hydrogen-101">
      <div>
        <h1 className="type-h2">Hydrogen 101</h1>
        <p className="type-body-sm text-secondary">
          Your progress through the free {chapters.length}-chapter course. Pick up where you left off.
        </p>
      </div>
      <LiveSection
        label="Hydrogen 101 progress"
        state={forcedState(sp.state) ?? (chapters.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-3 rounded-card border border-default bg-page p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} kind="table-row" />
            ))}
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="The course is being written">Chapters appear here as they are published.</EmptyState>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <section className="flex flex-wrap items-center gap-6 rounded-card border border-default bg-page p-5 md:p-6">
            <div className="flex min-w-60 flex-1 flex-col gap-2">
              <h2 className="type-h3">
                {s.done} of {s.total} chapters done
              </h2>
              <div
                role="progressbar"
                aria-label="Chapters done"
                aria-valuemin={0}
                aria-valuemax={s.total}
                aria-valuenow={s.done}
                className="h-1.5 overflow-hidden rounded-pill bg-subtle"
              >
                <div
                  className="h-full rounded-pill bg-accent"
                  style={{ width: `${String(s.total ? (s.done / s.total) * 100 : 0)}%` }}
                />
              </div>
              <p className="type-caption text-secondary">
                {current && currentRow
                  ? `Chapter ${String(current.order)}, ${current.title.split(":")[0] ?? current.title}, is in progress. `
                  : ""}
                {s.lastStudied ? `Last studied ${formatIstDate(s.lastStudied)}.` : "You haven't started yet."}
              </p>
            </div>
            <div>
              <p className="type-caption text-secondary">Time spent</p>
              <p className="type-h3">{s.minutes} min</p>
            </div>
            <div>
              <p className="type-caption text-secondary">Quiz average</p>
              <p className="type-h3">{s.quizAverage === null ? "—" : `${String(s.quizAverage)}%`}</p>
            </div>
            {current ? (
              <Link href={href(current.slug)} className={buttonClasses({ size: "lg" })}>
                {currentRow ? "Continue" : "Start"} chapter {current.order}
              </Link>
            ) : null}
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5 md:p-6">
            <div>
              <h2 className="type-h3">Chapters</h2>
              <p className="type-body-sm text-secondary">
                About {totalMinutes} minutes in all. Each chapter ends with a short quiz.
              </p>
            </div>
            <div tabIndex={0} role="region" aria-label="Chapters" className="relative overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-subtle text-left type-caption text-secondary">
                    <th scope="col" className="px-3 py-2">
                      #
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Chapter
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Length
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Your time
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Quiz
                    </th>
                    <th scope="col" className="px-3 py-2">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((c) => {
                    const r = row(c.id);
                    const answers = Object.values(r?.quiz ?? {});
                    const status = r?.status === "done" ? "Done" : r ? "In progress" : "Not started";
                    const action = r?.status === "done" ? "Review" : r ? "Continue" : "Start";
                    return (
                      <tr key={c.id} className="border-b border-default last:border-0">
                        <td className="px-3 py-3.5 type-spec text-secondary">{String(c.order).padStart(2, "0")}</td>
                        <th scope="row" className="px-3 py-3.5 text-left type-label text-primary">
                          {c.title}
                        </th>
                        <td className="px-3 py-3.5">
                          <StatusBadge
                            status={status}
                            tone={status === "Done" ? "success" : status === "In progress" ? "progress" : "neutral"}
                          />
                        </td>
                        <td className="px-3 py-3.5 type-body-sm">
                          {c.readingMinutes ? `${String(c.readingMinutes)} min` : "—"}
                        </td>
                        <td className="px-3 py-3.5 type-body-sm">
                          {r?.secondsSpent ? `${String(Math.max(1, Math.round(r.secondsSpent / 60)))} min` : "—"}
                        </td>
                        <td className="px-3 py-3.5 type-body-sm">
                          {r?.status === "done" && answers.length
                            ? `${String(answers.filter(Boolean).length)} of ${String((c.quiz ?? []).length || answers.length)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <Link
                            href={href(c.slug)}
                            className={cx(
                              action === "Continue"
                                ? buttonClasses({ variant: "inverse", size: "sm" })
                                : "type-label text-primary hover:underline",
                            )}
                          >
                            {action}
                            <span className="sr-only"> chapter {c.order}</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </LiveSection>
      <Link href="/knowledge/hydrogen-101" className="inline-flex items-center gap-1.5 type-label text-link">
        About the course
        <Icon name="arrow-right" size={16} />
      </Link>
    </MemberShell>
  );
}
