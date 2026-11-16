import type { Metadata } from "next";
import { AUTH_LINKS } from "@/lib/auth-links";
import { Block, DarkCta, Feature, Hero, main, Steps } from "@/trust/parts";

// For Members (public QC, 16 Nov 2026). There is no Figma frame for this page: it follows the For Buyers layout
// (93:906) with the same parts. Every card names something the member workspace already does (Stage 7) plus the
// Directory, which opens only for signed-in people.

export const metadata: Metadata = {
  title: "For members · H2 India",
  description:
    "Join H2 India as a member: save and follow what matters to you, get alerts for tenders, schemes and jobs, learn with Hydrogen 101 and open the directory.",
  alternates: { canonical: "/for-members" },
};

const MEMBER_JOIN_HREF = AUTH_LINKS.joinMember;
const MEMBER_SIGN_IN_HREF = AUTH_LINKS.memberSignIn;

export default function ForMembersPage() {
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="For members"
        title="Join H2 India as a member"
        lead="For engineers, researchers, students and anyone following India's hydrogen economy. Keep what matters to you in one place and hear first when something changes."
        actions={[
          { label: "Join as a member", href: MEMBER_JOIN_HREF, primary: true },
          { label: "Member sign in", href: MEMBER_SIGN_IN_HREF },
        ]}
      />
      <Block id="what" title="What members can do">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon="heart"
            title="Save for later"
            text="Save products, news, schemes, tenders and jobs, and find them again in one list."
          />
          <Feature
            icon="users"
            title="Follow companies and topics"
            text="Follow suppliers, companies and topics, and see their updates on your dashboard."
          />
          <Feature
            icon="bell"
            title="Alerts that match you"
            text="Get an alert when a new tender, scheme, grant or job matches the filters you choose."
          />
          <Feature
            icon="building"
            title="Open the directory"
            text="Browse companies, people and associations across India's hydrogen ecosystem."
          />
          <Feature
            icon="file-text"
            title="Learn with Hydrogen 101"
            text="Short chapters and quizzes on how hydrogen is made, stored, moved and used. Your progress is saved."
          />
          <Feature
            icon="calendar"
            title="Events and webinars"
            text="Register for webinars and keep your events, links and replays together."
          />
          <Feature
            icon="clipboard-check"
            title="Track job applications"
            text="Keep a list of the jobs you applied to and when they close."
          />
          <Feature
            icon="user"
            title="Your profile, your choice"
            text="Appear in the people directory only if you turn your profile on. Your email and phone are never shown."
          />
        </div>
      </Block>
      <Block id="how" title="How it works" lead="Ready in about two minutes.">
        <Steps
          steps={[
            { title: "Choose Individual member", text: "Join as a member opens Join with it already picked." },
            { title: "Add your details", text: "Your name, what you do and your email." },
            { title: "Confirm your email", text: "Type the code we email you. No password to remember." },
            { title: "Start", text: "Save, follow and set your alerts from your member dashboard." },
          ]}
        />
      </Block>
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
