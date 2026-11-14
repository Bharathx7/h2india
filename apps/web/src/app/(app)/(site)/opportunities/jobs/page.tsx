import { EXPERIENCE_FILTERS, JOB_FUNCTIONS, WORK_MODES } from "@h2india/core/opportunities/rules";
import { buttonClasses, cx, EmptyState } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { forcedState } from "@/lib/dev-state";
import { allJobs } from "@/opportunities/data";
import { ListFilters, SortBy, type FilterGroupSpec } from "@/opportunities/filters";
import { CardsLoading, Crumbs, JobCards, LoadError, memberHref, wrap } from "@/opportunities/parts";
import { filterJobs, jobView, sortJobs, stateLabel } from "@/opportunities/views";
import { siteViewer } from "@/server/site";

// Hydrogen jobs (464:6071, step 5.5). Live jobs only; featured jobs (set by editors, A69) come first. Companies post
// jobs for free and an editor checks each one before it shows (A68). Job alerts arrive in step 7.3 (A71).

export const metadata: Metadata = {
  title: "Hydrogen jobs in India · H2 India",
  description: "Open roles at hydrogen companies, labs and agencies in India.",
  alternates: { canonical: "/opportunities/jobs" },
};
export const dynamic = "force-dynamic";

const PAGE = 6;

type Params = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => all(v)[0] ?? "";

function queryOf(params: Params, change: Record<string, string | null> = {}): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (k !== "view" && !(k in change)) for (const x of all(v)) q.append(k, x);
  for (const [k, v] of Object.entries(change)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const forced = forcedState(one(params.view));
  const loading = (
    <Shell live={null} signedIn={false}>
      <CardsLoading label="Loading jobs" />
    </Shell>
  );
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      {forced === "loading" ? (
        loading
      ) : (
        <Suspense fallback={loading}>
          <List params={params} forced={forced} />
        </Suspense>
      )}
    </main>
  );
}

function Shell({ live, signedIn, children }: { live: number | null; signedIn: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className={cx(wrap, "flex flex-col gap-3 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Opportunities", href: "/opportunities" }, { label: "Jobs" }]} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="type-h1 text-primary">Hydrogen jobs in India</h1>
            {live !== null ? (
              <p className="type-body text-body">{live} open roles at hydrogen companies, labs and agencies</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/opportunities/jobs/post" className={buttonClasses({ variant: "outline", size: "lg" })}>
              Post a job
            </Link>
            <Link
              href={memberHref(signedIn, "/member/alerts?type=jobs")}
              className={buttonClasses({ variant: "primary", size: "lg" })}
            >
              Create job alert
            </Link>
          </div>
        </div>
      </div>
      <div id="list" className={cx(wrap, "scroll-mt-24 pb-16 pt-4")}>
        {children}
      </div>
    </>
  );
}

async function List({ params, forced }: { params: Params; forced: ReturnType<typeof forcedState> }) {
  const viewer = await siteViewer();
  const signedIn = Boolean(viewer);
  let jobs;
  try {
    if (forced === "error") throw new Error("Forced error (?view=error)");
    jobs = await allJobs();
  } catch (error) {
    console.error("[jobs] list failed", error);
    return (
      <Shell live={null} signedIn={signedIn}>
        <LoadError what="jobs" retry={`/opportunities/jobs${queryOf(params)}`} />
      </Shell>
    );
  }
  const now = new Date();
  const views = jobs.map((j) => jobView(j, now));
  const live = views.filter((j) => j.status === "Live");
  let list = sortJobs(
    filterJobs(views, {
      students: one(params.students) === "1",
      functions: all(params.function),
      location: one(params.location),
      modes: all(params.mode),
      experience: one(params.experience),
    }),
    one(params.sort),
  );
  if (forced === "empty") list = [];
  const show = Math.max(PAGE, Math.floor(Number(one(params.show))) || PAGE);
  const locations = [...new Set(live.flatMap((j) => j.states))].sort().map((v) => ({ value: v, label: stateLabel(v) }));
  const groups: FilterGroupSpec[] = [
    { kind: "toggle", name: "students", title: "Students and interns", label: "Internships and graduate roles" },
    {
      kind: "checks",
      name: "function",
      title: "Function",
      options: JOB_FUNCTIONS.map((v) => ({ value: v, label: v })),
    },
    { kind: "select", name: "location", title: "Location", placeholder: "Any location", options: locations },
    { kind: "checks", name: "mode", title: "Work mode", options: WORK_MODES.map((v) => ({ value: v, label: v })) },
    {
      kind: "radio",
      name: "experience",
      title: "Experience",
      options: EXPERIENCE_FILTERS.map((e) => ({ value: e.value, label: e.label })),
    },
  ];

  return (
    <Shell live={live.length} signedIn={signedIn}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:w-60 lg:shrink-0">
          <ListFilters groups={groups} count={list.length} noun="jobs" keep={["sort"]} />
        </div>
        <section aria-label="Jobs" className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="type-label text-primary" role="status">
              {list.length} {list.length === 1 ? "job" : "jobs"}
            </p>
            <SortBy
              options={[
                { value: "", label: "Newest first" },
                { value: "closing", label: "Closing soonest" },
              ]}
            />
          </div>
          {list.length ? (
            <>
              <JobCards items={list.slice(0, show)} />
              {list.length > show ? (
                <Link
                  href={`/opportunities/jobs${queryOf(params, { show: String(show + PAGE) })}#list`}
                  scroll={false}
                  className={cx(buttonClasses({ variant: "outline" }), "w-full")}
                >
                  Show more jobs
                </Link>
              ) : null}
            </>
          ) : (
            <div className="rounded-card border border-default bg-page py-8">
              <EmptyState
                kind={live.length ? "no-results" : "first-use"}
                title={live.length ? "No jobs match these filters" : "No open jobs right now"}
                action={
                  live.length ? (
                    <Link href="/opportunities/jobs#list" className={buttonClasses({ variant: "outline" })}>
                      Clear all filters
                    </Link>
                  ) : undefined
                }
              >
                {live.length ? "Try removing a filter." : "Create a job alert and we’ll tell you when one is posted."}
              </EmptyState>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-subtle p-5">
            <div className="flex flex-col gap-1">
              <h2 className="type-label-lg text-primary">Hiring for a hydrogen role?</h2>
              <p className="type-body-sm text-body">
                Verified companies post jobs for free. We review each job within 1 working day.
              </p>
            </div>
            <Link href="/opportunities/jobs/post" className={buttonClasses({ variant: "primary", size: "sm" })}>
              Post a job
            </Link>
          </div>
        </section>
      </div>
    </Shell>
  );
}
