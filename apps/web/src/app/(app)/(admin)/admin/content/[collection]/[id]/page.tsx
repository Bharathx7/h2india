import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { choicesFor, contentType, recordValues } from "@/admin/cms/records";
import { RecordForm } from "@/admin/cms/RecordForm";
import { VERIFIED_SLUGS } from "@/admin/cms/registry";
import { cmsSession } from "@/admin/cms/session";
import { AdminShell, requireOperator } from "@/admin/shell";

// Edit a record of any content type (step 4.6): the latest draft, its status and "Last verified".
export const metadata: Metadata = { title: "Edit · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Whole days since a time (for "14 days ago" on Last verified). */
function daysSince(iso: string): number {
  return Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86_400_000);
}

export default async function EditRecordPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  const { userId } = await requireOperator("content.view", `/admin/content/${collection}/${id}`);
  const cms = await cmsSession();
  if (!cms) notFound();
  const type = contentType(cms.payload, collection);
  const n = Number(id);
  if (!type || !Number.isInteger(n) || n <= 0) notFound();
  const [doc, choices] = await Promise.all([recordValues(cms, type, n), choicesFor(cms, type.fields)]);
  if (!doc) notFound();
  const verification = doc.verification as { at?: string | null } | undefined;
  const preview = type.upload && typeof doc.url === "string" ? doc.url : null;
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      {preview && typeof doc.mimeType === "string" && doc.mimeType.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element -- CMS images come from the storage domain.
        <img
          src={preview}
          alt={typeof doc.alt === "string" ? doc.alt : ""}
          className="max-h-80 w-fit rounded-card border border-default object-contain"
        />
      ) : null}
      <RecordForm
        key={doc.updatedAt}
        kind="record"
        slug={collection}
        singular={type.singular}
        backHref={`/admin/content/${collection}`}
        backLabel={
          type.upload || collection === "authors" ? `Content · ${type.plural}` : `Content · Records · ${type.plural}`
        }
        titleField={type.titleField === "id" ? null : type.titleField}
        fields={type.fields}
        initial={doc}
        meta={{
          id: doc.id,
          published: type.drafts ? doc._status === "published" : null,
          status: typeof doc.status === "string" ? doc.status : null,
          updatedAt: doc.updatedAt,
          verifiedAt: verification?.at ?? null,
          verifiedDays: verification?.at ? daysSince(verification.at) : null,
        }}
        choices={choices}
        canEdit={cms.can("content.edit")}
        verify={VERIFIED_SLUGS.includes(collection)}
        cmsHref={`/cms/collections/${collection}/${id}`}
        canArchive={cms.can("content.delete")}
      />
    </AdminShell>
  );
}
