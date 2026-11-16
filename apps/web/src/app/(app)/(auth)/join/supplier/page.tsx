import type { Metadata } from "next";
import { JoinScreen } from "../screen";

// Create a supplier account (public QC 2, 16 Nov 2026): the sign-up page for this kind of account. Join's own steps without the choice.

export const metadata: Metadata = {
  title: "Create a supplier account · H2 Economy",
  description: "List your products, answer quote requests and get a verified badge.",
  robots: { index: false },
};

export default async function JoinSupplierPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  return <JoinScreen fixed="supplier" wanted={step} />;
}
