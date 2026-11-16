import { getDb } from "@h2india/core";
import { needsOnboarding } from "@h2india/core/members";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { MemberHome } from "./MemberHome";

// The member home (step 7.2). A member who hasn't finished or skipped onboarding (step 7.1) goes there first.
export const dynamic = "force-dynamic";

export default async function MemberPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/member/sign-in");
  if (await needsOnboarding(getDb(), session.user.id)) redirect("/member/welcome");
  return <MemberHome userId={session.user.id} searchParams={searchParams} />;
}
