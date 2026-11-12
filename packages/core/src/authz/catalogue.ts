// The permission data of step 3.4 (playbook Section 10): three layers, checked in this order on every request.
//  1. Platform role: visitor, member, company user, operator (derived, not stored).
//  2. Company role: buyer Admin, Approver, Requester (Figma 575:696); supplier Admin, Sales, Catalogue, Finance, Viewer
//     (592:371).
//  3. Operator role: the seven roles on the admin Users screen (656:8), each a set of permissions by area.
// This file is the source the seed migration was generated from (scripts/authz-seed.ts). The live values are in the
// database, so changing a role there changes what people can do without a deploy.

export const OPERATOR_AREAS = [
  "overview",
  "queues",
  "content",
  "catalogue",
  "verification",
  "orders",
  "money",
  "users",
  "compliance",
  "reports",
  "settings",
] as const;
export const OPERATOR_ACTIONS = ["view", "edit", "delete", "export"] as const;
/** Areas the design marks "Sensitive: moves money, shows bank or personal data, or changes who can do what". */
export const SENSITIVE_AREAS = ["verification", "money", "users", "compliance", "settings"] as const;

export type OperatorArea = (typeof OPERATOR_AREAS)[number];
export type OperatorAction = (typeof OPERATOR_ACTIONS)[number];

/** Operator permissions outside the grid. */
export const OPERATOR_EXTRA = {
  "roles.manage": "Change operator roles and who holds them (the playbook keeps this to Super admin)",
  "content.publish":
    "Publish, schedule and correct articles and records (an Editor-in-chief can; a Content editor cannot)",
} as const;

export const COMPANY_PERMISSIONS = {
  "company.view": "See the company profile and settings",
  "company.manage": "Change company details and settings",
  "team.manage": "Invite people, answer join requests, change roles and limits",
  "approval_rules.manage": "Set approval thresholds and second approvers",
  "verification.manage": "Submit verification documents",
  "rfq.view": "See quote requests",
  "rfq.create": "Send quote requests",
  "quote.send": "Answer quote requests with quotes",
  "order.view": "See orders",
  "order.place": "Place orders up to their own limit",
  "order.approve": "Approve orders up to their own limit",
  "order.manage": "Accept, dispatch and update orders",
  "messages.use": "Read and send messages",
  "product.manage": "Add and change products and datasheets",
  "storefront.manage": "Change the storefront",
  "money.view": "See fees, invoices and payouts",
  "payout_bank.change": "Change the payout bank account (needs a passkey)",
} as const;

export type CompanyPermission = keyof typeof COMPANY_PERMISSIONS;
export type OperatorPermission = `${OperatorArea}.${OperatorAction}` | keyof typeof OPERATOR_EXTRA;
export type Permission = CompanyPermission | OperatorPermission;

type Grid = Partial<Record<OperatorArea, readonly OperatorAction[]>>;
const ALL: readonly OperatorAction[] = OPERATOR_ACTIONS;
const V: readonly OperatorAction[] = ["view"];

export interface RoleSeed {
  scope: "buyer" | "supplier" | "operator";
  name: string;
  description: string;
  permissions: Permission[];
}

function grid(g: Grid, extra: (keyof typeof OPERATOR_EXTRA)[] = []): Permission[] {
  return [
    ...Object.entries(g).flatMap(([area, actions]) => actions.map((a) => `${area}.${a}` as OperatorPermission)),
    ...extra,
  ];
}

const VIEWS: CompanyPermission[] = ["company.view", "rfq.view", "order.view", "messages.use"];

