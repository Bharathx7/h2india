import type { Metadata } from "next";
import { CLOCKS, type Duration } from "@h2india/config/clocks";
import { cx } from "@h2india/ui";
import { trustDetails } from "@/trust/data";
import { GrievanceForm, GrievanceLookup } from "@/trust/forms";
import { card, main, PageHead, Value, wrap } from "@/trust/parts";

// Grievance officer (519:8, ticket 519:538, status 519:588). The officer's name and contact are M2 and show as
// placeholders until entered. The timelines are the clocks (A24). ?type= and ?page= pre-fill the form (Report a
// listing); ?ticket= pre-fills Check a complaint (the link in the acknowledgement email).

export const metadata: Metadata = {
  title: "Grievance officer · H2 India",
  description:
    "Raise a complaint about content, a listing, privacy or a payment on H2 India. Every complaint gets a ticket number you can track.",
  alternates: { canonical: "/legal/grievance-officer" },
};
export const dynamic = "force-dynamic";

const duration = (d: Duration) =>
  "hours" in d
    ? `${String(d.hours)} hours`
    : "days" in d
      ? `${String(d.days)} days`
      : `${String(d.workingDays)} working days`;

export default async function GrievanceOfficerPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string; ticket?: string }>;
}) {
  const sp = await searchParams;
  const t = await trustDetails();
  const ack = duration(CLOCKS.grievanceAcknowledge.duration);
  const resolve = duration(CLOCKS.grievanceResolve.duration);
  const page = sp.page && /^https?:\/\//.test(sp.page) ? sp.page.slice(0, 500) : "";
  return (
    <main id="main" className={cx(main, "bg-page")}>
      <PageHead
        title="Grievance officer"
        lead="Raise a complaint about content, a listing, privacy or a payment on H2 India. Every complaint gets a ticket number you can track."
      />
      <div className={cx(wrap, "flex flex-col gap-6 pt-8 lg:flex-row lg:items-start")}>
        <GrievanceForm type={sp.type ?? ""} page={page} />
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section aria-labelledby="officer" className={cx(card, "flex flex-col gap-2 p-5")}>
            <h2 id="officer" className="type-h4 text-primary">
              Grievance officer
            </h2>
            <dl className="flex flex-col gap-2">
              {[
                ["Name", t.officer.name],
                ["Designation", t.officer.designation],
                ["Email", t.officer.email],
                ["Address", t.registeredOffice],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="type-eyebrow text-secondary">{k}</dt>
                  <dd className="type-body-sm text-primary">
                    <Value>{v ?? ""}</Value>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="timelines" className={cx(card, "flex flex-col gap-2 p-5")}>
            <h2 id="timelines" className="type-h4 text-primary">
              Our timelines
            </h2>
            <p className="flex items-baseline gap-3">
              <span className="type-h4 whitespace-nowrap text-primary">{ack}</span>
              <span className="type-caption text-secondary">to acknowledge your complaint</span>
            </p>
            <p className="flex items-baseline gap-3">
              <span className="type-h4 whitespace-nowrap text-primary">{resolve}</span>
              <span className="type-caption text-secondary">to resolve it and tell you the outcome</span>
            </p>
          </section>
          <div id="check" className="scroll-mt-24">
            <GrievanceLookup ticket={sp.ticket ?? ""} />
          </div>
        </aside>
      </div>
    </main>
  );
}
