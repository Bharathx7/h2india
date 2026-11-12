import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses, cx, EmptyState, Icon } from "@h2india/ui";
import { openRoles } from "@/trust/data";
import { card, main, PageHead, wrap } from "@/trust/parts";
import { memberHref } from "@/opportunities/parts";
import { getSession } from "@/server/auth";

// Careers (742:826, no open roles 742:1156). Roles are H2 India's own posts on the jobs board, so they're listed in
// both places. Get job alerts goes to member alerts (A71).

export const metadata: Metadata = {
  title: "Careers · H2 India",
  description: "Help build the place India's hydrogen industry goes to for products, people and facts.",
  alternates: { canonical: "/careers" },
};
export const dynamic = "force-dynamic";

const HOW_WE_WORK = [
  ["Facts first", "We source and date everything, and fix mistakes in the open."],
  ["Small team, real ownership", "Everyone talks to buyers, suppliers or readers every week."],
  ["Learning budget", "Courses, conferences and site visits to plants and stations."],
] as const;

const HOW_TO_APPLY = [
  "Apply on the role page with your CV and a short note.",
  "A 30-minute call with the hiring manager.",
  "A small paid task, then a final conversation.",
  "We reply to every applicant within 10 working days.",
];

export default async function CareersPage() {
  const [roles, session] = await Promise.all([openRoles(), getSession().catch(() => null)]);
  const alerts = memberHref(Boolean(session), "/member/alerts?type=jobs&company=h2-india");
  return (
    <main id="main" className={main}>
      <PageHead
        crumbs={[{ label: "Company", href: "/about" }, { label: "Careers" }]}
        title="Work at H2 India"
        lead="Help build the place India's hydrogen industry goes to for products, people and facts."
        aside={
          <Link href={alerts} className={cx(buttonClasses({ variant: "outline" }), "shrink-0")}>
            <Icon name="mail" size={16} /> Get job alerts
          </Link>
        }
      />
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section aria-labelledby="roles" className={cx(card, "flex flex-col p-5")}>
            <h2 id="roles" className="type-h4 text-primary">
              Open roles{roles.length ? ` · ${String(roles.length)}` : ""}
            </h2>
            {roles.length ? (
              <>
                <p className="pb-3 type-caption text-secondary">Listed on the H2 India jobs board too.</p>
                <ul className="flex flex-col divide-y divide-default border-t border-default">
                  {roles.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex flex-col gap-0.5">
                        <Link href={r.href} className="type-label text-link hover:underline">
                          {r.role}
                        </Link>
                        <span className="type-body-sm text-body">
                          {[r.where, r.experience].filter(Boolean).join(" · ")}
                        </span>
                        <span className="type-caption text-secondary">{r.dates}</span>
                      </span>
                      <Link href={r.href} className={cx(buttonClasses({ variant: "outline", size: "sm" }), "shrink-0")}>
                        View and apply<span className="sr-only">: {r.role}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                icon="package"
                title="No open roles right now"
                action={
                  <Link href={alerts} className={buttonClasses({ size: "sm" })}>
                    Set a job alert
                  </Link>
                }
              >
                We post every role on the H2 India jobs board. Set a job alert and we&apos;ll tell you when we&apos;re
                hiring.
              </EmptyState>
            )}
          </section>
          <section aria-labelledby="how-we-work" className={cx(card, "flex flex-col p-5")}>
            <h2 id="how-we-work" className="pb-3 type-h4 text-primary">
              How we work
            </h2>
            <dl className="flex flex-col divide-y divide-default border-t border-default">
              {HOW_WE_WORK.map(([t, d]) => (
                <div key={t} className="flex flex-col gap-0.5 py-3">
                  <dt className="type-label text-primary">{t}</dt>
                  <dd className="type-body-sm text-body">{d}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <aside className="lg:w-80 lg:shrink-0">
          <section aria-labelledby="apply" className={cx(card, "flex flex-col gap-3 p-5")}>
            <h2 id="apply" className="type-h4 text-primary">
              How to apply
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-4 type-body-sm text-body">
              {HOW_TO_APPLY.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
