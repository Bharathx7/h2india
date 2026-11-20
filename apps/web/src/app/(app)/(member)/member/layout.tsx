import type { ReactNode } from "react";
import { MemberFrame } from "@/server/workspace-layout";

// The member area frame, drawn once (founder, 20 Nov 2026): a sidebar click swaps only the page.
export default function MemberLayout({ children }: { children: ReactNode }) {
  return <MemberFrame>{children}</MemberFrame>;
}
