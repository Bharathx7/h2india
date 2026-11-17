// Membership (founder QC, 17 Nov 2026), pure and safe to import in the browser. The member features (Directory
// browsing, the member area, Follow, Save and tender/scheme/job/news alerts) are for members. A buyer or supplier
// joins as a member with one click and keeps their own workspace; H2 Economy staff can open everything.

export interface MembershipFacts {
  /** buyer | supplier | member, or null before Join is finished. */
  profileType: string | null;
  /** Set when a buyer or supplier joined as a member. */
  memberSince: Date | null;
  /** Holds an operator role (H2 Economy staff). */
  operator: boolean;
}

/** A member: joined as one, or a buyer or supplier who also joined. */
export function isMemberFacts(f: Pick<MembershipFacts, "profileType" | "memberSince">): boolean {
  return f.profileType === "member" || f.memberSince !== null;
}

/** May open member features: members, and staff (who have all access). */
export function mayUseMemberFeatures(f: MembershipFacts): boolean {
  return f.operator || isMemberFacts(f);
}

/** The page that explains membership and offers Join as member, coming back to `next` afterwards. */
export const MEMBER_JOIN_PATH = "/member/join";

export function memberJoinHref(next: string): string {
  return `${MEMBER_JOIN_PATH}?next=${encodeURIComponent(next)}`;
}
