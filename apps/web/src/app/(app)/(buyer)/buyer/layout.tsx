import type { ReactNode } from "react";
import { BuyerFrame } from "@/server/workspace-layout";

// The buyer workspace frame, drawn once (founder, 20 Nov 2026): a sidebar click swaps only the page.
export default function BuyerLayout({ children }: { children: ReactNode }) {
  return <BuyerFrame>{children}</BuyerFrame>;
}
