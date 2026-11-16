import type { Metadata } from "next";
import Link from "next/link";
import { cx } from "@h2india/ui";
import { siteViewer } from "@/server/site";
import { main, PageHead, wrap } from "@/trust/parts";

// Sitemap (742:1338): every section of H2 India in one place, as drawn. The machine sitemap is /sitemap.xml.
// The Directory group shows only to signed-in people (public QC, 16 Nov 2026).

export const metadata: Metadata = {
  title: "Sitemap · H2 India",
  description: "Every section of H2 India in one place.",
  alternates: { canonical: "/sitemap" },
};

const GROUPS: { title: string; links: [string, string][] }[] = [
  {
    title: "Marketplace",
    links: [
      ["Marketplace home", "/marketplace"],
      ["Components", "/marketplace/components"],
      ["Equipment", "/marketplace/equipment"],
      ["Systems", "/marketplace/systems"],
      ["Services", "/marketplace/services"],
      ["Materials", "/marketplace/materials"],
      ["Browse by application", "/marketplace/applications"],
      ["Compare", "/marketplace/compare"],
      ["Request a quote", "/rfq/new"],
    ],
  },
  {
    title: "Directory",
    links: [
      ["Companies", "/directory/companies"],
      ["Start-up spotlight", "/directory/companies?type=startup"],
      ["Associations and bodies", "/directory/associations"],
      ["People", "/directory/people"],
      ["Ecosystem map", "/directory/map"],
      ["List your company", "/join/supplier"],
    ],
  },
  {
    title: "News and insights",
    links: [
      ["Latest news", "/news"],
      ["Insights", "/knowledge/insights"],
      ["India H₂ Weekly", "/newsletter"],
      ["Press releases", "/news/press-releases"],
      ["Submit a press release", "/news/submit"],
    ],
  },
  {
    title: "Opportunities",
    links: [
      ["Schemes", "/opportunities/schemes"],
      ["Tenders", "/opportunities/tenders"],
      ["Tender results", "/opportunities/tenders/results"],
      ["Grants and calls", "/opportunities/grants"],
      ["Jobs", "/opportunities/jobs"],
      ["Post a job", "/opportunities/jobs/post"],
      ["Scheme eligibility checker", "/opportunities/eligibility"],
    ],
  },
  {
    title: "Knowledge",
    links: [
      ["Hydrogen 101", "/knowledge/hydrogen-101"],
      ["Buyer's guides", "/knowledge/guides"],
      ["Glossary", "/knowledge/glossary"],
      ["Standards and regulations", "/knowledge/standards"],
      ["Reports", "/knowledge/reports"],
      ["Videos and podcasts", "/knowledge/media"],
      ["India Hydrogen Tracker", "/tracker"],
    ],
  },
  {
    title: "Events",
    links: [
      ["Upcoming events", "/events"],
      ["Webinars", "/events/webinars"],
      ["Training and courses", "/events/training"],
      ["Event coverage", "/events/past"],
      ["Submit an event", "/events/submit"],
    ],
  },
  {
    title: "For business",
    links: [
      ["For buyers", "/for-buyers"],
      ["For members", "/for-members"],
      ["For suppliers", "/for-suppliers"],
      ["Pricing", "/pricing"],
      ["Verification criteria", "/verification"],
      ["Advertise and sponsor", "/advertise"],
      ["Media kit", "/media-kit"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Mission", "/about/mission"],
      ["Team and advisors", "/about/team"],
      ["Careers", "/careers"],
      ["Contact", "/contact"],
      ["Partnership enquiry", "/contact/partnerships"],
      ["Help centre", "/help"],
    ],
  },
  {
    title: "Trust and legal",
    links: [
      ["Terms", "/legal/terms"],
      ["Privacy", "/legal/privacy"],
      ["Cookies", "/legal/cookies"],
      ["Editorial policy", "/legal/editorial-policy"],
      ["Corrections", "/legal/corrections"],
      ["Sponsored content policy", "/legal/sponsored-content"],
      ["Grievance officer", "/legal/grievance-officer"],
      ["Cookie preferences", "/legal/cookies#preferences"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Buyer sign in", "/buyer/sign-in"],
      ["Supplier sign in", "/supplier/sign-in"],
      ["Member sign in", "/member/sign-in"],
      ["Create a buyer account", "/join/buyer"],
      ["Create a supplier account", "/join/supplier"],
      ["Join as a member", "/join/member"],
      ["Forgot access", "/forgot-access"],
    ],
  },
];

export default async function SitemapPage() {
  const groups = (await siteViewer()) ? GROUPS : GROUPS.filter((g) => g.title !== "Directory");
  return (
    <main id="main" className={main}>
      <PageHead
        crumbs={[{ label: "Company", href: "/about" }, { label: "Sitemap" }]}
        title="Sitemap"
        lead="Every section of H2 India in one place."
      />
      <div className={cx(wrap, "grid grid-cols-2 gap-x-6 gap-y-10 pt-8 md:grid-cols-3 lg:grid-cols-5")}>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title} className="flex flex-col gap-2">
            <h2 className="type-eyebrow text-secondary">{g.title}</h2>
            {g.links.map(([label, href]) => (
              <Link key={href} href={href} className="type-body-sm text-link hover:underline">
                {label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
    </main>
  );
}
