import type { WorkspaceArea, WorkspaceNavGroup } from "@h2india/ui";

// Workspace navigation from Figma "Workspace sidebar v2" (194:1190). Labels, groups and icons are exactly the
// design's; the addresses are the app's routes. Counts are filled in at request time.

export const WORKSPACE_NAV: Record<WorkspaceArea, WorkspaceNavGroup[]> = {
  admin: [
    { items: [{ label: "Overview", href: "/admin", icon: "layout-dashboard" }] },
    {
      heading: "Manage",
      items: [
        { label: "Queues", href: "/admin/queues", icon: "clipboard-check" },
        { label: "Content", href: "/admin/content", icon: "newspaper" },
        { label: "Catalogue", href: "/admin/catalogue", icon: "folder" },
        { label: "Verification", href: "/admin/verification", icon: "shield-check" },
      ],
    },
    {
      heading: "Commerce",
      items: [
        { label: "Orders", href: "/admin/orders", icon: "shopping-bag" },
        { label: "Money", href: "/admin/money", icon: "table" },
      ],
    },
    {
      heading: "System",
      items: [
        { label: "Users", href: "/admin/users", icon: "users" },
        { label: "Compliance", href: "/admin/compliance", icon: "file-text" },
        { label: "Reports", href: "/admin/reports", icon: "bar-chart" },
        { label: "Settings", href: "/admin/settings", icon: "sliders" },
      ],
    },
  ],
  supplier: [
    { items: [{ label: "Dashboard", href: "/supplier", icon: "layout-dashboard" }] },
    {
      heading: "Catalogue",
      items: [
        { label: "Storefront", href: "/supplier/storefront", icon: "layout-template" },
        { label: "Products", href: "/supplier/products", icon: "package" },
      ],
    },
    {
      heading: "Selling",
      items: [
        { label: "RFQs", href: "/supplier/rfqs", icon: "file-text" },
        { label: "Orders", href: "/supplier/orders", icon: "shopping-bag" },
        { label: "Messages", href: "/supplier/messages", icon: "message-square" },
      ],
    },
    {
      heading: "Business",
      items: [
        { label: "Fees & invoices", href: "/supplier/invoices", icon: "copy" },
        { label: "Analytics", href: "/supplier/analytics", icon: "bar-chart" },
      ],
    },
    {
      heading: "Company",
      items: [
        { label: "Company details", href: "/supplier/company", icon: "building" },
        { label: "Verification", href: "/supplier/verification", icon: "shield-check" },
        { label: "Content", href: "/supplier/content", icon: "newspaper" },
        { label: "Team", href: "/supplier/team", icon: "users" },
      ],
    },
  ],
  buyer: [
    { items: [{ label: "Dashboard", href: "/buyer", icon: "layout-dashboard" }] },
    {
      heading: "Buying",
      items: [
        { label: "RFQs", href: "/buyer/rfqs", icon: "file-text" },
        { label: "Orders", href: "/buyer/orders", icon: "shopping-bag" },
        { label: "Payments & invoices", href: "/buyer/payments", icon: "table" },
        { label: "Messages", href: "/buyer/messages", icon: "message-square" },
      ],
    },
    {
      heading: "Lists and alerts",
      items: [
        { label: "Project lists", href: "/buyer/lists", icon: "folder" },
        { label: "Alerts", href: "/buyer/alerts", icon: "bell" },
      ],
    },
    { heading: "Company", items: [{ label: "Company", href: "/buyer/company", icon: "building" }] },
  ],
  member: [
    { items: [{ label: "Home", href: "/member", icon: "home" }] },
    {
      heading: "Following",
      items: [
        { label: "Alerts", href: "/member/alerts", icon: "bell" },
        { label: "Saved", href: "/member/saved", icon: "heart" },
        { label: "Follows", href: "/member/follows", icon: "users" },
      ],
    },
    {
      heading: "Learning",
      items: [
        { label: "Hydrogen 101", href: "/member/hydrogen-101", icon: "file-text" },
        { label: "Event registrations", href: "/member/events", icon: "calendar" },
      ],
    },
    {
      heading: "Account",
      items: [
        { label: "Profile", href: "/member/profile", icon: "user" },
        { label: "Preferences", href: "/member/preferences", icon: "mail" },
        { label: "Sign-in and security", href: "/member/security", icon: "lock" },
        { label: "Join a company", href: "/member/join-company", icon: "building" },
      ],
    },
    {
      heading: "Explore",
      items: [
        { label: "News", href: "/news", icon: "newspaper" },
        { label: "Opportunities", href: "/opportunities", icon: "file-text" },
        { label: "Knowledge", href: "/knowledge", icon: "bar-chart" },
      ],
    },
  ],
};

/** Adds live counts (items waiting) to the navigation, keyed by item address. */
export function withCounts(groups: WorkspaceNavGroup[], counts: Record<string, number>): WorkspaceNavGroup[] {
  return groups.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, count: counts[i.href] })) }));
}
