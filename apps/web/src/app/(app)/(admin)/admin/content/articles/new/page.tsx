import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/admin/cms/ArticleEditor";
import { articleChoices, EMPTY_ARTICLE, editorActor } from "@/admin/cms/articles";
import { AdminShell, requireOperator } from "@/admin/shell";
import { STATE_OPTIONS } from "@/cms/records/states";

// New article (step 4.6): the H2 India article editor, in the back office.
export const metadata: Metadata = { title: "New article · H2 India admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const { userId } = await requireOperator("content.edit", "/admin/content/articles/new");
  const [who, choices] = await Promise.all([editorActor(), articleChoices()]);
  if (!who) notFound();
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      <ArticleEditor
        initial={EMPTY_ARTICLE}
        meta={null}
        choices={choices}
        states={STATE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        canPublish={who.canPublish}
      />
    </AdminShell>
  );
}
