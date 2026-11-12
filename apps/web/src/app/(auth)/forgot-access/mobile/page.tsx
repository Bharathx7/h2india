import type { Metadata } from "next";
import { MobileFlow } from "./MobileFlow";

// Changed mobile (Figma 528:293 new number, 528:480 waiting for admin), step 3.5, decision A14.
export const metadata: Metadata = { title: "Changed mobile · H2 India", robots: { index: false } };

export default function ChangedMobilePage() {
  return <MobileFlow />;
}
