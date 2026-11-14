"use client";

import { ATTRIBUTE_TYPE_LABEL, formatAllowedValues, type AttributeInput } from "@h2india/core/catalogue/attributes";
import type { AttributeRow, CategoryDetail, TreeClass, TreeNode } from "@h2india/core/catalogue/taxonomy";
import {
  AsyncSection,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuContent,
  MenuDivider,
  MenuItem,
  MenuTrigger,
  Skeleton,
  StatusBadge,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  moveAttributeAction,
  removeAttributeAction,
  setCategoryHiddenAction,
  updateAttributeAction,
  duplicateCategoryAction,
} from "./actions";
import { AttributeDialog } from "./AttributeDialog";
import {
  AddCategoryDialog,
  ApplicationsDialog,
  HideCategoryDialog,
  HistoryDialog,
  HistoryList,
  MoveCategoryDialog,
  PreviewDialog,
  RenameCategoryDialog,
} from "./CategoryDialogs";
import type { HistoryLine } from "./format";

// Admin Catalogue · Taxonomy (636:596): the category tree on the left, the selected category's attribute schema,
// and its change history. Desktop-first like every admin frame; on phones the tree stacks above and the table
// scrolls sideways inside its own region.

export interface CatalogueData {
  tree: TreeClass[];
  canEdit: boolean;
  applications: { id: string; label: string; hidden: boolean }[];
  category: (CategoryDetail & { meta: string; history: HistoryLine[] }) | null;
}

type Dialog =
  | { kind: "add-attribute" }
  | { kind: "edit-attribute"; attribute: AttributeRow }
  | { kind: "remove-attribute"; attribute: AttributeRow }
  | { kind: "add-category"; classId: string; parentId: string | null }
  | { kind: "rename" | "move" | "hide" | "history" | "preview" | "applications" };

const href = (id: string) => `/admin/catalogue?category=${id}`;

