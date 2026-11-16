import type { Metadata } from "next";
import Link from "next/link";
import { cx } from "@h2india/ui";
import { trustDetails } from "@/trust/data";
import { PartnershipForm } from "@/trust/forms";
import { card, main, PageHead, wrap } from "@/trust/parts";

// Partner with H2 Economy (742:8, errors as drawn, sent 742:516). Proposals go to the Submissions queue (PE-).

export const metadata: Metadata = {
  title: "Partner with H2 Economy",
  description:
    "Industry bodies, event organisers, researchers, state agencies, universities and media: tell us what you have in mind.",
  alternates: { canonical: "/contact/partnerships" },
};
export const dynamic = "force-dynamic";

export default async function PartnershipPage() {
  const t = await trustDetails();
  const reader = t.partnerships.name ? `${t.partnerships.name}, ${t.partnerships.role},` : `Our ${t.partnerships.role}`;
  return (
    <main id="main" className={main}>
      <PageHead
        crumbs={[{ label: "Company", href: "/about" }, { label: "Partnership enquiry" }]}
        title="Partner with H2 Economy"
        lead="Industry bodies, event organisers, researchers, state agencies, universities and media: tell us what you have in mind. We reply within 3 working days."
      />
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        <PartnershipForm />
        <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
          <section aria-labelledby="next" className={cx(card, "flex flex-col gap-3 p-5")}>
            <h2 id="next" className="type-h4 text-primary">
              What happens next
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-4 type-body-sm text-body">
              <li>{reader} reads every proposal.</li>
              <li>We reply within 3 working days, yes or no.</li>
              <li>If it fits, we set up a call and agree a written plan.</li>
            </ol>
          </section>
          <section aria-labelledby="ads" className="flex flex-col gap-1 rounded-card bg-subtle p-5">
            <h2 id="ads" className="type-label text-primary">
              Advertising instead?
            </h2>
            <p className="type-body-sm text-body">Paid placements go through Advertise and sponsor.</p>
            <Link href="/advertise" className="type-label-sm text-link">
              Advertise and sponsor
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
