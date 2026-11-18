"use client";

import { ATTRIBUTE_TYPE_LABEL, formatAllowedValues, type AttributeInput } from "@h2india/core/catalogue/attributes";
import type { AttributeRow, CategoryDetail, TreeClass, TreeNode } from "@h2india/core/catalogue/taxonomy";
import {
  AsyncSection,
  Button,
  buttonClasses,
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
  cx,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  duplicateCategoryAction,
  moveAttributeAction,
  removeAttributeAction,
  reorderCategoryAction,
  setCategoryHiddenAction,
  updateAttributeAction,
} from "./actions";
import { AttributeDialog } from "./AttributeDialog";
import {
  AddCategoryDialog,
  ApplicationsDialog,
  HideCategoryDialog,
  HistoryList,
  MoveCategoryDialog,
  PreviewDialog,
  RenameCategoryDialog,
} from "./CategoryDialogs";
import type { HistoryLine } from "./format";

// Admin Catalogue · Taxonomy (636:596), restructured in founder QC (17 Nov 2026): the tree on the left with search,
// filters and real live counts; the selected category on the right with tabs (Attributes, Details, Applications,
// History). Attributes are grouped by display group, a sub-category shows the attributes it inherits, and ticking
// Required, Filterable or Comparable is held in a Save bar instead of saving on every click. The back office is
// desktop only (the larger-screen cover), so there is no phone layout.

export type CatalogueTab = "attributes" | "details" | "applications" | "history";

export interface CatalogueData {
  tree: TreeClass[];
  canEdit: boolean;
  applications: { id: string; label: string; hidden: boolean }[];
  tab: CatalogueTab;
  category: (CategoryDetail & { meta: string; history: HistoryLine[] }) | null;
}

type Dialog =
  | { kind: "add-attribute" }
  | { kind: "edit-attribute"; attribute: AttributeRow }
  | { kind: "remove-attribute"; attribute: AttributeRow }
  | { kind: "add-category"; classId: string; parentId: string | null }
  | { kind: "rename" | "move" | "hide" | "preview" | "applications" | "duplicate" };

const href = (id: string, tab?: CatalogueTab) =>
  `/admin/catalogue?category=${id}${tab && tab !== "attributes" ? `&tab=${tab}` : ""}`;

type Flag = "required" | "filterable" | "comparable";
type Pending = Record<string, Partial<Record<Flag, boolean>>>;