export function CatalogueView({ data, demoState }: { data: CatalogueData; demoState?: "loading" | "empty" | "error" }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [opened, setOpened] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = data.category;

  const open = (d: Dialog) => {
    setOpened((n) => n + 1);
    setDialog(d);
  };
  const close = (isOpen: boolean) => {
    if (!isOpen) setDialog(null);
  };
  const done = (text: string, goTo?: string) => {
    setMessage(text);
    if (goTo) router.push(href(goTo));
    else router.refresh();
  };
  const act = (work: () => Promise<{ ok: boolean; errors?: Record<string, string> }>, text: string) => {
    start(async () => {
      const r = await work();
      setMessage(r.ok ? text : (Object.values(r.errors ?? {})[0] ?? "Something went wrong. Try again."));
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6 bg-page p-4 md:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="type-h2">Catalogue</h1>
          <p className="mt-1 type-body text-secondary">
            Categories and the spec fields each one asks for. Changes here shape every product form and filter in that
            category.
          </p>
        </div>
        {data.canEdit ? (
          <Button
            variant="outline"
            onClick={() => {
              open({ kind: "add-category", classId: c?.classId ?? "systems", parentId: null });
            }}
          >
            <Icon name="plus" size={20} />
            Add category
          </Button>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className={message ? "type-body-sm text-success" : "sr-only"}>
        {message}
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CategoryTree tree={data.tree} selectedId={c?.id ?? null} loading={demoState === "loading"} />

        {demoState === "loading" || demoState === "error" || !c ? (
          <AsyncSection
            label="Category"
            state={demoState === "loading" || demoState === "error" ? demoState : "empty"}
            skeleton={<CategorySkeleton />}
            className={demoState === "loading" ? undefined : "rounded-card border border-default"}
            errorTitle="We couldn't load this category"
            errorText="Check your connection and try again. Nothing you saved is lost."
            onRetry={() => {
              router.refresh();
            }}
            empty={
              <EmptyState title="Choose a category">
                Pick a category on the left to see the fields it asks for.
              </EmptyState>
            }
          />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <section aria-labelledby="category-title" className="rounded-card border border-default p-5 md:px-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
                <div className="min-w-0 flex-1">
                  <p className="type-eyebrow text-secondary">
                    {[c.classLabel, c.parentLabel].filter(Boolean).join(" › ")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 id="category-title" className="type-h3">
                      {c.label}
                    </h2>
                    {c.hidden ? <StatusBadge status="Hidden" tone="neutral" /> : null}
                    {c.sample ? <StatusBadge status="Sample" tone="warning" /> : null}
                  </div>
                  <p className="mt-1 type-caption text-secondary">{c.meta}</p>
                  {c.parentId === null ? (
                    <p className="mt-1 type-caption text-secondary">
                      Applications:{" "}
                      {data.applications
                        .filter((a) => c.applicationIds.includes(a.id))
                        .map((a) => a.label)
                        .join(", ") || "none yet"}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    open({ kind: "preview" });
                  }}
                >
                  <Icon name="eye" size={18} />
                  Preview product form
                </Button>
                {data.canEdit ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        open({ kind: "add-attribute" });
                      }}
                    >
                      <Icon name="plus" size={18} />
                      Add attribute
                    </Button>
                    <CategoryMenu
                      label={c.label}
                      hidden={c.hidden}
                      topLevel={c.parentId === null}
                      onAction={(a) => {
                        if (a === "duplicate") {
                          start(async () => {
                            const r = await duplicateCategoryAction(c.id);
                            if (r.ok) done(`${c.label} copied. The copy is hidden until you show it.`, r.value.id);
                            else setMessage(Object.values(r.errors)[0] ?? "Something went wrong. Try again.");
                          });
                        } else if (a === "show") {
                          act(() => setCategoryHiddenAction(c.id, false), `${c.label} is shown again`);
                        } else if (a === "add-sub") {
                          open({ kind: "add-category", classId: c.classId, parentId: c.id });
                        } else open({ kind: a });
                      }}
                    />
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      open({ kind: "history" });
                    }}
                  >
                    <Icon name="clock" size={18} />
                    Open history
                  </Button>
                )}
              </div>
            </section>

            <AsyncSection
              label={`Attributes of ${c.label}`}
              state={demoState === "empty" || c.attributes.length === 0 ? "empty" : "ready"}
              className="rounded-card border border-default"
              empty={
                <EmptyState
                  title="No attributes yet"
                  action={
                    data.canEdit ? (
                      <Button
                        onClick={() => {
                          open({ kind: "add-attribute" });
                        }}
                      >
                        <Icon name="plus" size={18} />
                        Add attribute
                      </Button>
                    ) : undefined
                  }
                >
                  Suppliers in this category fill in only the common product fields. Add the specifications buyers
                  filter and compare on.
                </EmptyState>
              }
            >
              <AttributeTable
                category={c}
                canEdit={data.canEdit}
                busy={pending}
                onEdit={(attribute) => {
                  open({ kind: "edit-attribute", attribute });
                }}
                onRemove={(attribute) => {
                  open({ kind: "remove-attribute", attribute });
                }}
                onMove={(attribute, direction) => {
                  act(() => moveAttributeAction(attribute.id, direction), `${attribute.label} moved ${direction}`);
                }}
                onToggle={(attribute, field, value) => {
                  act(
                    () => updateAttributeAction(attribute.id, { ...inputOf(attribute), [field]: value }),
                    `${attribute.label} saved`,
                  );
                }}
              />
            </AsyncSection>

            <section
              aria-labelledby="history-title"
              className="flex flex-col gap-3 rounded-card border border-default p-5 md:px-6"
            >
              <h2 id="history-title" className="type-h3">
                Change history
              </h2>
              {c.history.length ? (
                <HistoryList lines={c.history} />
              ) : (
                <p className="type-body text-body">No changes yet.</p>
              )}
              {c.history.length ? (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      open({ kind: "history" });
                    }}
                  >
                    See full history
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>

      {c && (dialog?.kind === "add-attribute" || dialog?.kind === "edit-attribute") ? (
        <AttributeDialog
          key={opened}
          open
          onOpenChange={close}
          category={{
            id: c.id,
            label: c.label,
            parentLabel: c.parentLabel,
            groups: c.groups,
            otherLabels: c.attributes.map((a) => a.label),
          }}
          editing={dialog.kind === "edit-attribute" ? dialog.attribute : null}
          onDone={done}
        />
      ) : null}
      {c && dialog?.kind === "remove-attribute" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          tone="destructive"
          title={`Remove ${dialog.attribute.label}?`}
          description="Suppliers stop seeing it in the product form, and it leaves the filters and compare. You can't remove an attribute products already use."
          confirmLabel="Remove attribute"
          confirmDisabled={pending}
          onConfirm={() => {
            const a = dialog.attribute;
            setDialog(null);
            act(() => removeAttributeAction(a.id), `${a.label} removed`);
          }}
        />
      ) : null}
      {dialog?.kind === "add-category" ? (
        <AddCategoryDialog
          key={opened}
          open
          onOpenChange={close}
          tree={data.tree}
          initialClassId={dialog.classId}
          initialParentId={dialog.parentId}
          onDone={done}
        />
      ) : null}
      {c && dialog?.kind === "rename" ? (
        <RenameCategoryDialog key={opened} open onOpenChange={close} category={c} onDone={done} />
      ) : null}
      {c && dialog?.kind === "move" ? (
        <MoveCategoryDialog key={opened} open onOpenChange={close} tree={data.tree} category={c} onDone={done} />
      ) : null}
      {c && dialog?.kind === "hide" ? (
        <HideCategoryDialog key={opened} open onOpenChange={close} category={c} onDone={done} />
      ) : null}
      {c && dialog?.kind === "applications" ? (
        <ApplicationsDialog
          key={opened}
          open
          onOpenChange={close}
          category={c}
          applications={data.applications}
          onDone={done}
        />
      ) : null}
      {c && dialog?.kind === "history" ? <HistoryDialog key={opened} open onOpenChange={close} category={c} /> : null}
      {c && dialog?.kind === "preview" ? (
        <PreviewDialog open onOpenChange={close} label={c.label} attributes={c.attributes} />
      ) : null}
    </div>
  );
}

const inputOf = (a: AttributeRow): AttributeInput => ({
  label: a.label,
  type: a.type,
  unit: a.unit ?? "",
  allowedValues: a.type === "boolean" || formatAllowedValues(a) === "—" ? "" : formatAllowedValues(a),
  displayGroup: a.displayGroup,
  required: a.required,
  filterable: a.filterable,
  comparable: a.comparable,
  askTestCondition: a.testCondition !== null,
  testCondition: a.testCondition ?? "",
});

type MenuAction = "duplicate" | "move" | "history" | "hide" | "show" | "rename" | "add-sub" | "applications";

/** Menu · Category actions (296:9777), plus Rename and Add sub-category (A11). */
function CategoryMenu(props: { label: string; hidden: boolean; topLevel: boolean; onAction: (a: MenuAction) => void }) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton icon="more-horizontal" label={`More actions for ${props.label}`} look="outline" size="sm" />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem
          icon="pencil"
          onSelect={() => {
            props.onAction("rename");
          }}
        >
          Edit category
        </MenuItem>
        {props.topLevel ? (
          <MenuItem
            icon="plus"
            onSelect={() => {
              props.onAction("add-sub");
            }}
          >
            Add sub-category
          </MenuItem>
        ) : null}
        <MenuItem
          icon="copy"
          onSelect={() => {
            props.onAction("duplicate");
          }}
        >
          Duplicate category
        </MenuItem>
        {props.topLevel ? (
          <MenuItem
            icon="folder"
            onSelect={() => {
              props.onAction("move");
            }}
          >
            Move to another main group
          </MenuItem>
        ) : null}
        {props.topLevel ? (
          <MenuItem
            icon="layout-template"
            onSelect={() => {
              props.onAction("applications");
            }}
          >
            Choose applications
          </MenuItem>
        ) : null}
        <MenuItem
          icon="clock"
          onSelect={() => {
            props.onAction("history");
          }}
        >
          Open history
        </MenuItem>
        <MenuDivider />
        {props.hidden ? (
          <MenuItem
            icon="eye"
            onSelect={() => {
              props.onAction("show");
            }}
          >
            Show category
          </MenuItem>
        ) : (
          <MenuItem
            icon="more-horizontal"
            destructive
            onSelect={() => {
              props.onAction("hide");
            }}
          >
            Hide category
          </MenuItem>
        )}
      </MenuContent>
    </Menu>
  );
}

