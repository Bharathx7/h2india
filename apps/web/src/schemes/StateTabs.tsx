import { cx } from "@h2india/ui";
import Link from "next/link";

// Overview | Compare states (751:7362, 751:7856).
export function StateTabs({ active, state }: { active: "overview" | "compare"; state?: string }) {
  const tabs = [
    { id: "overview", label: "Overview", href: state ? `/states/${state}` : "/states/hubs" },
    { id: "compare", label: "Compare states", href: state ? `/states/compare?s=${state}` : "/states/compare" },
  ];
  return (
    <nav aria-label="State views" className="border-b border-default">
      <ul className="flex gap-6">
        {tabs.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              aria-current={t.id === active ? "page" : undefined}
              className={cx(
                "flex px-1 py-3 type-label",
                t.id === active ? "border-b-3 border-inverse text-primary" : "text-body hover:text-primary",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
