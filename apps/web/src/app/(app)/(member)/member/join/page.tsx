import { getDb } from "@h2india/core";
import { membershipFacts, mayUseMemberFeatures } from "@h2india/core/members";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import { ACCOUNT_PAGES, safeReturnPath } from "@h2india/core/sign-in";
import { Icon, type IconName } from "@h2india/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { toRows } from "@/app/(app)/(workspace)/notifications/rows";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { JoinAsMemberButton } from "@/member/JoinAsMember";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";

// Join as member (founder QC, 17 Nov 2026): where a buyer or supplier lands when they open a member feature (the
// Directory, the member area, Follow, Save, alerts). One click switches membership on for the same account; they keep
// their workspace and come back to what they asked for. Not behind requireMember (it is the way in). No Figma frame;
// built from the workspace panels.

export const metadata: Metadata = { title: "Join as member · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

const PERKS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "building",
    title: "The Directory",
    text: "Browse and search hydrogen companies, people, start-ups and associations, and the ecosystem map.",
  },
  { icon: "users", title: "Follow", text: "Follow companies, topics and states, and see what's new in your feed." },
  { icon: "bell", title: "Alerts", text: "Get tenders, schemes, grants, jobs and news that match what you follow." },
  { icon: "heart", title: "Saved", text: "Keep tenders, jobs, articles and reports to come back to." },
  { icon: "file-text", title: "Hydrogen 101", text: "Track your progress through the course." },
];

export default async function JoinAsMemberPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeReturnPath(sp.next, "/member");
  const session = await getSession();
  if (!session)
    redirect(
      `${ACCOUNT_PAGES.member.signIn}?next=${encodeURIComponent(`/member/join?next=${encodeURIComponent(next)}`)}`,
    );
  const db = getDb();
  const userId = session.user.id;
  const facts = await membershipFacts(db, userId);
  // Already a member (or staff): straight on. Someone who hasn't finished Join joins as a member there.
  if (mayUseMemberFeatures(facts)) redirect(next);
  if (!facts.profileType) redirect(ACCOUNT_PAGES.member.join);
  const [shell, unread, items] = await Promise.all([
    shellFor(userId),
    unreadCount(db, userId),
    listNotifications(db, userId, { limit: 5 }),
  ]);
  const workspace = facts.profileType === "supplier" ? "supplier" : "buyer";

  return (
    <WorkspaceFrame
      area={shell.area}
      groups={shell.groups}
      current="/member/join"
      user={shell.user}
      home={shell.home}
      bell={{ unread, items: toRows(items) }}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="flex max-w-3xl flex-col gap-2">
          <p className="type-eyebrow text-secondary">Membership</p>
          <h1 className="type-h2 text-primary">Join as a member</h1>
          <p className="type-body text-body">
            The Directory and these features are for members. Join with this account: it&apos;s free, takes one click,
            and your {workspace} workspace stays exactly as it is.
          </p>
        </div>
        <section
          aria-labelledby="perks"
          className="flex max-w-3xl flex-col gap-4 rounded-card border border-default bg-page p-5"
        >
          <h2 id="perks" className="type-h4">
            What members get
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PERKS.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-card bg-mint">
                  <Icon name={p.icon} size={18} />
                </span>
                <span>
                  <span className="block type-label text-primary">{p.title}</span>
                  <span className="block type-body-sm text-body">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="type-caption text-secondary">
            You aren&apos;t listed in the people directory unless you choose to be in your member profile.
          </p>
          <JoinAsMemberButton next={next} />
        </section>
      </div>
    </WorkspaceFrame>
  );
}
