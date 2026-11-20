import type { TreeClass, TreeNode } from "@h2india/core/catalogue/taxonomy";

// Figures for the catalogue Overview and the Categories table, from the same tree the rest of Catalogue reads.

export interface CategoryRow {
  id: string;
  label: string;
  classId: string;
  classLabel: string;
  parentLabel: string | null;
  depth: 0 | 1;
  subCategories: number;
  fields: number;
  liveProducts: number;
  hidden: boolean;
  sample: boolean;
}

export function categoryRows(tree: TreeClass[]): CategoryRow[] {
  const row = (c: TreeClass, n: TreeNode, parent: TreeNode | null): CategoryRow => ({
    id: n.id,
    label: n.label,
    classId: c.id,
    classLabel: c.label,
    parentLabel: parent?.label ?? null,
    depth: parent ? 1 : 0,
    subCategories: n.children.length,
    fields: n.attributes,
    liveProducts: n.liveProducts,
    hidden: n.hidden,
    sample: n.sample,
  });
  return tree.flatMap((c) => c.categories.flatMap((n) => [row(c, n, null), ...n.children.map((ch) => row(c, ch, n))]));
}

export function catalogueSummary(tree: TreeClass[]) {
  const rows = categoryRows(tree);
  return {
    classes: tree.length,
    categories: rows.filter((r) => r.depth === 0).length,
    subCategories: rows.filter((r) => r.depth === 1).length,
    liveProducts: tree.reduce((a, c) => a + c.liveProducts, 0),
    /** Main categories with no fields of their own yet: suppliers get an empty form. */
    noFields: rows.filter((r) => r.depth === 0 && r.fields === 0),
    hidden: rows.filter((r) => r.hidden),
  };
}
