import { getDb } from "@h2india/core";
import { PASSWORD_PAGES, safeReturnPath } from "@h2india/core/sign-in";
import { hasPassword } from "@h2india/core/sign-in/passwords";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { SetPasswordForm } from "./SetPasswordForm";

// Set your password (founder, 19 Nov 2026, A195): a signed-in person with no password yet (invited to a team, joined
// with a code before A195, or who opened Join's confirm link in another browser, ?join=1) chooses one, then goes on to
// `next`. Someone who has one goes straight on. From Join there is no Skip: the sign-up isn't finished without one.
export const metadata: Metadata = { title: "Set your password · H2 Economy", robots: { index: false } };

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; join?: string }>;
}) {
  const { next: raw, join } = await searchParams;
  const next = safeReturnPath(raw);
  const session = await getSession();
  if (!session)
    redirect(`/sign-in?next=${encodeURIComponent(`${PASSWORD_PAGES.set}?next=${encodeURIComponent(next)}`)}`);
  if (await hasPassword(getDb(), session.user.id)) redirect(next);
  return <SetPasswordForm email={session.user.email} next={next} fromJoin={join === "1"} />;
}
