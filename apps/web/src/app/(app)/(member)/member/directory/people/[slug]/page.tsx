import { buttonClasses, cx, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { person } from "@/directory/data";
import { absolute } from "@/seo/site";
import { DirectoryTabs, MEMBER_DIRECTORY } from "@/directory/tabs";
import { MemberShell, requireMember } from "@/member/shell";

// A person's profile (756:12711), step 6.6: only with their consent recorded (M24), or a member who chose to be listed
// (step 7.4). No email or phone, ever. Founder (18 Nov 2026): members only, in the member workspace; the name isn't
// put in the title, so it never reaches a browser tab history shared with someone signed out.
type Params = Promise<{ slug: string }>;

export const metadata: Metadata = { title: "People · Directory · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Params }) {
  const { slug } = await params;
  const userId = await requireMember(`${MEMBER_DIRECTORY.people}/${slug}`);
  const p = await person(slug);
  if (!p) notFound();
  return (
    <MemberShell userId={userId} current="/member/directory">
      <DirectoryTabs current="people" />
      <div className="flex max-w-200 flex-col gap-6">
        <h1 className="type-h2 text-primary">{p.name}</h1>
        <p className="type-body-lg text-body">
          {[p.role, p.organisation, [p.city, p.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(p.expertise ?? []).map((e) => (
            <span key={e} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm">
              {e}
            </span>
          ))}
          {p.id < 0
            ? (p.topics ?? []).map((t) => (
                <span key={t} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm">
                  {t}
                </span>
              ))
            : null}
          {(p.availableFor ?? []).map((a) => (
            <StatusBadge key={a} status={`Available for ${a.toLowerCase()}`} tone="success" />
          ))}
        </div>
        {p.bio ? <p className="type-body text-body">{p.bio}</p> : null}
        <Link href={`/contact?person=${p.slug}`} className={cx(buttonClasses({}), "self-start")}>
          <Icon name="message-square" size={18} />
          Contact via H2 Economy
        </Link>
        <p className="type-caption text-secondary">
          We pass your message on; {p.name} decides whether to reply. Their email and phone stay private.
        </p>
        {p.id < 0 ? (
          <p className="type-caption text-secondary">
            Is this you? Change it or make it private in{" "}
            <Link href="/member/profile" className="underline">
              your profile
            </Link>
            .
          </p>
        ) : (
          <p className="type-caption text-secondary">
            Is this you? You can ask us to change or remove this profile at any time.{" "}
            <Link
              href={`/legal/grievance-officer?type=Privacy&page=${encodeURIComponent(absolute(`${MEMBER_DIRECTORY.people}/${p.slug}`))}`}
              className="underline"
            >
              Ask to change or remove it
            </Link>
          </p>
        )}
      </div>
    </MemberShell>
  );
}
