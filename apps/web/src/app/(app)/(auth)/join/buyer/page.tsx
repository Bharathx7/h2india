import type { Metadata } from "next";
import { JoinScreen } from "../screen";

// Create a buyer account (public QC 2, 16 Nov 2026): the sign-up page for this kind of account. Join's own steps without the choice.

export const metadata: Metadata = {
  title: "Create a buyer account · H2 India",
  description: "Find verified suppliers, compare quotes and order with GST invoices.",
  robots: { index: false },
};

export default async function JoinBuyerPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return <JoinScreen fixed="buyer" wanted={step} />;
}
