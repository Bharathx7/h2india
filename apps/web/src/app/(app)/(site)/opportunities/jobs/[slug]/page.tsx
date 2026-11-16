import { parseServerEnv } from "@h2india/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allJobs, companiesBySlug, getJob } from "@/opportunities/data";
import { JobPage } from "@/opportunities/job";
import { memberHref } from "@/opportunities/parts";
import { jobPostingLd, jobView, type JobView } from "@/opportunities/views";
import { siteViewer } from "@/server/site";

// Job detail (465:6591; closed 465:7367; step 5.5). Live jobs carry JobPosting structured data; a closed job keeps its
// page (old links still work) without it, so search engines drop the listing.

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const j = await getJob((await params).slug);
  if (!j) return { title: "Not found · H2 Economy" };
  return {
    title: `${j.role} · ${j.company} · H2 Economy jobs`,
    description: j.description.slice(0, 200),
    alternates: { canonical: `/opportunities/jobs/${j.slug}` },
    ...(jobView(j).status === "Expired" ? { robots: { index: false } } : {}),
  };
}

/** Up to four live jobs, the same function first. */
function similarTo(job: JobView, all: JobView[]): JobView[] {
  return all
    .filter((j) => j.id !== job.id && j.status === "Live")
    .sort((a, b) => Number(b.function === job.function) - Number(a.function === job.function))
    .slice(0, 4);
}

export default async function JobDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const j = await getJob(slug);
  if (!j) notFound();
  const now = new Date();
  const [viewer, jobs, companies] = await Promise.all([
    siteViewer(),
    allJobs(),
    companiesBySlug([j.companySlug ?? ""]),
  ]);
  const view = jobView(j, now);
  const company = j.companySlug ? companies.get(j.companySlug) : undefined;
  const expired = view.status === "Expired";
  const site = parseServerEnv().APP_URL.replace(/\/$/, "");
  const url = `${site}/opportunities/jobs/${j.slug}`;
  const ld = expired
    ? null
    : jobPostingLd(j, url, { name: j.company, sameAs: company ? `${site}${company.href}` : null });
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      {ld ? (
        <script
          type="application/ld+json"
          // JSON.stringify output with "<" escaped cannot close the script element.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
        />
      ) : null}
      <JobPage
        job={j}
        mode={expired ? "expired" : "live"}
        company={company}
        similar={similarTo(
          view,
          jobs.map((x) => jobView(x, now)),
        )}
        saveHref={memberHref(Boolean(viewer), `/member/saved?job=${j.slug}`)}
        alertHref={memberHref(Boolean(viewer), `/member/alerts?type=jobs`)}
      />
    </main>
  );
}
