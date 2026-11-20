import type { ReactNode } from "react";
import { AdminFrame } from "@/server/workspace-layout";

// The back office frame, drawn once (founder, 20 Nov 2026): a sidebar click swaps only the page.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
