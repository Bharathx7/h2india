import { Icon, Logo, type IconName } from "@h2india/ui";
import { EARLY_LISTING_CONSENT } from "@/cms/home/collections";
import { EarlyListingForm, NewsletterSignup } from "./ComingSoonForms";

// Coming soon · pre-launch (743:6871; phones 743:7095; newsletter states 743:7293). Shown to everyone while the
// comingSoon flag is on, except signed-in operators and the allow-list (A44). The launch line is a Super admin setting
// (A48); the latest-issue preview waits for real issues (step 11.3), so that column is left out until then.

const TEASERS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "package",
    title: "Marketplace",
    text: "Hydrogen products from verified Indian and global suppliers, with spec filters and quote requests.",
  },
  {
    icon: "file-text",
    title: "News and schemes",
    text: "Daily India-first hydrogen news, and every central and state scheme in plain language.",
  },
  {
    icon: "calendar",
    title: "Opportunities",
    text: "SECI and PSU tenders, grants, calls and jobs, with alerts so you never miss a deadline.",
  },
];

const wrap = "mx-auto w-full max-w-300 px-4 md:px-6 xl:px-0";

export function ComingSoon({ launchLine }: { launchLine: string }) {
  const year = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" }).format(new Date());
  return (
    <div className="flex min-h-screen flex-col bg-page" data-testid="coming-soon">
      <header className={`${wrap} flex items-center justify-between gap-6 py-4 md:py-6`}>
        <Logo height={36} />
        <p className="hidden type-caption text-secondary md:block">{launchLine}</p>
      </header>
      <main id="main" className="flex-1">
        <section aria-labelledby="coming-soon-title" className="bg-mint">
          <div className={`${wrap} flex flex-col gap-6 py-8 md:flex-row md:items-start md:gap-12 md:py-20`}>
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <p className="type-eyebrow text-secondary">Coming soon</p>
              <h1 id="coming-soon-title" className="type-h2 text-primary">
                India&rsquo;s hydrogen ecosystem platform is coming
              </h1>
              <p className="type-body text-body">Products, companies, news, schemes and tenders, in one place.</p>
            </div>
            <div className="flex flex-col gap-3 rounded-card bg-page p-6 md:w-120 md:shrink-0">
              <h2 className="type-h4 text-primary">Get India H₂ Weekly</h2>
              <p className="type-body-sm text-body">
                Indian hydrogen news, tenders and scheme deadlines, every Monday. Pick what you want more of:
              </p>
              <NewsletterSignup />
            </div>
          </div>
        </section>
        <div className={`${wrap} grid gap-4 pt-8 md:grid-cols-3 md:gap-6 md:pt-16`}>
          {TEASERS.map((t) => (
            <div key={t.title} className="flex flex-col gap-2 rounded-card border border-default bg-page p-6">
              <Icon name={t.icon} size={24} className="text-icon-primary" />
              <h2 className="type-h4 text-primary">{t.title}</h2>
              <p className="type-body-sm text-body">{t.text}</p>
            </div>
          ))}
        </div>
        <div className={`${wrap} flex flex-col gap-6 pt-8 pb-12 md:flex-row md:pt-12 md:pb-16`}>
          <section
            aria-labelledby="early-title"
            className="flex flex-1 flex-col gap-4 rounded-card border border-default bg-page p-6"
          >
            <h2 id="early-title" className="type-h4 text-primary">
              Are you a supplier? Get listed early
            </h2>
            <p className="type-body-sm text-body">
              Our team will set up your company profile and first products for free before launch.
            </p>
            <EarlyListingForm consentText={EARLY_LISTING_CONSENT} />
          </section>
        </div>
      </main>
      <footer className="bg-inverse">
        <div className={`${wrap} flex flex-col gap-3 py-6 text-inverse md:flex-row md:items-center md:gap-6`}>
          <p className="flex-1 type-caption">© {year} H2 India · India&rsquo;s hydrogen ecosystem platform</p>
          <a href="/legal/privacy" className="type-label hover:underline">
            Privacy
          </a>
        </div>
      </footer>
    </div>
  );
}
