import { redirect } from "next/navigation";
import { allChapters } from "@/knowledge/data";

// Hydrogen 101 starts at chapter 1 (the course outline is the sidebar on every chapter, 471:1876).
export const dynamic = "force-dynamic";

export default async function Hydrogen101() {
  const first = (await allChapters())[0];
  redirect(first ? `/knowledge/hydrogen-101/${first.slug}` : "/knowledge");
}
