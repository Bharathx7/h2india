import type { NoticeProps } from "../notice";

// Grievance acknowledgement (676:154, step 5.8). Words as drawn: "We've received your complaint", the ticket box
// (Ticket, About, Raised, Acknowledged, Resolve by, Grievance officer), "Quote your ticket number if you write to us",
// Check status and "Reply to this email to add details". Sent when the complaint is raised (without Acknowledged)
// and again when the team acknowledges it.

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

export interface GrievanceDetails {
  name: string;
  reference: string;
  /** "Listing · Type IV cylinder, 350 bar · Hydrotek Systems", or just the type. */
  about: string;
  /** "10 Nov 2026, 9:40 PM IST" */
  raised: string;
  acknowledged: string | null;
  /** "25 Nov 2026" */
  resolveBy: string;
  /** "our listings team is checking the certificate with the supplier": the team's line, if any. */
  teamLine: string | null;
  /** "Anjali Deshmukh, Grievance Officer, H2 Economy · grievance@… · address", from the Trust settings (M2). */
  officer: string;
  signature: string;
  statusUrl: string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function grievanceMessage(d: GrievanceDetails): Message {
  const team = d.teamLine ? `${d.teamLine.charAt(0).toUpperCase()}${d.teamLine.slice(1)}` : null;
  const checking = team ? `${team}, and we'll` : "We'll";
  return {
    subject: `${d.reference}: we've received your complaint`,
    preview: d.acknowledged
      ? `${team ?? "We're checking it"}. Outcome by ${d.resolveBy}.`
      : `We'll acknowledge it within 24 hours. Outcome by ${d.resolveBy}.`,
    reason: "You're getting this because you raised a complaint with H2 Economy.",
    eyebrow: `Grievance · ${d.reference}`,
    headline: "We've received your complaint",
    paragraphs: [
      `Hello ${firstName(d.name)}, we've received your complaint ${d.reference} about ${d.about}. ${checking} tell you the outcome by ${d.resolveBy}.`,
      "Quote your ticket number if you write to us.",
    ],
    rows: [
      { label: "Ticket", value: d.reference },
      { label: "About", value: d.about },
      { label: "Raised", value: d.raised },
      ...(d.acknowledged ? [{ label: "Acknowledged", value: d.acknowledged }] : []),
      { label: "Resolve by", value: d.resolveBy },
      { label: "Grievance officer", value: d.officer },
    ],
    button: { label: "Check status", href: d.statusUrl },
    note: `Reply to this email to add details. ${d.signature}`,
  };
}
