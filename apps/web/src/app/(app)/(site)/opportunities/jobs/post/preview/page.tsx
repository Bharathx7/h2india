import { buttonClasses, cx } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { companiesBySlug } from "@/opportunities/data";
import { JobPage } from "@/opportunities/job";
import { wrap } from "@/opportunities/parts";
import { currentPoster, ownJobPost } from "@/opportunities/posting";
import { SubmitButton } from "../SubmitButton";

// Preview a job before submitting it (468:7854, step 5.5): the job page exactly as readers will see it, under a bar
// that says it isn't published. Only people in the posting company can open it.

export const metadata: Metadata = { title: "Preview your job · H2 India", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PreviewJob({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const poster = await currentPoster();
  if (!poster) redirect(`/sign-in?next=${encodeURIComponent(`/opportunities/jobs/post/preview?id=${id ?? ""}`)}`);
  const job = id ? await ownJobPost(poster, Number(id)) : null;
  if (!job) notFound();
  const company = job.companySlug ? (await companiesBySlug([job.companySlug])).get(job.companySlug) : undefined;
  const submitted = job.post?.state === "Submitted for review";
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="sticky top-0 z-20 border-b border-default bg-subtle">
        <div className={cx(wrap, "flex flex-wrap items-center justify-between gap-3 py-3")}>
          <div className="flex flex-col">
            <p className="type-label text-primary">
              {submitted ? "Waiting for review: not published yet" : "Preview: not published yet"}
            </p>
            <p className="type-caption text-secondary">
              {submitted
                ? "We’ll email you when it’s live. You can still change it."
                : "Check how your job will look, then submit it for review."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Link
              href={`/opportunities/jobs/post?id=${String(job.id)}`}
              className={buttonClasses({ variant: "outline" })}
            >
              Edit job
            </Link>
            {submitted ? null : <SubmitButton id={job.id} />}
          </div>
        </div>
      </div>
      <JobPage job={job} mode="preview" company={company} similar={[]} saveHref="#" alertHref="#" />
    </main>
  );
}
