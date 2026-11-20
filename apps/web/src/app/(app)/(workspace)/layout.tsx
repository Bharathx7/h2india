import type { ReactNode } from "react";
import { OwnFrame } from "@/server/workspace-layout";

// Account and Notifications in the person's own workspace frame, drawn once (founder, 20 Nov 2026).
export default function OwnWorkspaceLayout({ children }: { children: ReactNode }) {
  return <OwnFrame>{children}</OwnFrame>;
}
