import { cx } from "@h2india/ui";
import Link from "next/link";

// Founder (18 Nov 2026): the Directory lives only in the member workspace, never on the website, for members too.
// Its parts are tabs under the one Directory item in the member sidebar. A single company profile
// (/directory/companies/<slug>) stays on the website for any signed-in person, linked from products, RFQs and search.

export const MEMBER_DIRECTORY = {
  companies: "/member/directory",
  people: "/member/directory/people",
  map: "/member/directory/map",
  startups: "/member/directory/startups",
  associations: "/member/directory/associations",
} as const;

export type DirectoryTab = keyof typeof MEMBER_DIRECTORY;

const TABS: { key: DirectoryTab; label: string }[] = [
  { key: "companies", label: "Companies" },
  { key: "people", label: "People" },
  { key: "map", label: "Ecosystem map" },
  { key: "startups", label: "Start-ups" },
  { key: "associations", label: "Associations" },
];

/** The Directory's sections, above every Directory page in the member workspace. */
export function DirectoryTabs({ current }: { current: DirectoryTab }) {
  return (
    <nav aria-label="Directory" className="flex gap-5 overflow-x-auto border-b border-default [scrollbar-width:none]">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={MEMBER_DIRECTORY[t.key]}
          aria-current={current === t.key ? "page" : undefined}
          className={cx(
            "tab-underline shrink-0 py-3 type-label whitespace-nowrap transition-colors duration-(--motion-duration-fast)",
            current === t.key ? "text-primary" : "text-secondary hover:text-primary",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