export function CatalogueView({ data, demoState }: { data: CatalogueData; demoState?: "loading" | "empty" | "error" }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [opened, setOpened] = useState(0);
  // Founder QC: errors showed in success green; each message carries its tone.
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<Pending>({});
  const [busy, start] = useTransition();
  const c = data.category;
  const changed = Object.values(pending).reduce((n, f) => n + Object.keys(f).length, 0);

  const open = (d: Dialog) => {
    setOpened((n) => n + 1);
    setDialog(d);
  };
  const close = (isOpen: boolean) => {
    if (!isOpen) setDialog(null);
  };
  const done = (text: string, goTo?: string) => {
    setMessage({ tone: "success", text });
    if (goTo) router.push(href(goTo));
    else router.refresh();
  };
  const act = (work: () => Promise<{ ok: boolean; errors?: Record<string, string> }>, text: string) => {
    start(async () => {
      const r = await work();
      setMessage(
        r.ok
          ? { tone: "success", text }
          : { tone: "error", text: Object.values(r.errors ?? {})[0] ?? "Something went wrong. Try again." },
      );
      router.refresh();
    });
  };
  const saveFlags = () => {
    if (!c) return;
    start(async () => {
      for (const a of c.attributes) {
        const change = pending[a.id];
        if (!change) continue;
        const r = await updateAttributeAction(a.id, { ...inputOf(a), ...change });
        if (!r.ok) {
          setMessage({ tone: "error", text: `${a.label}: ${Object.values(r.errors)[0] ?? "not saved"}` });
          router.refresh();
          return;
        }
      }
      setPending({});
      setMessage({ tone: "success", text: `${String(changed)} ${changed === 1 ? "change" : "changes"} saved` });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="type-h2">Catalogue</h1>
          <p className="mt-1 type-body text-secondary">
            Categories and the spec fields each one asks for. Changes here shape every product form and filter in that
            category.
          </p>
        </div>
        <Link href="/admin/catalogue/applications" className={buttonClasses({ variant: "ghost" })}>
          <Icon name="layout-template" size={20} />
          Applications
        </Link>
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

      <p
        role="status"
        aria-live="polite"
        className={message ? `type-body-sm ${message.tone === "error" ? "text-error" : "text-success"}` : "sr-only"}
      >
        {message?.text}
      </p>

      <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-6">
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
                  <p className="type-label-sm text-secondary">
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
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        open({ kind: "rename" });
                      }}
                    >
                      <Icon name="pencil" size={18} />
                      Edit
                    </Button>
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
                        if (a === "show") {
                          act(() => setCategoryHiddenAction(c.id, false), `${c.label} is shown again`);
                        } else if (a === "up" || a === "down") {
                          act(() => reorderCategoryAction(c.id, a), `${c.label} moved ${a} the list`);
                        } else if (a === "add-sub") {
                          open({ kind: "add-category", classId: c.classId, parentId: c.id });
                        } else open({ kind: a });
                      }}
                    />
                  </>
                ) : null}
              </div>
            </section>

            <nav aria-label={`${c.label} sections`} className="flex gap-6 border-b border-default">
              {TABS.filter((t) => t.key !== "applications" || c.parentId === null).map((t) => (
                <Link
                  key={t.key}
                  href={href(c.id, t.key)}
                  aria-current={data.tab === t.key ? "page" : undefined}
                  className={cx(
                    "-mb-px border-b-2 py-3 type-label whitespace-nowrap",
                    data.tab === t.key ? "border-inverse text-primary" : "border-transparent text-secondary",
                  )}
                >
                  {t.label}
                  {t.key === "attributes" ? (
                    <span className="text-secondary"> {c.attributes.length + c.inherited.length}</span>
                  ) : null}
                </Link>
              ))}
            </nav>

            {data.tab === "details" ? (
              <DetailsPanel
                category={c}
                canEdit={data.canEdit}
                onEdit={() => {
                  open({ kind: "rename" });
                }}
                onMove={() => {
                  open({ kind: "move" });
                }}
                onHide={() => {
                  open({ kind: "hide" });
                }}
                onShow={() => {
                  act(() => setCategoryHiddenAction(c.id, false), `${c.label} is shown again`);
                }}
              />
            ) : data.tab === "applications" && c.parentId === null ? (
              <section className="flex flex-col gap-4 rounded-card border border-default p-5 md:px-6">
                <p className="type-body text-body">
                  Buyers browsing by application find {c.label} under these. Hidden applications are not on the site.
                </p>
                {c.applicationIds.length ? (
                  <ul className="flex flex-wrap gap-2">
                    {data.applications
                      .filter((a) => c.applicationIds.includes(a.id))
                      .map((a) => (
                        <li key={a.id} className="rounded-pill bg-mint px-3 py-1 type-label">
                          {a.label}
                          {a.hidden ? <span className="text-secondary"> · hidden</span> : null}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="type-body-sm text-secondary">Not listed under any application yet.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {data.canEdit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        open({ kind: "applications" });
                      }}
                    >
                      Choose applications
                    </Button>
                  ) : null}
                  <Link
                    href="/admin/catalogue/applications"
                    className={buttonClasses({ variant: "ghost", size: "sm" })}
                  >
                    Manage the applications list
                  </Link>
                </div>
              </section>
            ) : data.tab === "history" ? (
              <HistoryPanel lines={c.history} />
            ) : (
              <>
                {c.inherited.length ? <InheritedTable category={c} /> : null}
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
                      {c.inherited.length
                        ? `Products here fill in ${c.parentLabel ?? "the parent"}'s attributes above. Add fields only this sub-category needs.`
                        : "Suppliers in this category fill in only the common product fields. Add the specifications buyers filter and compare on."}
                    </EmptyState>
                  }
                >
                  <AttributeTable
                    category={c}
                    canEdit={data.canEdit}
                    busy={busy}
                    pending={pending}
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
                      setPending((p) => {
                        // A box ticked back to its saved value is no longer a change.
                        const mine = Object.fromEntries(
                          Object.entries({ ...p[attribute.id], [field]: value }).filter(
                            ([k, v]) => v !== attribute[k as Flag],
                          ),
                        );
                        return Object.fromEntries(
                          Object.entries({ ...p, [attribute.id]: mine }).filter(([, f]) => Object.keys(f).length > 0),
                        );
                      });
                    }}
                  />
                </AsyncSection>
                {changed ? (
                  <div
                    role="region"
                    aria-label="Unsaved changes"
                    data-surface="inverse"
                    className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-card bg-inverse px-5 py-3 text-inverse shadow-ink-float"
                  >
                    <span className="flex-1 type-label">
                      {changed} unsaved {changed === 1 ? "change" : "changes"}. They change every product form and
                      filter in {c.label}.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setPending({});
                      }}
                    >
                      Discard
                    </Button>
                    <Button size="sm" disabled={busy} onClick={saveFlags}>
                      Save changes
                    </Button>
                  </div>
                ) : null}
              </>
            )}
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
          description="Suppliers stop seeing it in the product form, and it leaves the filters and compare."
          confirmLabel="Remove attribute"
          confirmDisabled={busy}
          onConfirm={() => {
            const a = dialog.attribute;
            setDialog(null);
            act(() => removeAttributeAction(a.id), `${a.label} removed`);
          }}
        />
      ) : null}
      {c && dialog?.kind === "duplicate" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title={`Duplicate ${c.label}?`}
          description="A hidden copy with the same attributes appears beside it, for you to rename and adjust. Products stay where they are."
          confirmLabel="Duplicate"
          confirmDisabled={busy}
          onConfirm={() => {
            setDialog(null);
            start(async () => {
              const r = await duplicateCategoryAction(c.id);
              if (r.ok) done(`${c.label} copied. The copy is hidden until you show it.`, r.value.id);
              else
                setMessage({ tone: "error", text: Object.values(r.errors)[0] ?? "Something went wrong. Try again." });
            });
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
      {c && dialog?.kind === "preview" ? (
        <PreviewDialog open onOpenChange={close} label={c.label} attributes={[...c.inherited, ...c.attributes]} />
      ) : null}
    </div>
  );
}

const TABS: { key: CatalogueTab; label: string }[] = [
  { key: "attributes", label: "Attributes" },
  { key: "details", label: "Details" },
  { key: "applications", label: "Applications" },
  { key: "history", label: "History" },
];

/** Name, place in the tree and visibility, with the actions that change them. */
function DetailsPanel(props: {
  category: CatalogueData["category"] & object;
  canEdit: boolean;
  onEdit: () => void;
  onMove: () => void;
  onHide: () => void;
  onShow: () => void;
}) {
  const c = props.category;
  const row = (term: string, value: ReactNode) => (
    <div className="contents">
      <dt className="type-body-sm text-secondary">{term}</dt>
      <dd className="type-body text-primary">{value}</dd>
    </div>
  );
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default p-5 md:px-6">
      <dl className="grid grid-cols-[180px_minmax(0,1fr)] gap-x-4 gap-y-3">
        {row("Name", c.label)}
        {row("Description", c.description || <span className="text-secondary">None yet</span>)}
        {row("Main group", c.classLabel)}
        {c.parentLabel ? row("Inside", c.parentLabel) : null}
        {row("Live products", c.liveProducts.toLocaleString("en-IN"))}
        {row("On the site", c.hidden ? "Hidden from every public list" : "Shown")}
      </dl>
      {props.canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={props.onEdit}>
            Edit name and description
          </Button>
          <Button variant="outline" size="sm" onClick={props.onMove}>
            {c.parentId ? "Move to another category" : "Move to another main group"}
          </Button>
          {c.hidden ? (
            <Button variant="outline" size="sm" onClick={props.onShow}>
              Show on the site
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={props.onHide}>
              Hide from the site
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}

const HISTORY_PAGE = 25;

/** Every change to the category, newest first, 25 at a time. */
function HistoryPanel({ lines }: { lines: HistoryLine[] }) {
  const [shown, setShown] = useState(HISTORY_PAGE);
  return (
    <section
      aria-labelledby="history-title"
      className="flex flex-col gap-3 rounded-card border border-default p-5 md:px-6"
    >
      <h3 id="history-title" className="type-h4">
        Change history
      </h3>
      {lines.length ? (
        <HistoryList lines={lines.slice(0, shown)} />
      ) : (
        <p className="type-body text-body">No changes yet.</p>
      )}
      {lines.length > shown ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShown((n) => n + HISTORY_PAGE);
            }}
          >
            Show older changes
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** A sub-category's inherited attributes: read-only here, changed on the parent. */
function InheritedTable({ category: c }: { category: CatalogueData["category"] & object }) {
  return (
    <section
      aria-label={`Attributes from ${c.parentLabel ?? "the parent"}`}
      className="rounded-card border border-default bg-subtle p-4"
    >
      <p className="type-label">
        From {c.parentLabel}: {c.inherited.length} {c.inherited.length === 1 ? "attribute" : "attributes"} products here
        fill in first
      </p>
      <p className="mt-1 type-body-sm text-secondary">
        {c.inherited
          .map((a) => `${a.label}${a.unit ? ` (${a.unit})` : ""}${a.required ? ", required" : ""}`)
          .join(" · ")}
      </p>
      {c.parentId ? (
        <Link href={href(c.parentId)} className="mt-2 inline-block type-label-sm text-link underline">
          Change them on {c.parentLabel}
        </Link>
      ) : null}
    </section>
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

type MenuAction = "duplicate" | "move" | "hide" | "show" | "add-sub" | "applications" | "up" | "down";

/** Menu · Category actions (296:9777), plus Add sub-category, Move (sub-categories too) and the list order. */
function CategoryMenu(props: { label: string; hidden: boolean; topLevel: boolean; onAction: (a: MenuAction) => void }) {
  const item = (
    action: MenuAction,
    icon: Parameters<typeof MenuItem>[0]["icon"],
    words: string,
    destructive = false,
  ) => (
    <MenuItem
      icon={icon}
      destructive={destructive}
      onSelect={() => {
        props.onAction(action);
      }}
    >
      {words}
    </MenuItem>
  );
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton icon="more-horizontal" label={`More actions for ${props.label}`} look="outline" size="sm" />
      </MenuTrigger>
      <MenuContent align="end">
        {props.topLevel ? item("add-sub", "plus", "Add sub-category") : null}
        {item("duplicate", "copy", "Duplicate category")}
        {item("move", "folder", props.topLevel ? "Move to another main group" : "Move to another category")}
        {item("up", "chevron-up", "Move up the list")}
        {item("down", "chevron-down", "Move down the list")}
        {props.topLevel ? item("applications", "layout-template", "Choose applications") : null}
        <MenuDivider />
        {props.hidden ? item("show", "eye", "Show category") : item("hide", "minus", "Hide category", true)}
      </MenuContent>
    </Menu>
  );
}

function AttributeTable(props: {
  category: CatalogueData["category"] & object;
  canEdit: boolean;
  busy: boolean;
  pending: Pending;
  onEdit: (a: AttributeRow) => void;
  onRemove: (a: AttributeRow) => void;
  onMove: (a: AttributeRow, direction: "up" | "down") => void;
  onToggle: (a: AttributeRow, field: Flag, value: boolean) => void;
}) {
  const rows = props.category.attributes;
  // Grouped as the spec table and the product form show them (display group, then order).
  const groups = [...new Set(rows.map((a) => a.displayGroup))];
  const th = "px-1 py-2.5 text-left align-middle font-normal";
  const td = "px-1 py-3 align-middle";
  const value = (a: AttributeRow, field: Flag) => props.pending[a.id]?.[field] ?? a[field];
  const flag = (a: AttributeRow, field: Flag, words: string) => {
    const changed = props.pending[a.id]?.[field] !== undefined;
    return (
      <td className={cx(td, changed && "bg-warning")}>
        <Checkbox
          checked={value(a, field)}
          disabled={!props.canEdit || props.busy}
          onCheckedChange={(v) => {
            props.onToggle(a, field, v === true);
          }}
          label={<span className="sr-only">{`${words}: ${a.label}`}</span>}
        />
      </td>
    );
  };
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={`Attribute schema for ${props.category.label}`}
      // relative: Radix checkboxes keep a hidden absolutely-placed input; this keeps them inside the scrolling box.
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
              Comparable
            </th>
            <th scope="col" className={th}>
              Test condition
            </th>
            <th scope="col" className={th}>
              Used by
            </th>
            <th scope="col" className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g} className="type-body text-primary">
            <tr className="border-t border-default">
              <th
                scope="colgroup"
                colSpan={10}
                className="bg-page px-3 pt-4 pb-1 text-left type-label-sm text-secondary"
              >
                {g}
              </th>
            </tr>
            {rows
              .filter((a) => a.displayGroup === g)
              .map((a) => {
                const i = rows.indexOf(a);
                return (
                  <tr key={a.id} className={a.isNew ? "border-t border-default bg-mint" : "border-t border-default"}>
                    <th scope="row" className={`${td} pl-3 text-left font-normal`}>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="type-label-lg">{a.label}</span>
                        {a.isNew ? <StatusBadge status="New" tone="success" /> : null}
                      </span>
                      <span className="block type-caption text-secondary">Key: {a.key}</span>
                    </th>
                    <td className={td}>{ATTRIBUTE_TYPE_LABEL[a.type]}</td>
                    <td className={`${td} type-spec`}>{a.unit ?? "—"}</td>
                    <td className={td}>{formatAllowedValues(a)}</td>
                    {flag(a, "required", "Required")}
                    {flag(a, "filterable", "Filterable")}
                    {flag(a, "comparable", "Comparable")}
                    <td className={td}>{a.testCondition ?? "—"}</td>
                    <td className={`${td} type-body-sm`}>
                      {a.inUse ? `${a.inUse.toLocaleString("en-IN")} ${a.inUse === 1 ? "product" : "products"}` : "—"}
                    </td>
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
                );
              })}
          </tbody>
        ))}
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
        {/* Products that use it would lose their values (A107): make it optional instead. */}
        <MenuItem
          icon="trash"
          destructive
          disabled={a.inUse > 0}
          onSelect={() => {
            props.onRemove(a);
          }}
        >
          {a.inUse > 0 ? "Can't remove: products use it" : "Remove attribute"}
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
  const [filter, setFilter] = useState<TreeFilter>("all");
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
  const pass = (n: TreeNode) =>
    filter === "all" || (filter === "hidden" ? n.hidden : filter === "sample" ? n.sample : n.attributes === 0);
  const hit = (n: TreeNode) => (!q || n.label.toLowerCase().includes(q)) && pass(n);
  // While searching or filtering, a category shows when it or one of its sub-categories matches; all of it is open.
  const narrowing = q !== "" || filter !== "all";
  const shown = (n: TreeNode): boolean => !narrowing || hit(n) || n.children.some(hit);
  const subShown = (parent: TreeNode, s: TreeNode) => !narrowing || hit(parent) || hit(s);
  const classes = tree
    .map((k) => ({ ...k, categories: k.categories.filter(shown) }))
    .filter((k) => !narrowing || k.categories.length > 0);
  const toggle = (id: string) => {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const isOpen = (id: string) => narrowing || open.has(id);

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
      <div role="group" aria-label="Show" className="mb-1 flex flex-wrap gap-1.5 px-1">
        {TREE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => {
              setFilter(f.key);
            }}
            className={cx(
              "inline-flex h-7 items-center rounded-pill border px-2.5 type-label-sm",
              filter === f.key ? "border-transparent bg-inverse text-inverse" : "border-control bg-page text-primary",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div aria-busy="true" className="flex flex-col gap-3 p-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="px-2 py-3 type-body-sm text-secondary">
          {q ? `No categories match “${query.trim()}”.` : "No categories here."}
        </p>
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

type TreeFilter = "all" | "hidden" | "sample" | "empty";
const TREE_FILTERS: { key: TreeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hidden", label: "Hidden" },
  { key: "sample", label: "Sample" },
  { key: "empty", label: "No attributes" },
];

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
