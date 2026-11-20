import type { Access, CollectionConfig, GlobalConfig } from "payload";
import { sectionOf } from "../admin/cms/sections";
import { SETTING_SLUGS } from "../admin/cms/registry";
import { editorOf } from "./roles";

// Section limits (founder, 20 Nov 2026): a staff member a Super admin limited to some content sections still reads
// everything, but creates, changes, publishes and deletes only in their sections. The limit is checked here, on
// every CMS write, so no screen can get round it; actions that write with overrideAccess check sectionAllows() too.

/** The content section a collection or setting belongs to; null when it isn't in one. */
export function sectionForSlug(slug: string): string | null {
  if (slug === "articles") return "articles";
  if (SETTING_SLUGS.includes(slug)) return "site";
  return sectionOf(slug)?.id ?? null;
}

/** Whether a person with these sections (null: all) may change content of this type. */
export function sectionAllows(sections: readonly string[] | null | undefined, slug: string): boolean {
  const section = sectionForSlug(slug);
  if (!sections || section === null) return true;
  return sections.includes(section);
}

function guard(original: Access | undefined, slug: string): Access {
  return (args) => {
    const editor = editorOf(args.req);
    if (editor && !sectionAllows(editor.sections, slug)) return false;
    return original ? original(args) : Boolean(args.req.user);
  };
}

/** Every collection's create, update and delete rules, with the section limit in front. */
export function withSections(collections: CollectionConfig[]): CollectionConfig[] {
  return collections.map((c) =>
    sectionForSlug(c.slug) === null
      ? c
      : {
          ...c,
          access: {
            ...c.access,
            create: guard(c.access?.create, c.slug),
            update: guard(c.access?.update, c.slug),
            delete: guard(c.access?.delete, c.slug),
          },
        },
  );
}

/** Site settings: changing one needs the Site pages and settings section. */
export function withSettingSections(globals: GlobalConfig[]): GlobalConfig[] {
  return globals.map((g) =>
    sectionForSlug(g.slug) === null ? g : { ...g, access: { ...g.access, update: guard(g.access?.update, g.slug) } },
  );
}
