import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { choicesFor, contentType } from "@/admin/cms/records";
import { RecordForm } from "@/admin/cms/RecordForm";
import { cmsSession } from "@/admin/cms/session";
import { AdminShell, requireOperator } from "@/admin/shell";

// A new record of any content type (step 4.6), in the native editor.
export const metadata: Metadata = { title: "New · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewRecordPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  const { userId } = await requireOperator("content.edit", `/admin/content/${collection}/new`);
  const cms = await cmsSession();
  if (!cms) notFound();
  const type = contentType(cms.payload, collection);
  if (!type || type.upload) notFound();
  const choices = await choicesFor(cms, type.fields);
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <RecordForm
        kind="record"
        slug={collection}
        singular={type.singular}
        backHref={`/admin/content/${collection}`}
        backLabel={`Content · Records · ${type.plural}`}
        titleField={type.titleField === "id" ? null : type.titleField}
        fields={type.fields}
        initial={{}}
        meta={{
          id: null,
          published: type.drafts ? false : null,
          status: null,
          updatedAt: null,
          verifiedAt: null,
          verifiedDays: null,
        }}
        choices={choices}
        canEdit={cms.can("content.edit")}
        verify={false}
        cmsHref={`/cms/collections/${collection}/create`}
      />
    </AdminShell>
  );
}
