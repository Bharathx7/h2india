import type { Metadata } from "next";
import { AUTH_LINKS } from "@/lib/auth-links";
import { MEMBER_BENEFITS, MEMBER_JOIN_STEPS } from "@/member/benefits";
import { Block, DarkCta, Feature, Hero, main, Steps } from "@/trust/parts";

// For Members (public QC, 16 Nov 2026). There is no Figma frame for this page: it follows the For Buyers layout
// (93:906) with the same parts. Every card names something the member workspace already does (Stage 7) plus the
// Directory, which opens only for signed-in people.

export const metadata: Metadata = {
  title: "For members · H2 Economy",
  description:
    "Join H2 Economy as a member: save and follow what matters to you, get alerts for tenders, schemes and jobs, learn with Hydrogen 101 and open the directory.",
  alternates: { canonical: "/for-members" },
};

const MEMBER_JOIN_HREF = AUTH_LINKS.joinMember;
const MEMBER_SIGN_IN_HREF = AUTH_LINKS.memberSignIn;

export default function ForMembersPage() {
  return (
    <main id="main" className={main}>
      <Hero
        eyebrow="For members"
        title="Join H2 Economy as a member"
        lead="For engineers, researchers, students and anyone following India's hydrogen economy. Keep what matters to you in one place and hear first when something changes."
        actions={[
          { label: "Join as a member", href: MEMBER_JOIN_HREF, primary: true },
          { label: "Member sign in", href: MEMBER_SIGN_IN_HREF },
        ]}
      />
      <Block id="what" title="What members can do">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MEMBER_BENEFITS.map((b) => (
            <Feature key={b.title} icon={b.icon} title={b.title} text={b.text} />
          ))}
        </div>
      </Block>
      <Block id="how" title="How it works" lead="Ready in about two minutes.">
        <Steps steps={MEMBER_JOIN_STEPS} />
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