type Flag = "required" | "filterable" | "comparable";

function AttributeTable(props: {
  category: CatalogueData["category"] & object;
  canEdit: boolean;
  busy: boolean;
  onEdit: (a: AttributeRow) => void;
  onRemove: (a: AttributeRow) => void;
  onMove: (a: AttributeRow, direction: "up" | "down") => void;
  onToggle: (a: AttributeRow, field: Flag, value: boolean) => void;
}) {
  const rows = props.category.attributes;
  // 8 px between columns and 12 px at the edges, as on 636:1023.
  const th = "px-1 py-2.5 text-left align-middle font-normal";
  const td = "px-1 py-4 align-middle";
  const flag = (a: AttributeRow, field: Flag, words: string) => (
    <td className={td}>
      <Checkbox
        checked={a[field]}
        disabled={!props.canEdit || props.busy}
        onCheckedChange={(v) => {
          props.onToggle(a, field, v === true);
        }}
        label={<span className="sr-only">{`${words}: ${a.label}`}</span>}
      />
    </td>
  );
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={`Attribute schema for ${props.category.label}`}
      // relative: Radix checkboxes keep a hidden absolutely-placed input; this keeps them inside the scrolling box,
      // or they would widen the whole page on phones.
      className="relative overflow-x-auto rounded-card"
    >
      <table className="w-full min-w-212 border-collapse">
        <thead className="bg-subtle type-caption text-secondary">
          <tr>
            <th scope="col" className={`${th} pl-3`}>
              Attribute
            </th>
            <th scope="col" className={th}>
              Type
            </th>
            <th scope="col" className={th}>
              Unit
            </th>
            <th scope="col" className={th}>
              Allowed values
            </th>
            <th scope="col" className={th}>
              Required
            </th>
            <th scope="col" className={th}>
              Filterable
            </th>
            <th scope="col" className={th}>
              Test condition
            </th>
            <th scope="col" className={th}>
              Display group
            </th>
            <th scope="col" className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="type-body text-primary">
          {rows.map((a, i) => (
            <tr key={a.id} className={a.isNew ? "border-t border-default bg-mint" : "border-t border-default"}>
              <th scope="row" className={`${td} pl-3 text-left font-normal`}>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="type-label-lg">{a.label}</span>
                  {a.isNew ? <StatusBadge status="New" tone="success" /> : null}
                </span>
              </th>
              <td className={td}>{ATTRIBUTE_TYPE_LABEL[a.type]}</td>
              <td className={`${td} type-spec`}>{a.unit ?? "—"}</td>
              <td className={td}>{formatAllowedValues(a)}</td>
              {flag(a, "required", "Required")}
              {flag(a, "filterable", "Filterable")}
              <td className={td}>{a.testCondition ?? "—"}</td>
              <td className={td}>{a.displayGroup}</td>
              <td className={`${td} pr-3 text-right`}>
                {props.canEdit ? (
                  <AttributeMenu
                    attribute={a}
                    first={i === 0}
                    last={i === rows.length - 1}
                    onEdit={props.onEdit}
                    onRemove={props.onRemove}
                    onMove={props.onMove}
                  />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Attribute actions" (636:1053): not drawn open, built as the other row menus (A11). */
function AttributeMenu(props: {
  attribute: AttributeRow;
  first: boolean;
  last: boolean;
  onEdit: (a: AttributeRow) => void;
  onRemove: (a: AttributeRow) => void;
  onMove: (a: AttributeRow, direction: "up" | "down") => void;
}) {
  const a = props.attribute;
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton icon="more-horizontal" label={`Actions for ${a.label}`} look="outline" size="sm" />
      </MenuTrigger>
      <MenuContent align="end">
        <MenuItem
          icon="pencil"
          onSelect={() => {
            props.onEdit(a);
          }}
        >
          Edit attribute
        </MenuItem>
        <MenuItem
          icon="chevron-up"
          disabled={props.first}
          onSelect={() => {
            props.onMove(a, "up");
          }}
        >
          Move up
        </MenuItem>
        <MenuItem
          icon="chevron-down"
          disabled={props.last}
          onSelect={() => {
            props.onMove(a, "down");
          }}
        >
          Move down
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon="trash"
          destructive
          onSelect={() => {
            props.onRemove(a);
          }}
        >
          Remove attribute
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function CategoryTree({
  tree,
  selectedId,
  loading,
}: {
  tree: TreeClass[];
  selectedId: string | null;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  // Open the class and category that hold the selection; the others start closed, as drawn.
  const [open, setOpen] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const k of tree) {
      for (const cat of k.categories) {
        const inside = cat.children.some((s) => s.id === selectedId);
        if (cat.id === selectedId || inside) ids.add(k.id);
        if (inside) ids.add(cat.id);
      }
    }
    return ids;
  });
  const q = query.trim().toLowerCase();
  const hit = (label: string) => label.toLowerCase().includes(q);
  // While searching, a category shows when it or one of its sub-categories matches; everything matching is open.
  const shown = (n: TreeNode): boolean => !q || hit(n.label) || n.children.some((s) => hit(s.label));
  const subShown = (parent: TreeNode, s: TreeNode) => !q || hit(parent.label) || hit(s.label);
  const classes = tree
    .map((k) => ({ ...k, categories: k.categories.filter(shown) }))
    .filter((k) => !q || k.categories.length > 0);
  const toggle = (id: string) => {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const isOpen = (id: string) => q !== "" || open.has(id);

  return (
    <nav aria-label="Categories" className="flex flex-col gap-0.5 rounded-card border border-default p-2">
      <Input
        type="search"
        leadingIcon="search"
        placeholder="Search categories"
        aria-label="Search categories"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        boxClassName="mb-1"
      />
      {loading ? (
        <div aria-busy="true" className="flex flex-col gap-3 p-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="px-2 py-3 type-body-sm text-secondary">No categories match “{query.trim()}”.</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {classes.map((k) => (
            <li key={k.id}>
              <TreeRow
                depth={0}
                label={k.label}
                count={k.liveProducts}
                expanded={isOpen(k.id)}
                onToggle={() => {
                  toggle(k.id);
                }}
              />
              {isOpen(k.id) ? (
                <ul className="flex flex-col gap-0.5">
                  {k.categories.map((cat) => (
                    <li key={cat.id}>
                      <TreeRow
                        depth={1}
                        node={cat}
                        selected={cat.id === selectedId}
                        expanded={cat.children.length ? isOpen(cat.id) : undefined}
                        onToggle={() => {
                          toggle(cat.id);
                        }}
                      />
                      {cat.children.length && isOpen(cat.id) ? (
                        <ul className="flex flex-col gap-0.5">
                          {cat.children
                            .filter((s) => subShown(cat, s))
                            .map((s) => (
                              <li key={s.id}>
                                <TreeRow depth={2} node={s} selected={s.id === selectedId} />
                              </li>
                            ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

/** Where each level's chevron sits (636:921, 636:926, 636:941): labels line up at 28, 44 and 60 px. */
const INDENT = ["w-2", "w-6", "w-10"] as const;

function TreeRow(props: {
  depth: 0 | 1 | 2;
  node?: TreeNode;
  label?: string;
  count?: number;
  selected?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const label = props.node?.label ?? props.label ?? "";
  const count = props.node?.liveProducts ?? props.count ?? 0;
  const chevron =
    props.expanded === undefined ? (
      <span aria-hidden="true" className="w-3.5 shrink-0" />
    ) : (
      <Icon name={props.expanded ? "chevron-down" : "chevron-right"} size={14} className="shrink-0 text-icon-primary" />
    );
  const words: ReactNode = (
    <>
      <span className="min-w-0 flex-1">
        {label}
        {props.node?.hidden ? <span className="text-secondary"> · hidden</span> : null}
        {props.node?.sample ? <span className="text-secondary"> · sample</span> : null}
      </span>
      <span className="shrink-0 type-caption text-secondary">{count.toLocaleString("en-IN")}</span>
    </>
  );
  const indent = <span aria-hidden="true" className={`shrink-0 ${INDENT[props.depth]}`} />;

  // A class only opens and closes.
  if (!props.node) {
    return (
      <button
        type="button"
        aria-expanded={props.expanded}
        onClick={props.onToggle}
        className="flex w-full items-center gap-1.5 rounded-control py-2 pr-2 text-left type-body text-primary hover:bg-subtle"
      >
        {indent}
        {chevron}
        {words}
      </button>
    );
  }
  return (
    <div className={`flex items-center rounded-control ${props.selected ? "bg-mint" : "hover:bg-subtle"}`}>
      {indent}
      {props.expanded !== undefined ? (
        <button
          type="button"
          aria-expanded={props.expanded}
          aria-label={`${props.expanded ? "Close" : "Open"} ${label}`}
          onClick={props.onToggle}
          className="flex items-center self-stretch rounded-control"
        >
          {chevron}
        </button>
      ) : (
        chevron
      )}
      <Link
        href={href(props.node.id)}
        aria-current={props.selected ? "page" : undefined}
        className={`ml-1.5 flex min-w-0 flex-1 items-center gap-1.5 rounded-control py-2 pr-2 ${props.selected ? "type-label-lg" : "type-body"} text-primary`}
      >
        {words}
      </Link>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-card border border-default p-6">
        <Skeleton />
        <Skeleton />
      </div>
      <div className="flex flex-col gap-1 rounded-card border border-default p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} kind="table-row" />
        ))}
      </div>
    </div>
  );
}
