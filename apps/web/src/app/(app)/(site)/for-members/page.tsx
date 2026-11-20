import { buttonClasses, cx, Icon, Reveal, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINKS } from "@/lib/auth-links";
import { MEMBER_BENEFITS, MEMBER_JOIN_STEPS, type MemberBenefit } from "@/member/benefits";
import { Block, card, DarkCta, FeatureGrid, Hero, HeroPreview, Highlights, main, Steps, wrap } from "@/trust/parts";

// For Members, on the common audience layout (founder, 20 Nov 2026: the same hero and card sizes as For Buyers and
// For Suppliers, with the most detail here): hero with a preview of the member dashboard, alerts first, what members
// can do, why join, the member dashboard section by section, privacy, how it works and joining from a buyer or supplier
// account. Benefits come from member/benefits.ts (shared with the member sign-up page); every line names something
// the member workspace already does (Stage 7, A188). No figures, prices or claims.

export const metadata: Metadata = {
  title: "For members · H2 Economy",
  description:
    "Join H2 Economy as a member: save and follow what matters to you, get alerts for tenders, schemes and jobs, learn with Hydrogen 101 and open the directory.",
  alternates: { canonical: "/for-members" },
};

const MEMBER_JOIN_HREF = AUTH_LINKS.joinMember;
const MEMBER_SIGN_IN_HREF = AUTH_LINKS.memberSignIn;
/** A buyer or supplier switches membership on for the same account (A188); signed-out people sign in first. */
const JOIN_FROM_ACCOUNT_HREF = "/member/join";

const ALERT_KINDS = ["Tenders", "Schemes", "Grants", "Jobs"];

const byTitle = (title: string): MemberBenefit => {
  const b = MEMBER_BENEFITS.find((x) => x.title === title);
  if (!b) throw new Error(`Member benefit missing: ${title}`);
  return b;
};
const ALERTS = byTitle("Alerts that match you");
const CAN = MEMBER_BENEFITS.filter((b) => b !== ALERTS && b.title !== "Your profile, your choice");

const WHY: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "bell",
    title: "Hear first",
    text: "New tenders, schemes, grants and jobs come to you, instead of you checking every site.",
  },
  {
    icon: "folder",
    title: "One place",
    text: "What you saved, followed, registered for and learned, together on your dashboard.",
  },
  {
    icon: "lock",
    title: "Private by default",
    text: "Nobody sees you in the directory unless you turn your profile on.",
  },
];

/** The member dashboard, section by section (the member workspace's own menu). */
const DASHBOARD: { icon: IconName; title: string; text: string }[] = [
  { icon: "home", title: "Home", text: "Updates from what you follow, newest first." },
  { icon: "bell", title: "Alerts", text: "Your alerts and their filters; pause or delete any of them." },
  { icon: "heart", title: "Saved", text: "Products, news, schemes, tenders and jobs you kept." },
  { icon: "users", title: "Follows", text: "Companies, topics and states you follow." },
  { icon: "globe", title: "Directory", text: "Companies, people, start-ups and associations." },
  { icon: "file-text", title: "Hydrogen 101", text: "Chapters, quizzes and how far you have got." },
  { icon: "calendar", title: "Event registrations", text: "Your webinars and events, with links and replays." },
  { icon: "user", title: "Profile and preferences", text: "What others see, and which emails you get." },
];

