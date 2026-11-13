import { cx } from "@h2india/ui";
import Link from "next/link";

// Users, Operator roles and Audit log share the System · Users area (651:8, 656:8, 656:872).
const TABS = [
  { key: "people", label: "People", href: "/admin/users" },
  { key: "roles", label: "Operator roles", href: "/admin/users/roles" },
  { key: "audit", label: "Audit log", href: "/admin/users/audit" },
] as const;

export function UserTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Users" className="flex gap-6 border-b border-default">
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
        </Link>
      ))}
    </nav>
  );
}
