import { buttonClasses, cx, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { wrap } from "@/opportunities/parts";
import { currentPoster, ownJobPost } from "@/opportunities/posting";

// Job submitted (468:8311, step 5.5). The paid Featured offer drawn under the card is left out: Featured is an
// editors' choice for now (A69).

export const metadata: Metadata = { title: "Job submitted for review · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JobSubmitted({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const poster = await currentPoster();
  if (!poster) redirect("/sign-in?next=/opportunities/jobs/post");
  const job = id ? await ownJobPost(poster, Number(id)) : null;
  if (!job || job.post?.state !== "Submitted for review") notFound();
  return (
    <main id="main" className="min-h-[70vh] bg-subtle py-16">
      <div className={cx(wrap, "flex justify-center")}>
        <section
          aria-labelledby="done"
          className="flex w-full max-w-100 flex-col items-center gap-4 rounded-card border border-default bg-page p-8 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-pill bg-mint text-icon-primary">
            <Icon name="check-circle" size={24} />
          </span>
          <h1 id="done" className="type-h2 text-primary">
            Job submitted for review
          </h1>
          <p className="type-body text-body">We’ll check it within 1 working day and email you when it’s live.</p>
          {job.post.reference ? <p className="type-spec text-secondary">{job.post.reference}</p> : null}
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/opportunities/jobs/post#mine" className={buttonClasses({ variant: "primary" })}>
              View my jobs
            </Link>
            <Link href="/opportunities/jobs/post" className={buttonClasses({ variant: "outline" })}>
              Post another job
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
