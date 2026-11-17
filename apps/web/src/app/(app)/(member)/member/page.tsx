import { requireMember } from "@/member/shell";
import { MemberHome } from "./MemberHome";

// The member home (step 7.2). Founder QC (17 Nov 2026): no steps before the dashboard; onboarding (step 7.1,
// /member/welcome) is offered from the home instead of forced.
export const dynamic = "force-dynamic";

export default async function MemberPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const userId = await requireMember("/member");
  return <MemberHome userId={userId} searchParams={searchParams} />;
}
