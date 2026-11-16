import { serviceStatus } from "@h2india/core/status-checks";
import { formatIstDateTime } from "@h2india/core/time";
import { Breadcrumbs, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import { absolute } from "@/seo/site";

// Service status (A176; the maintenance page's "Live status updates", 679:637, until a status provider is chosen,
// M26). Checks our own services each time it opens; says only whether each part works. Built without a frame (A178).
export const metadata: Metadata = {
  title: "Service status · H2 Economy",
  description: "Whether H2 Economy's website, search, documents and emails are working now.",
  alternates: { canonical: absolute("/status") },
};
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const report = await serviceStatus();
  const allGood = report.services.every((s) => s.state === "operational");
  return (
    <main className="mx-auto flex max-w-180 flex-col gap-6 px-4 py-10 md:py-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Service status" }]} />
      <div className="flex flex-col gap-2">
        <h1 className="type-h1">Service status</h1>
        <p className="flex items-center gap-2 type-body text-body">
          <Icon
            name={allGood ? "check-circle" : "alert-triangle"}
            size={20}
            className={allGood ? "text-icon-success" : "text-icon-warning"}
          />
          {allGood ? "Everything is working." : "Some parts of H2 Economy are having problems. We're on it."}
        </p>
      </div>
      <ul className="flex flex-col rounded-card border border-default bg-page">
        {report.services.map((s) => (
          <li key={s.key} className="flex items-center gap-3 border-b border-default px-5 py-4 last:border-b-0">
            <span className="flex-1 type-label">{s.label}</span>
            <StatusBadge
              status={s.state === "operational" ? "Working" : "Having problems"}
              tone={s.state === "operational" ? "success" : "warning"}
            />
          </li>
        ))}
      </ul>
      <p className="type-caption text-secondary">
        Checked {formatIstDateTime(report.checkedAt)} IST. Refresh the page to check again.
      </p>
    </main>
  );
}
