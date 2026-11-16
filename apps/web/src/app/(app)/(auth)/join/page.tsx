import type { Metadata } from "next";
import { JoinScreen } from "./screen";

// /join: the choice between a buyer account, a supplier account and membership, for old links and signed-in people
// who never finished joining (public QC 2, 16 Nov 2026). Continue goes to that account's own sign-up page.

export const metadata: Metadata = { title: "Join · H2 Economy", robots: { index: false } };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ step?: string; as?: string }> }) {
  const { step, as } = await searchParams;
  return <JoinScreen wanted={step} as={as} />;
}
