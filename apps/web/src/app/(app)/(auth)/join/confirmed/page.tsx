import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { AuthCard } from "../../AuthCard";
import { StatusIcon } from "../../StatusIcon";
import { ContinueButton } from "./ContinueButton";

// Email confirmed (Figma 527:217). The link has signed the person in; Continue copies their Join details to the
// account and takes them to the next step.
export const metadata: Metadata = { title: "Email confirmed · H2 Economy", robots: { index: false } };

export default async function ConfirmedPage() {
  const session = await getSession();
  if (!session) redirect("/join/verify?expired=1");
  return (
    <AuthCard>
      <StatusIcon name="check-circle" />
      <h1 className="type-h2 text-primary">Email confirmed</h1>
      <p className="type-body text-body">Thanks, {session.user.email} is confirmed.</p>
      <ContinueButton />
    </AuthCard>
  );
}
