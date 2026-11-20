import type { ReactNode } from "react";
import { SupplierFrame } from "@/server/workspace-layout";

// The supplier workspace frame, drawn once (founder, 20 Nov 2026): a sidebar click swaps only the page.
export default function SupplierLayout({ children }: { children: ReactNode }) {
  return <SupplierFrame>{children}</SupplierFrame>;
}
