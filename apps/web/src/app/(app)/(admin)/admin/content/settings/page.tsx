import { buttonClasses, Icon } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { settingType } from "@/admin/cms/records";
import { SETTING_SLUGS } from "@/admin/cms/registry";
import { cmsSession } from "@/admin/cms/session";
import { AdminShell, requireOperator } from "@/admin/shell";

// Site settings (step 4.6): the single documents behind the home page, company details, pricing, tracker pages and
// maintenance notice.
export const metadata: Metadata = { title: "Site settings · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingsListPage() {
  const { userId } = await requireOperator("content.view", "/admin/content/settings");
  const cms = await cmsSession();
  if (!cms) notFound();
  const items = SETTING_SLUGS.map((s) => settingType(cms.payload, s)).filter((x) => x !== null);
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <div className="flex flex-col gap-1">
        <Link href="/admin/content?tab=records" className="inline-flex items-center gap-1 type-label text-secondary">
          <Icon name="arrow-left" size={16} />
          Content
        </Link>
        <h1 className="type-h2">Site settings</h1>
        <p className="type-body-sm text-secondary">
          Words and figures used across public pages. Every change is logged.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((s) => (
          <li
            key={s.slug}
            className="flex items-center justify-between gap-3 rounded-card border border-default bg-page p-5"
          >
            <span className="type-label">{s.singular}</span>
            <Link
              href={`/admin/content/settings/${s.slug}`}
              className={buttonClasses({ variant: "outline", size: "sm" })}
            >
              Open<span className="sr-only"> {s.singular}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
