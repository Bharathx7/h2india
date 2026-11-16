import { cx } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";

// Users, Operator roles and Audit log share the System · Users area (651:8, 656:8, 656:872): one heading and tabs.
// The frames also draw an Organisations tab; companies are looked after on the Verification desk until that screen
// is built, so it is left out here.
const TABS = [
  { key: "people", label: "Users", href: "/admin/users" },
  { key: "roles", label: "Operator roles", href: "/admin/users/roles" },
  { key: "audit", label: "Audit log", href: "/admin/users/audit" },
  { key: "appeals", label: "Appeals", href: "/admin/users/appeals" },
] as const;

export function UsersHeader({ action }: { action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="type-h2">Users</h1>
        <p className="type-body-sm text-secondary">
          Everyone with a H2 Economy account, the organisations they belong to, operator roles and the audit log.
        </p>
      </div>
      {action}
    </div>
  );
}

export function UserTabs({
  current,
  counts = {},
}: {
  current: (typeof TABS)[number]["key"];
  counts?: Partial<Record<(typeof TABS)[number]["key"], number>>;
}) {
  return (
    <nav aria-label="Users" className="flex gap-6 border-b border-default">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={cx(
            "-mb-px flex items-center gap-2 border-b-2 py-3 type-label",
            t.key === current ? "border-inverse" : "border-transparent text-secondary",
          )}
        >
          {t.label}
          {counts[t.key] !== undefined ? (
            <span className="rounded-pill bg-subtle px-2 py-0.5 type-caption text-secondary">
              {counts[t.key]?.toLocaleString("en-IN")}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

/** Initials in a mint circle, as the frames draw people. */
export function Initials({ name, size = "sm" }: { name: string; size?: "sm" | "lg" }) {
  const letters = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center rounded-pill bg-mint type-label",
        size === "lg" ? "size-20 type-h3" : "size-8 type-caption",
      )}
    >
      {letters || "?"}
    </span>
  );
}
