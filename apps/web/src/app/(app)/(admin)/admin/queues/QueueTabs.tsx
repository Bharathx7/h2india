import { cx } from "@h2india/ui";
import Link from "next/link";

// The queue tabs on Queues (629:367, 629:1148). Suppliers, Content, Events, Jobs and Comments arrive in step 11.2.
const TABS = [
  { key: "listings", label: "Listings", href: "/admin/queues/listings" },
  { key: "rfqs", label: "RFQs", href: "/admin/queues/rfqs" },
] as const;

export function QueueTabs({
  current,
  counts,
}: {
  current: "listings" | "rfqs";
  counts: Partial<Record<"listings" | "rfqs", number>>;
}) {
  return (
    <nav aria-label="Queues" className="flex gap-6 border-b border-default">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cx(
            "-mb-px border-b-2 py-3 type-label",
            t.key === current ? "border-inverse" : "border-transparent text-secondary",
          )}
        >
          {t.label}
          {counts[t.key] !== undefined ? <span className="text-secondary"> {counts[t.key]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
