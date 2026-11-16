import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_TOPICS } from "@h2india/core/events/rules";
import { cx, Icon } from "@h2india/ui";
import { trustDetails } from "@/trust/data";
import { ContactForm } from "@/trust/forms";
import { card, main, PageHead, Value, wrap } from "@/trust/parts";

// Contact us (66:4591). Messages go to the Submissions queue with a CON- reference (submitContent). Grievance links
// to its own form so the complaint gets a ticket and its clocks. ?about= picks the topic chip.

export const metadata: Metadata = {
  title: "Contact us · H2 Economy",
  description:
    "Tell us what you need and we'll route it to the right team. Most enquiries get a reply within 1 working day.",
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-dynamic";

const ABOUT: Record<string, string> = {
  buyer: "Buyer help",
  supplier: "Supplier onboarding",
  tip: "Newsroom tip",
  advertising: "Advertising",
  partnerships: "Partnerships",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const about = (await searchParams).about ?? "";
  const t = await trustDetails();
  return (
    <main id="main" className={main}>
      <PageHead
        title="Contact us"
        lead="Tell us what you need and we'll route it to the right team. Most enquiries get a reply within 1 working day."
      />
      <div className={cx(wrap, "flex flex-col gap-6 pt-8 lg:flex-row lg:items-start")}>
        <ContactForm topic={ABOUT[about] ?? (CONTACT_TOPICS.some((c) => c.value === about) ? about : "Buyer help")} />
        <aside className="flex flex-col gap-4 lg:w-88 lg:shrink-0">
          <section aria-labelledby="reply" className={cx(card, "flex flex-col gap-3 p-5")}>
            <h2 id="reply" className="type-h4 text-primary">
              When we reply
            </h2>
            <dl className="flex flex-col divide-y divide-default">
              {[
                ...CONTACT_TOPICS.map((c) => [c.value, c.reply] as const),
                ["Grievance", "Acknowledged in 24 hours"] as const,
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="type-body-sm text-body">{k}</dt>
                  <dd className="type-label-sm text-primary">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="office" className={cx(card, "flex flex-col gap-2 p-5")}>
            <h2 id="office" className="type-h4 text-primary">
              Office
            </h2>
            <p className="type-body-sm text-body">
              <Value>{t.registeredOffice}</Value>
            </p>
            <p className="type-body-sm text-body">{t.officeHours}</p>
          </section>
          <section aria-labelledby="grievance" className={cx(card, "flex flex-col gap-2 p-5")}>
            <h2 id="grievance" className="type-h4 text-primary">
              Grievance officer
            </h2>
            <p className="type-body-sm text-body">
              Complaints about content, listings, privacy or payments are acknowledged within 24 hours and resolved
              within 15 days.
            </p>
            <Link href="/legal/grievance-officer" className="inline-flex items-center gap-1 type-label-sm text-link">
              Grievance officer and complaint form <Icon name="arrow-right" size={14} />
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
