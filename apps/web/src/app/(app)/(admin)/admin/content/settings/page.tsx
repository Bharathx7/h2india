import { buttonClasses } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { settingType } from "@/admin/cms/records";
import { SETTING_SLUGS } from "@/admin/cms/registry";
import { cmsSession } from "@/admin/cms/session";
import { ContentFrame, ContentPageHead } from "@/admin/cms/ContentFrame";
import { requireOperator } from "@/admin/shell";

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
    <ContentFrame userId={userId} current="site">
      <ContentPageHead
        back={{ href: "/admin/content?section=site", label: "Site pages and settings" }}
        title="Site settings"
        intro="Words and figures used across public pages. Every change is logged."
      />
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
    </ContentFrame>
  );
}