export const ROLES: RoleSeed[] = [
  // Buyer company roles (575:696). Limits are per person (memberships.order_limit_paise).
  {
    scope: "buyer",
    name: "Admin",
    description: "Manages the company, its people and approval rules; requests quotes and orders up to their limit.",
    permissions: [
      ...VIEWS,
      "company.manage",
      "team.manage",
      "approval_rules.manage",
      "verification.manage",
      "rfq.create",
      "order.place",
      "money.view",
    ],
  },
  {
    scope: "buyer",
    name: "Approver",
    description: "Approves orders up to their limit; requests quotes and orders.",
    permissions: [...VIEWS, "rfq.create", "order.place", "order.approve", "money.view"],
  },
  {
    scope: "buyer",
    name: "Requester",
    description: "Requests quotes and orders up to their limit.",
    permissions: [...VIEWS, "rfq.create", "order.place"],
  },
  // Supplier team roles (592:371), descriptions as drawn.
  {
    scope: "supplier",
    name: "Admin",
    description: "Everything, including team, payout bank account and verification.",
    permissions: [
      ...VIEWS,
      "company.manage",
      "team.manage",
      "verification.manage",
      "quote.send",
      "order.manage",
      "product.manage",
      "storefront.manage",
      "money.view",
      "payout_bank.change",
    ],
  },
  {
    scope: "supplier",
    name: "Sales",
    description: "RFQs, quotes, orders and messages.",
    permissions: [...VIEWS, "quote.send", "order.manage"],
  },
  {
    scope: "supplier",
    name: "Catalogue",
    description: "Products, datasheets and storefront.",
    permissions: [...VIEWS, "product.manage", "storefront.manage"],
  },
  {
    scope: "supplier",
    name: "Finance",
    description: "Fees, invoices and payouts. Can't change the bank account.",
    permissions: [...VIEWS, "money.view"],
  },
  {
    scope: "supplier",
    name: "Viewer",
    description: "Sees everything, changes nothing.",
    permissions: [...VIEWS, "money.view"],
  },
  // Operator roles (656:8). Only the Finance grid is drawn; the other six are drafted from their descriptions
  // (docs/permissions.md) for the founder to review.
  {
    scope: "operator",
    name: "Super admin",
    description: "Everything, including roles.",
    permissions: grid(Object.fromEntries(OPERATOR_AREAS.map((a) => [a, ALL])), ["content.publish", "roles.manage"]),
  },
  {
    scope: "operator",
    name: "Catalogue moderator",
    description: "Listings, categories and attributes.",
    permissions: grid({ overview: V, queues: ["view", "edit"], catalogue: ALL, reports: V }),
  },
  {
    scope: "operator",
    name: "Supplier verifier",
    description: "Supplier checks and verified badges.",
    permissions: grid({
      overview: V,
      queues: ["view", "edit"],
      verification: ["view", "edit", "export"],
      catalogue: V,
      users: V,
      compliance: V,
    }),
  },
  {
    scope: "operator",
    name: "Operations",
    description: "Orders, RFQs, disputes and queues.",
    permissions: grid({
      overview: V,
      queues: ["view", "edit"],
      orders: ["view", "edit", "export"],
      catalogue: V,
      verification: V,
      users: V,
      reports: ["view", "export"],
    }),
  },
  {
    scope: "operator",
    name: "Editor-in-chief",
    description: "Publishing, corrections and legal checks.",
    permissions: grid(
      { overview: V, queues: ["view", "edit"], content: ALL, compliance: ["view", "edit"], reports: V },
      ["content.publish"],
    ),
  },
  {
    scope: "operator",
    name: "Content editor",
    description: "Articles, records, newsletter and media.",
    permissions: grid({ overview: V, queues: V, content: ["view", "edit"], reports: V }),
  },
  {
    scope: "operator",
    name: "Finance",
    description: "Payouts, holds, fees, invoices and money reports. Can see orders and users, but can't change them.",
    // As drawn in 656:8.
    permissions: grid({
      overview: V,
      catalogue: V,
      verification: V,
      orders: ["view", "export"],
      money: ["view", "edit", "export"],
      users: V,
      reports: ["view", "export"],
    }),
  },
];

/** The role a person gets when they create a company, and when an admin approves their join request. */
export const DEFAULT_ROLE = {
  creator: "Admin",
  joined: { buyer: "Requester", supplier: "Viewer" },
} as const;
