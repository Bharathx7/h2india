import { Alert } from "@h2india/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/admin/cms/ArticleEditor";
import { articleChoices, articleForm, editorActor } from "@/admin/cms/articles";
import { AdminShell, requireOperator } from "@/admin/shell";
import { STATE_OPTIONS } from "@/cms/records/states";

// Edit an article (step 4.6): the latest draft in the H2 Economy article editor, with its workflow.
export const metadata: Metadata = { title: "Article · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireOperator("content.edit", `/admin/content/articles/${id}`);
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  const [who, choices, article] = await Promise.all([editorActor(), articleChoices(), articleForm(n)]);
  if (!who || !article) notFound();
  return (
    <AdminShell userId={userId} current="/admin/content" title="Content">
      {who.inSection ? null : (
        <Alert tone="info" title="View only">
          Articles isn&apos;t one of your content sections, so you can read but not save. A Super admin can add it.
        </Alert>
      )}
      <ArticleEditor
        key={article.meta.updatedAt}
        initial={article.form}
        meta={article.meta}
        choices={choices}
        states={STATE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        canPublish={who.canPublish}
        canPurge={who.canPurge}
      />
    </AdminShell>
  );
}
