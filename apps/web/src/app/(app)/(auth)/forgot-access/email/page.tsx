import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { EmailFlow } from "./EmailFlow";

// Lost email (Figma 528:534; received 528:664), step 3.5, decisions A15 to A17. The support request form arrives with
// the files module (step 3.7), because it carries a Work ID upload.
export const metadata: Metadata = { title: "Lost email · H2 Economy", robots: { index: false } };

export default async function LostEmailPage({ searchParams }: { searchParams: Promise<{ confirmed?: string }> }) {
  const { confirmed } = await searchParams;
  const session = await getSession();
  return <EmailFlow signedIn={Boolean(session)} confirmed={confirmed === "1"} />;
}
