import { Alert, buttonClasses, cx, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "@/news/client";
import { dayMonthYear } from "@/news/format";
import { allGrants, getGrant } from "@/opportunities/data";
import { Crumbs, Documents, host, memberHref, Section, wrap } from "@/opportunities/parts";
import { dayMonth, daysLeft, grantView, stepStates } from "@/opportunities/views";
import { siteViewer } from "@/server/site";

// Grant or call detail (open 463:5337, closed 463:6046; step 5.5). H2 India doesn't take applications: the call
// opens on the funder's portal. Alerts for the next call arrive with member accounts (step 7.3, A71).

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const g = await getGrant((await params).slug);
  if (!g) return { title: "Not found · H2 India" };
  return {
    title: `${g.title} · ${g.funder} · H2 India`,
    description: g.summary ?? g.amountPerProject ?? g.howToApply.slice(0, 200),
    alternates: { canonical: `/opportunities/grants/${g.slug}` },
  };
}

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

export default async function GrantPage({ params }: { params: Params }) {
  const { slug } = await params;
  const g = await getGrant(slug);
  if (!g) notFound();
  const now = new Date();
  const viewer = await siteViewer();
  const view = grantView(g, now);
  const closed = view.statusKey === "Closed" || view.statusKey === "Next round expected";
  const announced = view.statusKey === "Announced";
  const deadline = `${dayMonthYear(g.deadline)}, ${time(g.deadline)} IST`;
  const next = g.nextCallExpected?.trim();
  const alertHref = memberHref(Boolean(viewer), `/member/alerts?grant=${g.slug}`);
  const related = (await allGrants())
    .filter((x) => x.id !== g.id)
    .map((x) => grantView(x, now))
    .filter((x) => x.statusKey === "Open" || x.statusKey === "Closing soon" || x.statusKey === "Announced")
    .slice(0, 3);
  const steps = g.steps ?? [];
  const states = stepStates(steps, now);
  const verified = g.verification?.at ? dayMonthYear(g.verification.at) : null;
  const glance = [
    { label: "Funder", value: g.funderName ? `${g.funder} (${g.funderName})` : g.funder },
    ...(g.amountPerProject ? [{ label: "Amount", value: g.amountPerProject }] : []),
    ...(g.whoText || view.who.length ? [{ label: "Who can apply", value: g.whoText ?? view.who.join(", ") }] : []),
    {
      label: "Deadline",
      value: closed
        ? `Closed ${dayMonthYear(g.deadline)}${next ? ` · next call expected ${next}` : ""}`
        : announced && next
          ? `Call expected ${next}`
          : deadline,
    },
  ];

  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <div className="bg-mint">
        <div className={cx(wrap, "flex flex-col gap-3 py-8")}>
          <Crumbs
            items={[
              { label: "Opportunities", href: "/opportunities" },
              { label: "Grants & calls", href: "/opportunities/grants" },
              { label: g.title.split(":")[0] ?? g.title },
            ]}
          />
          <p className="type-eyebrow text-secondary">CALL FOR PROPOSALS · {g.funder.toUpperCase()}</p>
          <h1 className="max-w-200 type-h1 text-primary">{g.title}</h1>
          <p className="flex flex-wrap items-center gap-3">
            <StatusBadge status={view.status.label} tone={view.status.tone} />
            <span className="type-label-sm text-primary">
              {closed
                ? `Closed ${dayMonthYear(g.deadline)}${next ? ` · next call expected ${next}` : ""}`
                : announced
                  ? `Call expected ${next ?? dayMonthYear(g.deadline)}`
                  : `Proposals due ${deadline} · ${daysLeft(g.deadline, now)}`}
            </span>
          </p>
        </div>
      </div>

      <div className={cx(wrap, "flex flex-col gap-8 py-8 lg:flex-row lg:items-start lg:gap-12")}>
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-10">
          {closed ? (
            <Alert tone="success" title="This call has closed">
              {next
                ? `${g.funder} expects the next call ${next}. Set an alert and we’ll email you when the next one opens.`
                : "Set an alert and we’ll email you when the next one opens."}
            </Alert>
          ) : null}

          <section
            aria-labelledby="glance"
            className="flex flex-col gap-4 rounded-card border border-default bg-page p-5"
          >
            <h2 id="glance" className="type-h4 text-primary">
              At a glance
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {glance.map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <dt className="type-eyebrow text-secondary">{f.label}</dt>
                  <dd className="type-body-sm text-primary">{f.value}</dd>
                </div>
              ))}
              <div className="flex flex-col gap-0.5">
                <dt className="type-eyebrow text-secondary">Official call</dt>
                <dd className="type-body-sm">
                  <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    {host(g.sourceUrl)} ↗<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="type-eyebrow text-secondary">Last verified</dt>
                <dd className="type-body-sm text-primary">
                  {verified ? `${verified} by H2 India editors` : "Not yet verified"}
                </dd>
              </div>
            </dl>
          </section>

          {(g.focusAreas ?? []).length || g.focusNote ? (
            <Section id="themes" title="Themes">
              {(g.focusAreas ?? []).length ? (
                <ul className="flex flex-wrap gap-2">
                  {(g.focusAreas ?? []).map((t) => (
                    <li
                      key={t}
                      className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-2.75 type-label text-primary"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              ) : null}
              {g.focusNote ? <p className="type-body-sm text-body">{g.focusNote}</p> : null}
            </Section>
          ) : null}

          <Section id="apply" title="How to apply">
            {steps.length ? (
              <ol className="flex flex-col gap-3">
                {steps.map((s, i) => {
                  const st = states[i];
                  return (
                    <li key={s.id ?? s.step} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={cx(
                          "flex size-6 shrink-0 items-center justify-center rounded-pill type-label-sm",
                          st === "done" && "bg-accent text-primary",
                          st === "current" && "bg-inverse text-inverse",
                          st === "next" && "border border-control text-secondary",
                        )}
                      >
                        {st === "done" ? <Icon name="check" size={14} /> : i + 1}
                      </span>
                      <span
                        className={cx(
                          "type-body-sm",
                          st === "next" ? "text-secondary" : "text-primary",
                          st === "current" && "type-label",
                        )}
                      >
                        {s.step}
                        {s.at && !s.step.includes(dayMonth(s.at)) ? ` · ${dayMonthYear(s.at)}` : ""}
                        <span className="sr-only">
                          {st === "done" ? " (done)" : st === "current" ? " (current step)" : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            <p className="type-body-sm text-body">{g.howToApply}</p>
          </Section>

          {(g.documents ?? []).length ? (
            <Section id="documents" title="Documents">
              <Documents items={g.documents ?? []} />
            </Section>
          ) : null}

          {(g.pastAwardees ?? []).length ? (
            <Section id="awardees" title={`Past awardees${g.pastCallLabel ? ` · ${g.pastCallLabel}` : ""}`}>
              <div className="overflow-x-auto rounded-card border border-default">
                <table className="w-full min-w-150 text-left">
                  <thead className="bg-subtle type-label-sm text-secondary">
                    <tr>
                      {["Institution", "Project", "Grant"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="type-body-sm text-primary">
                    {(g.pastAwardees ?? []).map((a) => (
                      <tr key={a.id ?? a.name} className="border-t border-default">
                        <td className="px-4 py-3">{a.name}</td>
                        <td className="px-4 py-3">{a.project}</td>
                        <td className="px-4 py-3 type-spec whitespace-nowrap">{a.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ) : null}

          <Alert tone="success" title="Check the official call before you apply">
            This page summarises the funder’s notice. It is not legal or financial advice, and rules can change.
          </Alert>
        </div>

        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section aria-labelledby="act" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
            {closed ? (
              <>
                <h2 id="act" className="type-h4 text-primary">
                  Get the next call
                </h2>
                <p className="type-body-sm text-body">
                  We’ll email you when {g.funder} opens the next call, and when this round’s results are out.
                </p>
                <Link href={alertHref} className={cx(buttonClasses({ variant: "primary" }), "w-full")}>
                  Set alert for the next call
                </Link>
                {g.pastCallUrl ? (
                  <a
                    href={g.pastCallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cx(buttonClasses({ variant: "outline" }), "w-full")}
                  >
                    View past call ↗<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </>
            ) : (
              <>
                <h2 id="act" className="type-h4 text-primary">
                  Apply on the {g.funder} portal
                </h2>
                <p className="type-body-sm text-body">
                  H2 India does not take applications. We link to the official call and remind you before it closes.
                </p>
                <a
                  href={g.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cx(buttonClasses({ variant: "primary" }), "w-full")}
                >
                  Open official call ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <Link href={alertHref} className={cx(buttonClasses({ variant: "outline" }), "w-full")}>
                  Set alert for {g.funder} calls
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 type-label-sm text-secondary">
              Share <ShareButton title={g.title} />
            </div>
          </section>
          {related.length ? (
            <section
              aria-labelledby="related"
              className="flex flex-col gap-3 rounded-card border border-default bg-page p-5"
            >
              <h2 id="related" className="type-h4 text-primary">
                Related calls
              </h2>
              <ul className="flex flex-col">
                {related.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 border-b border-default py-2 last:border-b-0"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="type-eyebrow text-secondary">CALL · {r.funder.toUpperCase()}</span>
                      <Link href={r.href} className="type-label-sm text-primary hover:underline">
                        {r.title.split(":")[0]}
                      </Link>
                    </span>
                    <StatusBadge
                      status={r.statusKey === "Announced" ? "Announced" : `Due ${dayMonth(r.deadlineAt)}`}
                      tone="success"
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
