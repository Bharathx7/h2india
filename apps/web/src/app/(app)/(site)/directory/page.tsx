import { redirect } from "next/navigation";

// /directory opens the company directory (step 6.6); the mega menu links its other parts.
export default function DirectoryHome() {
  redirect("/directory/companies");
}
