"use client";

import {
  EmptyState,
  Button,
  NotificationCentre,
  WorkspaceShell,
  type WorkspaceArea,
  type WorkspaceNavGroup,
  type WorkspaceUser,
} from "@h2india/ui";

export function WorkspacePreview({
  area,
  groups,
  current,
  user,
}: {
  area: WorkspaceArea;
  groups: WorkspaceNavGroup[];
  current: string;
  user: WorkspaceUser;
}) {
  return (
    <WorkspaceShell
      area={area}
      groups={groups}
      currentHref={current}
      user={user}
      profileHref="#profile"
      settingsHref="#settings"
      logoutHref="#logout"
      notifications={
        <NotificationCentre
          variant="topbar"
          allHref="#notifications"
          onMarkAllRead={() => undefined}
          items={[
            {
              id: "n1",
              icon: "file-text",
              title: "New quote from Pranava H2",
              detail: "For RFQ-2026-0088 · ₹38,40,000 + GST",
              time: "12 min ago",
              unread: true,
              href: "#n1",
            },
            {
              id: "n2",
              icon: "shopping-bag",
              title: "Order HG-ORD-2026-0142 shipped",
              detail: "Delhivery AWB 8812 4410 2231",
              time: "2 h ago",
              unread: true,
              href: "#n2",
            },
            {
              id: "n3",
              icon: "shield-check",
              iconColour: "success",
              title: "Your product was approved",
              detail: "PEM Electrolyser 50 kW is now live",
              time: "Yesterday",
              unread: true,
              href: "#n3",
            },
          ]}
        />
      }
    >
      <div className="p-4 md:p-8">
        <h1 className="type-h1">Workspace shell</h1>
        <p className="mt-2 type-body text-body">Content area. Pages for this workspace are built in later stages.</p>
        <div className="mt-8 rounded-card border border-default">
          <EmptyState kind="first-use" title="Nothing here yet" action={<Button>Primary action</Button>}>
            This preview shows the {area} sidebar and top bar from Figma 194:1190 and 194:1191.
          </EmptyState>
        </div>
      </div>
    </WorkspaceShell>
  );
}
