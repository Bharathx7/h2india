import { WORKSPACE_NAV, withCounts } from "@/lib/workspace-nav";
import type { WorkspaceArea } from "@h2india/ui";
import { WorkspacePreview } from "./Preview";

// Workspace shell preview (step 2.4): /dev/shells/workspace?area=admin|supplier|buyer|member

const SAMPLE_COUNTS: Record<WorkspaceArea, Record<string, number>> = {
  admin: { "/admin/queues": 28, "/admin/verification": 3, "/admin/compliance": 2 },
  supplier: { "/supplier/products": 2, "/supplier/rfqs": 3, "/supplier/orders": 5, "/supplier/messages": 2 },
  buyer: { "/buyer/rfqs": 2, "/buyer/orders": 3 },
  member: { "/member/alerts": 3 },
};

const USERS: Record<WorkspaceArea, { name: string; role: string; initials: string }> = {
  admin: { name: "Anita S.", role: "Admin · two-step on", initials: "AS" },
  supplier: { name: "Ravi K.", role: "Supplier · Hydrotek Systems", initials: "RK" },
  buyer: { name: "Meera P.", role: "Buyer · Tata Projects", initials: "MP" },
  member: { name: "Arjun V.", role: "Member", initials: "AV" },
};

export default async function WorkspaceShellPreview({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area: raw } = await searchParams;
  const area: WorkspaceArea = raw === "supplier" || raw === "buyer" || raw === "member" ? raw : "admin";
  const groups = withCounts(WORKSPACE_NAV[area], SAMPLE_COUNTS[area]);
  const current = groups[0]?.items[0]?.href ?? `/${area}`;
  return <WorkspacePreview area={area} groups={groups} current={current} user={USERS[area]} />;
}
