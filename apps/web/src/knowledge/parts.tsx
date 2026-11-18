import { cx, StatusBadge } from "@h2india/ui";
import type { Report } from "@/payload-types";

// The report cover and access badges (Reports 736:8, landing 736:421, ready 736:833).

export const reportPages = (r: Report) => (typeof r.file === "object" ? r.file.pages : null) ?? null;

export function ReportCover({ report, size = "md" }: { report: Report; size?: "sm" | "md" }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "flex flex-col justify-end rounded-control bg-inverse text-inverse",
        size === "sm" ? "aspect-[3/4] w-24 gap-1 p-2.5" : "aspect-[16/9] w-full gap-2 p-4",
      )}
    >
      <span className={cx("type-label-sm opacity-80", size === "sm" && "text-[10px]")}>
        {(report.kicker ?? "Report").toUpperCase()}
        {size === "sm" ? ` · ${new Date(report.publishedOn).getFullYear()}` : ""}
      </span>
      <span className={size === "sm" ? "type-label-sm" : "type-h4"}>{report.title.split(":")[0]}</span>
    </div>
  );
}

export function AccessBadges({ report }: { report: Report }) {
  return (
    <span className="flex flex-wrap gap-2">
      {report.gated ? (
        <StatusBadge status="Free with work email" tone="neutral" />
      ) : (
        <StatusBadge status="Free" tone="success" />
      )}
      {report.sponsor?.name ? <StatusBadge status="Sponsored" tone="neutral" /> : null}
    </span>
  );
}
