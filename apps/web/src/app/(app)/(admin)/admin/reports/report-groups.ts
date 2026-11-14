// The report downloads on Reports (716:348). Each reads only the nightly roll-ups (report_daily); a report whose
// figures aren't rolled up yet says why instead of a link.

export const REPORT_DOWNLOADS = [
  {
    key: "traffic",
    title: "Traffic and subscribers",
    detail: "Newsletter subscribers and searches with no results, by day",
    metrics: ["subscribers", "no_result_searches"],
  },
  {
    key: "members",
    title: "Members and alert subscribers",
    detail: "New accounts and new companies, by day",
    metrics: ["new_users", "new_companies"],
  },
  {
    key: "suppliers",
    title: "Suppliers and listings",
    detail: "Verified suppliers and live listings, by day",
    metrics: ["verified_suppliers", "live_listings"],
  },
  {
    key: "rfqs",
    title: "RFQs and response rates",
    detail: "RFQs sent, quotes sent and messages, by day",
    metrics: ["rfqs_sent", "quotes_sent", "messages"],
  },
  {
    key: "orders",
    title: "Orders and order value",
    detail: "Opens with ordering in Launch 2",
    metrics: [],
  },
  {
    key: "content",
    title: "Content output",
    detail: "Not in the nightly figures yet",
    metrics: [],
  },
] as const;

export const PERIODS = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
] as const;
