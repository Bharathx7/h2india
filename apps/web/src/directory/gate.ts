import { siteViewer } from "@/server/site";
import type { Metadata } from "next";

/** A profile's title and description stay hidden from signed-out visitors too (public QC, 16 Nov 2026). */
export const GATED_METADATA: Metadata = { title: "Directory · H2 Economy" };

/**
 * Directory browsing is for members and staff (founder QC, 17 Nov 2026). The layout already turned signed-out
 * visitors away; this tells a page whether a signed-in viewer must join first. A single company profile doesn't call
 * it: buyers and suppliers reach those from products and RFQs.
 */
export async function needsMembership(): Promise<boolean> {
  const viewer = await siteViewer();
  return viewer !== null && !viewer.member;
}
