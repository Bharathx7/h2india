import type { Metadata } from "next";
import { PasskeyFlow } from "./PasskeyFlow";

// Lost passkey (Figma 528:53 verify it's you, 528:217 create a new passkey), step 3.5.
export const metadata: Metadata = { title: "Lost passkey · H2 India", robots: { index: false } };

export default function LostPasskeyPage() {
  return <PasskeyFlow />;
}
