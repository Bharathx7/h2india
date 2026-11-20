import { buttonClasses, cx, Icon, Reveal, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_LINKS } from "@/lib/auth-links";
import { MEMBER_BENEFITS, MEMBER_JOIN_STEPS, type MemberBenefit } from "@/member/benefits";
import { card, DarkCta, main, Steps, wrap } from "@/trust/parts";

// For Members (public QC, 16 Nov 2026; redesigned in public QC 5, 20 Nov 2026, so the benefits sell the page). There
// is no Figma frame: it uses the trust pages' parts (dark hero, lifting cards, 3D steps, dark call to action) and the
// benefits list shared with the member sign-up page (`member/benefits.ts`), so both say the same thing. Every line
// names something the member workspace already does (Stage 7, A188); no figures, prices or claims.

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

const AUDIENCE = ["Engineers", "Researchers", "Students", "Anyone following hydrogen"];

/** The hero's preview of the member dashboard. Decorative: the benefits below say it in full. */
const PREVIEW: { icon: IconName; title: string; text: string }[] = [
  { icon: "bell", title: "Alerts", text: "Tenders, schemes, grants and jobs that match you" },
  { icon: "users", title: "Following", text: "Companies and topics you care about" },
  { icon: "heart", title: "Saved", text: "Everything you want to come back to" },
  { icon: "file-text", title: "Hydrogen 101", text: "Pick up where you left off" },
];

const ALERT_KINDS = ["Tenders", "Schemes", "Grants", "Jobs"];

const byTitle = (title: string): MemberBenefit => {
  const b = MEMBER_BENEFITS.find((x) => x.title === title);
  if (!b) throw new Error(`Member benefit missing: ${title}`);
  return b;
};
const ALERTS = byTitle("Alerts that match you");
const MAIN = ["Save for later", "Follow companies and topics", "Open the directory", "Learn with Hydrogen 101"].map(
  byTitle,
);
const ALSO = MEMBER_BENEFITS.filter((b) => b !== ALERTS && !MAIN.includes(b));

function IconTile({ icon }: { icon: IconName }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-card bg-linear-to-b from-fresh-50 to-fresh-200 text-icon-link">
      <Icon name={icon} size={22} />
    </span>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-inverse">
      <div aria-hidden="true" className="depth-deep-glow absolute -top-60 -right-40 -z-10 size-160" />
      <div className={cx(wrap, "grid grid-cols-1 gap-10 py-14 md:py-20 lg:grid-cols-[1fr_26rem] lg:items-center")}>
        <div className="flex flex-col gap-5">
          <p className="type-label text-fresh-300">For members</p>
          <h1 className="max-w-200 type-h1 text-inverse md:type-display">Join H2 Economy as a member</h1>
          <p className="max-w-160 type-body text-neutral-0/80 md:type-body-lg">
            Keep what matters to you in one place and hear first when something changes in India&apos;s hydrogen
            economy.
          </p>
          <ul aria-label="Who it's for" className="flex flex-wrap gap-2">
            {AUDIENCE.map((a) => (
              <li
                key={a}
                className="rounded-pill border border-neutral-0/16 bg-neutral-0/6 px-3 py-1 type-label-sm text-inverse"
              >
                {a}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={MEMBER_JOIN_HREF} className={buttonClasses({ variant: "primary", size: "lg" })}>
              Join as a member <Icon name="arrow-right" size={16} />
            </Link>
            <Link href={MEMBER_SIGN_IN_HREF} className={buttonClasses({ variant: "inverse", size: "lg" })}>
              Member sign in
            </Link>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="hidden flex-col gap-3 rounded-feature border border-neutral-0/16 bg-neutral-0/6 p-5 md:flex"
        >
          <div className="flex items-center justify-between">
            <span className="type-label text-inverse">Your member dashboard</span>
            <span className="rounded-pill bg-accent px-2.5 py-0.5 type-label-sm text-primary">Member</span>
          </div>
          {PREVIEW.map((p) => (
            <div key={p.title} className="flex items-center gap-3 rounded-card bg-page px-4 py-3">
              <IconTile icon={p.icon} />
              <span className="flex min-w-0 flex-col">
                <span className="type-label text-primary">{p.title}</span>
                <span className="truncate type-body-sm text-body">{p.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <Reveal as="section" aria-labelledby="what" className={cx(wrap, "flex flex-col gap-6 pt-12 md:pt-16")}>
      <div className="flex max-w-180 flex-col gap-2">
        <h2 id="what" className="type-h2 text-primary">
          What members can do
        </h2>
        <p className="type-body text-body">
          One account for the news, opportunities and people across India&apos;s hydrogen economy.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          data-reveal-item=""
          className="flex flex-col gap-4 rounded-feature bg-fresh-700 p-6 md:col-span-2 lg:col-span-1 lg:row-span-2 lg:p-8"
        >
          <span className="flex size-11 items-center justify-center rounded-card bg-accent text-primary">
            <Icon name={ALERTS.icon} size={22} />
          </span>
          <p className="type-label text-fresh-300">Never miss one</p>
          <h3 className="type-h2 text-inverse">{ALERTS.title}</h3>
          <p className="type-body text-fresh-200">{ALERTS.text}</p>
          <ul aria-label="What you can get alerts for" className="flex flex-wrap gap-2">
            {ALERT_KINDS.map((k) => (
              <li
                key={k}
                className="rounded-pill border border-neutral-0/16 bg-neutral-0/6 px-3 py-1 type-label-sm text-inverse"
              >
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-auto type-body-sm text-fresh-200">Turn any alert off from the email itself.</p>
        </div>
        {MAIN.map((b) => (
          <div key={b.title} data-reveal-item="" className={cx(card, "card-lift flex h-full flex-col gap-3 p-6")}>
            <IconTile icon={b.icon} />
            <h3 className="type-h4 text-primary">{b.title}</h3>
            <p className="type-body-sm text-body">{b.text}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function AlsoIncluded() {
  return (
    <Reveal as="section" aria-labelledby="also" className={cx(wrap, "pt-12 md:pt-16")}>
      <div className="flex flex-col gap-6 rounded-feature bg-mint px-6 py-8 md:px-10 md:py-10">
        <h2 id="also" className="type-h3 text-primary">
          Also in your member workspace
        </h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {ALSO.map((a) => (
            <li key={a.title} data-reveal-item="" className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-card bg-page text-icon-link">
                <Icon name={a.icon} size={22} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="type-label-lg text-primary">{a.title}</span>
                <span className="type-body-sm text-body">{a.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

function HowItWorks() {
  return (
    <Reveal as="section" aria-labelledby="how" className={cx(wrap, "flex flex-col gap-4 pt-12 md:pt-16")}>
      <div className="flex flex-col gap-1">
        <h2 id="how" className="type-h2 text-primary">
          How it works
        </h2>
        <p className="type-body text-body">Ready in about two minutes.</p>
      </div>
      <Steps steps={MEMBER_JOIN_STEPS} />
    </Reveal>
  );
}

function AlreadyWithUs() {
  return (
    <div className={cx(wrap, "pt-12 md:pt-16")}>
      <section
        aria-labelledby="already"
        className={cx(card, "flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:px-8")}
      >
        <div className="flex gap-4">
          <IconTile icon="user" />
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
  );
}

export default function ForMembersPage() {
  return (
    <main id="main" className={main}>
      <Hero />
      <Benefits />
      <AlsoIncluded />
      <HowItWorks />
      <AlreadyWithUs />
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
