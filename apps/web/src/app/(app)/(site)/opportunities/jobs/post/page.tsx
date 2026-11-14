import { buttonClasses, cx, EmptyState, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { dayMonthYear } from "@/news/format";
import { Crumbs, wrap } from "@/opportunities/parts";
import { currentPoster, inputOf, ownJobPost, ownJobPosts } from "@/opportunities/posting";
import { JobPostForm } from "./JobPostForm";

// Post a job (467:7472, step 5.5). Free; any signed-in company user may post for their company (A68). A posted job is
// a draft until an editor publishes it, usually within 1 working day.

export const metadata: Metadata = {
  title: "Post a job · H2 India",
  description: "Free for verified companies. We review every job within 1 working day.",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const STATE_TONE = { Draft: "neutral", "Submitted for review": "progress" } as const;

export default async function PostJobPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const poster = await currentPoster();
  const id = one(params.id);
  if (!poster) redirect(`/sign-in?next=${encodeURIComponent(`/opportunities/jobs/post${id ? `?id=${id}` : ""}`)}`);
  const head = (
    <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
      <Crumbs
        items={[
          { label: "Opportunities", href: "/opportunities" },
          { label: "Jobs", href: "/opportunities/jobs" },
          { label: "Post a job" },
        ]}
      />
      <h1 className="mt-2 type-h1 text-primary">Post a job</h1>
      <p className="type-body text-body">Free for verified companies. We review every job within 1 working day.</p>
    </div>
  );

  if (!poster.companies.length) {
    return (
      <main id="main" className="min-h-screen bg-subtle pb-16">
        {head}
        <div className={cx(wrap, "pt-6")}>
          <div className="rounded-card border border-default bg-page py-8">
            <EmptyState
              kind="first-use"
              icon="building"
              title="Jobs are posted by companies"
              action={
                <Link href="/list-your-company" className={buttonClasses({ variant: "primary" })}>
                  List your company
                </Link>
              }
            >
              Join your company on H2 India, or list it, to post jobs for free.
            </EmptyState>
          </div>
        </div>
      </main>
    );
  }

  const editing = id ? await ownJobPost(poster, Number(id)) : null;
  if (id && !editing) notFound();
  const first = poster.companies[0];
  const initial = editing
    ? inputOf(editing)
    : {
        id: null,
        organisationId: first?.organisationId ?? "",
        role: "",
        function: "",
        jobType: "Full-time",
        experience: "",
        description: "",
        skills: [],
        location: [first?.city, first?.state].filter(Boolean).join(", "),
        workMode: "On site",
        showSalary: false,
        salaryFrom: "",
        salaryTo: "",
        applyBy: "link",
        careersUrl: "",
        closesOn: "",
      };
  const mine = await ownJobPosts(poster);

  return (
    <main id="main" className="min-h-screen bg-subtle pb-16 [&_:is(h1,h2,h3)]:text-wrap">
      {head}
      <div className={cx(wrap, "pt-6")}>
        <JobPostForm
          initial={initial}
          companies={poster.companies.map((c) => ({
            organisationId: c.organisationId,
            name: c.name,
            initials: c.initials,
            verified: c.verified,
          }))}
        />
      </div>
      {mine.length ? (
        <section id="mine" aria-labelledby="mine-title" className={cx(wrap, "flex scroll-mt-24 flex-col gap-4 pt-12")}>
          <h2 id="mine-title" className="type-h2 text-primary">
            Your job posts
          </h2>
          <ul className="flex flex-col rounded-card border border-default bg-page">
            {mine.map((j) => {
              const live = j._status === "published";
              const state = live ? "Live" : (j.post?.state ?? "Draft");
              return (
                <li
                  key={j.id}
                  className="flex flex-wrap items-center gap-3 border-b border-default px-4 py-3 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="type-label text-primary">{j.role}</span>
                    <span className="type-caption text-secondary">
                      {[j.post?.reference, j.company, j.closesAt ? `closes ${dayMonthYear(j.closesAt)}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <StatusBadge status={state} tone={live ? "success" : STATE_TONE[state as keyof typeof STATE_TONE]} />
                  {live ? (
                    <Link href={`/opportunities/jobs/${j.slug}`} className="type-label-sm text-link hover:underline">
                      View<span className="sr-only"> {j.role}</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/opportunities/jobs/post?id=${String(j.id)}`}
                      className="type-label-sm text-link hover:underline"
                    >
                      Edit<span className="sr-only"> {j.role}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
