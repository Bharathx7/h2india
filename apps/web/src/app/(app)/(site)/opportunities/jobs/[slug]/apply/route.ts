import { getDb } from "@h2india/core";
import { recordApplication } from "@h2india/core/members";
import { getJob } from "@/opportunities/data";
import { getSession } from "@/server/auth";

// GET /opportunities/jobs/<slug>/apply (step 7.5, A70): "Apply on company site". A signed-in member's click is added to
// Job applications (725:1038: "We add a job here when you click Apply"); then everyone goes on to the employer's page.
// Nothing about the member is sent to the employer.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const job = await getJob((await params).slug);
  if (!job) return new Response("Not found", { status: 404 });
  const session = await getSession().catch(() => null);
  if (session) {
    await recordApplication(getDb(), session.user.id, {
      slug: job.slug,
      role: job.role,
      company: job.company,
      location: [job.location, job.workMode].filter(Boolean).join(" · "),
      closesAt: job.closesAt ? new Date(job.closesAt) : null,
    });
  }
  return Response.redirect(job.sourceUrl, 302);
}
