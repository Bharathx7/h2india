import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { fileLink } from "@h2india/core/files";
import { memberProfile } from "@h2india/core/members";
import type { ProfileFields } from "@h2india/core/members/rules";
import { formatIstDate } from "@h2india/core/time";
import type { Metadata } from "next";
import { MemberShell, requireMember } from "@/member/shell";
import { ProfileForm } from "@/member/ProfileForm";
import { shellFor } from "@/server/workspace";

// Profile (545:8; phones 546:198; other types 546:8), step 7.4. Listing in the people directory is the member's own
// choice ("Public profile", M24).
export const metadata: Metadata = { title: "Profile · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await requireMember("/member/profile");
  const db = getDb();
  const [profile, shell] = await Promise.all([memberProfile(db, userId), shellFor(userId)]);
  const fields = (profile?.profile ?? {}) as ProfileFields;
  let photoUrl: string | null = null;
  if (fields.photoFileId) {
    try {
      photoUrl = (await fileLink({ actor: await loadActor(db, userId), fileId: fields.photoFileId })).url;
    } catch {
      photoUrl = null;
    }
  }
  return (
    <MemberShell userId={userId} current="/member/profile">
      <ProfileForm
        savedOn={profile?.updatedAt && profile.onboardedAt ? formatIstDate(profile.updatedAt) : null}
        start={{
          name: shell.user.name,
          initials: shell.user.initials,
          persona: profile?.persona ?? null,
          interests: profile?.topics ?? [],
          listed: profile?.listed ?? false,
          fields,
          photoUrl,
        }}
      />
    </MemberShell>
  );
}
