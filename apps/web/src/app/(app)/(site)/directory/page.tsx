import { redirect } from "next/navigation";
import { needsMembership } from "@/directory/gate";
import { MembersOnly } from "@/directory/MembersOnly";

// /directory opens the company directory (step 6.6); the mega menu links its other parts.
export default async function DirectoryHome() {
  // Founder QC (17 Nov 2026): Directory browsing is for members; buyers and suppliers join first.
  if (await needsMembership()) return <MembersOnly />;
  redirect("/directory/companies");
}
