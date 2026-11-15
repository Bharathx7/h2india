import type { NoticeProps } from "../notice";

// The operations alarm (step 13.3): to the on-call address when an alarm starts failing, and once when all are clear.
// Internal, not drawn in Figma (A182); it uses the shared notice layout.

type Message = Omit<NoticeProps, "appUrl"> & { subject: string };

export interface OpsAlarmDetails {
  /** Alarms failing now: severity, label, value and the runbook to follow. */
  failing: { severity: "critical" | "warning"; label: string; value: string; runbook: string }[];
  /** "15 Nov 2026, 2:40 PM IST" */
  at: string;
  healthUrl: string;
}

export function opsAlarmMessage(d: OpsAlarmDetails): Message {
  const critical = d.failing.filter((a) => a.severity === "critical").length;
  const clear = d.failing.length === 0;
  return {
    subject: clear
      ? "H2 India: all alarms clear"
      : `H2 India ${critical ? "CRITICAL" : "warning"}: ${d.failing.map((a) => a.label).join(", ")}`,
    preview: clear ? `Clear since ${d.at}.` : `${String(d.failing.length)} alarms failing at ${d.at}.`,
    reason: "You're getting this because you're on the H2 India operations alert list (OPS_ALERT_EMAIL).",
    eyebrow: "Operations alarm",
    headline: clear ? "All alarms are clear" : "Something needs attention",
    paragraphs: clear
      ? [`Every alarm is passing again as of ${d.at}.`]
      : [
          `As of ${d.at}, these alarms are failing. Follow the runbook named for each, and post on the status page if people are affected.`,
        ],
    rows: d.failing.map((a) => ({
      label: `${a.severity === "critical" ? "Critical" : "Warning"}: ${a.label}`,
      value: `${a.value} · ${a.runbook}`,
    })),
    button: { label: "Open the health check", href: d.healthUrl },
  };
}
