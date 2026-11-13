import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { choicesFor, settingType } from "@/admin/cms/records";
import { RecordForm } from "@/admin/cms/RecordForm";
import { cmsSession } from "@/admin/cms/session";
import { AdminShell, requireOperator } from "@/admin/shell";

// One site setting (step 4.6) in the native editor. The CMS's own access rules decide who may change it.
export const metadata: Metadata = { title: "Site setting · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await requireOperator("content.view", `/admin/content/settings/${slug}`);
  const cms = await cmsSession();
  if (!cms) notFound();
  const type = settingType(cms.payload, slug);
  if (!type) notFound();
  const [doc, choices] = await Promise.all([
    cms.payload.findGlobal({
      slug: slug as "pricing",
      draft: type.drafts,
      depth: 0,
      user: cms.user,
      overrideAccess: false,
    }),
    choicesFor(cms, type.fields),
  ]);
  const values = doc as unknown as Record<string, unknown> & { updatedAt?: string; _status?: string };
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <RecordForm
        key={values.updatedAt ?? "new"}
        kind="setting"
        slug={slug}
        singular={type.singular}
        backHref="/admin/content/settings"
        backLabel="Site settings"
        titleField={null}
        fields={type.fields}
        initial={values}
        meta={{
          id: null,
          published: type.drafts ? values._status === "published" : null,
          status: null,
          updatedAt: values.updatedAt ?? null,
          verifiedAt: null,
        }}
        choices={choices}
        canEdit={cms.can("content.edit")}
        verify={false}
        cmsHref={`/cms/globals/${slug}`}
      />
    </AdminShell>
  );
}