export default function ForMembersPage() {
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="For members"
        title="Join H2 Economy as a member"
        lead="Keep what matters to you in one place and hear first when something changes in India's hydrogen economy."
        chips={["Engineers", "Researchers", "Students", "Anyone following hydrogen"]}
        actions={[
          { label: "Join as a member", href: MEMBER_JOIN_HREF, primary: true },
          { label: "Member sign in", href: MEMBER_SIGN_IN_HREF },
        ]}
        aside={
          <HeroPreview
            title="Your member dashboard"
            badge="Member"
            rows={[
              { icon: "bell", title: "Alerts", text: "Tenders, schemes, grants and jobs that match you" },
              { icon: "users", title: "Following", text: "Companies and topics you care about" },
              { icon: "heart", title: "Saved", text: "Everything you want to come back to" },
              { icon: "file-text", title: "Hydrogen 101", text: "Pick up where you left off" },
            ]}
          />
        }
      />

      <Reveal as="section" aria-labelledby="alerts" className={cx(wrap, "pt-12 md:pt-16")}>
        <div className="grid grid-cols-1 gap-6 rounded-feature bg-fresh-700 p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col gap-4">
            <span className="flex size-11 items-center justify-center rounded-card bg-accent text-primary">
              <Icon name={ALERTS.icon} size={22} />
            </span>
            <p className="type-label text-fresh-300">The heart of membership</p>
            <h2 id="alerts" className="type-h2 text-inverse">
              {ALERTS.title}
            </h2>
            <p className="type-body text-fresh-200">{ALERTS.text}</p>
          </div>
          <div className="flex flex-col gap-4">
            <p className="type-label text-inverse">Get an alert for</p>
            <ul aria-label="What you can get alerts for" className="flex flex-wrap gap-2">
              {ALERT_KINDS.map((k) => (
                <li
                  key={k}
                  className="rounded-pill border border-neutral-0/16 bg-neutral-0/6 px-3 py-1.5 type-label text-inverse"
                >
                  {k}
                </li>
              ))}
            </ul>
            <ol className="flex flex-col gap-2 type-body-sm text-fresh-200">
              <li>1. Choose the filters once: topics, states, kinds.</li>
              <li>2. We email you when something new matches.</li>
              <li>3. Turn any alert off from the email itself.</li>
            </ol>
          </div>
        </div>
      </Reveal>

      <Block id="what" title="What members can do" lead="Everything you keep and learn, in one account.">
        <FeatureGrid items={CAN} />
      </Block>

      <Highlights id="why" title="Why join" items={WHY} />

      <Block id="dashboard" title="Your member dashboard" lead="What you see after you sign in, section by section.">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DASHBOARD.map((d) => (
            <li key={d.title} className={cx(card, "flex h-full flex-col gap-2 p-4")}>
              <span className="flex items-center gap-2 type-label text-primary">
                <Icon name={d.icon} size={18} className="text-icon-link" />
                {d.title}
              </span>
              <span className="type-body-sm text-body">{d.text}</span>
            </li>
          ))}
        </ul>
      </Block>

      <div className={cx(wrap, "pt-12 md:pt-16")}>
        <section
          aria-labelledby="privacy"
          className={cx(card, "grid grid-cols-1 gap-4 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:px-8")}
        >
          <span className="flex size-11 items-center justify-center rounded-card bg-linear-to-b from-fresh-50 to-fresh-200 text-icon-link">
            <Icon name="shield-check" size={22} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="privacy" className="type-h4 text-primary">
              Your profile, your choice
            </h2>
            <p className="type-body-sm text-body">
              You appear in the people directory only if you turn your profile on, and only signed-in people can see it.
              Your email and phone are never shown. Download your data from your account at any time.
            </p>
          </div>
        </section>
      </div>

      <Block id="how" title="How it works" lead="Ready in about two minutes.">
        <Steps steps={MEMBER_JOIN_STEPS} />
      </Block>

      <div className={cx(wrap, "pt-12 md:pt-16")}>
        <section
          aria-labelledby="already"
          className={cx(card, "flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:px-8")}
        >
          <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-card bg-linear-to-b from-fresh-50 to-fresh-200 text-icon-link">
              <Icon name="user" size={22} />
            </span>
            <div className="flex flex-col gap-1">
              <h2 id="already" className="type-h4 text-primary">
                Already a buyer or supplier?
              </h2>
              <p className="type-body-sm text-body">
                Join as a member from the same account in one click, and keep your workspace.
              </p>
            </div>
          </div>
          <Link
            href={JOIN_FROM_ACCOUNT_HREF}
            className={cx(buttonClasses({ variant: "outline" }), "self-start md:self-auto")}
          >
            Join from your account
          </Link>
        </section>
      </div>

      <DarkCta
        eyebrow="For members"
        title="Become a member"
        text="Already a member? Sign in to your member account."
        actions={[
          { label: "Join as a member", href: MEMBER_JOIN_HREF },
          { label: "Member sign in", href: MEMBER_SIGN_IN_HREF, primary: false },
        ]}
      />
    </main>
  );
}
