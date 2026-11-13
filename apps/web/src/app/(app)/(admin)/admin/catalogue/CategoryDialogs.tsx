"use client";

import { ATTRIBUTE_TYPE_LABEL, formatAllowedValues, type AttributeDef } from "@h2india/core/catalogue/attributes";
import type { TreeClass } from "@h2india/core/catalogue/taxonomy";
import { Button, Checkbox, ConfirmDialog, FormField, Input, Modal, Select, Skeleton, Textarea } from "@h2india/ui";
import { useEffect, useState, useTransition } from "react";
import {
  addCategoryAction,
  fullHistoryAction,
  moveCategoryAction,
  renameCategoryAction,
  setCategoryApplicationsAction,
  setCategoryHiddenAction,
} from "./actions";
import type { HistoryLine } from "./format";

// The category dialogs. Only Menu · Category actions (296:9777) is drawn; Add category, Rename, Move, the hide
// confirmation, full history and the product form preview are built from the design system (A11).

type Done = (message: string, goTo?: string) => void;

export function AddCategoryDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: TreeClass[];
  initialClassId: string;
  initialParentId: string | null;
  onDone: Done;
}) {
  const [classId, setClassId] = useState(props.initialClassId);
  const [parentId, setParentId] = useState(props.initialParentId ?? "");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const parents = props.tree.find((c) => c.id === classId)?.categories ?? [];

  const submit = () => {
    start(async () => {
      const r = await addCategoryAction({ classId, parentId: parentId || null, label });
      if (!r.ok) {
        setErrors(r.errors);
        return;
      }
      props.onOpenChange(false);
      props.onDone(`${label.trim()} added`, r.value.id);
    });
  };

  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Add a category"
      description="Suppliers choose it when they list a product. Add its attributes next."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              props.onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            Add category
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormError message={errors._} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Class" error={errors.classId}>
            <Select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setParentId("");
              }}
            >
              {props.tree.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Inside" error={errors.parentId}>
            <Select
              value={parentId}
              onChange={(e) => {
                setParentId(e.target.value);
              }}
            >
              <option value="">Nothing: a new category</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Name" required error={errors.label}>
          <Input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
            }}
            autoComplete="off"
          />
        </FormField>
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}

/** Edit category (not drawn, A11): the name and the intro paragraph buyers read on its listing page (A146). */
export function RenameCategoryDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; label: string; description: string | null };
  onDone: Done;
}) {
  const [label, setLabel] = useState(props.category.label);
  const [description, setDescription] = useState(props.category.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const submit = () => {
    start(async () => {
      const r = await renameCategoryAction(props.category.id, label, description);
      if (!r.ok) {
        setErrors(r.errors);
        return;
      }
      props.onOpenChange(false);
      props.onDone(`${label.trim()} saved`);
    });
  };
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`Edit ${props.category.label}`}
      description="The page address stays the same, so links keep working."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              props.onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            Save
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormError message={errors._} />
        <FormField label="Name" required error={errors.label}>
          <Input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
            }}
            autoComplete="off"
          />
        </FormField>
        <FormField
          label="Intro"
          error={errors.description}
          helper={`Shown under the heading on the listing page. ${String(description.length)} / 600`}
        >
          <Textarea
            rows={4}
            maxLength={600}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </FormField>
      </form>
    </Modal>
  );
}

export function MoveCategoryDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: TreeClass[];
  category: { id: string; label: string; classId: string };
  onDone: Done;
}) {
  const [classId, setClassId] = useState(props.category.classId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const to = props.tree.find((c) => c.id === classId)?.label ?? "";
  const submit = () => {
    start(async () => {
      const r = await moveCategoryAction(props.category.id, classId);
      if (!r.ok) {
        setErrors(r.errors);
        return;
      }
      props.onOpenChange(false);
      props.onDone(`${props.category.label} moved to ${to}`);
    });
  };
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      width={480}
      title={`Move ${props.category.label}`}
      description="Its sub-categories, attributes and products move with it."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              props.onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || classId === props.category.classId}>
            Move
          </Button>
        </>
      }
    >
      <FormError message={errors._} />
      <FormField label="Main group" error={errors.classId}>
        <Select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
          }}
        >
          {props.tree.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </FormField>
    </Modal>
  );
}

export function HideCategoryDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; label: string };
  onDone: Done;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <ConfirmDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      tone="destructive"
      title={`Hide ${props.category.label}?`}
      description="Buyers won't see it in the marketplace, menus or search. Its products keep their category, and you can show it again."
      confirmLabel="Hide category"
      confirmDisabled={pending}
      onConfirm={() => {
        start(async () => {
          const r = await setCategoryHiddenAction(props.category.id, true);
          if (!r.ok) {
            setError(Object.values(r.errors)[0] ?? "Something went wrong");
            return;
          }
          props.onOpenChange(false);
          props.onDone(`${props.category.label} is hidden`);
        });
      }}
    >
      <FormError message={error ?? undefined} />
    </ConfirmDialog>
  );
}

export function HistoryDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; label: string };
}) {
  const [lines, setLines] = useState<HistoryLine[] | "loading" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const id = props.category.id;
  // Loads when opened (the dialog is mounted for each opening) and again on Try again.
  useEffect(() => {
    let live = true;
    fullHistoryAction(id)
      .then((r) => {
        if (live) setLines(r.ok ? r.value : "error");
      })
      .catch(() => {
        if (live) setLines("error");
      });
    return () => {
      live = false;
    };
  }, [id, attempt]);
  const load = () => {
    setLines("loading");
    setAttempt((n) => n + 1);
  };
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`Change history · ${props.category.label}`}
      footer={
        <Button
          variant="outline"
          onClick={() => {
            props.onOpenChange(false);
          }}
        >
          Close
        </Button>
      }
    >
      <section aria-label="Change history" aria-busy={lines === "loading"}>
        {lines === "loading" ? (
          <div className="flex flex-col gap-3">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : lines === "error" ? (
          <div className="flex flex-col items-start gap-3">
            <p className="type-body text-body">We couldn't load the history. Check your connection and try again.</p>
            <Button variant="outline" size="sm" onClick={load}>
              Try again
            </Button>
          </div>
        ) : lines.length === 0 ? (
          <p className="type-body text-body">No changes yet.</p>
        ) : (
          <HistoryList lines={lines} />
        )}
      </section>
    </Modal>
  );
}

export function HistoryList({ lines }: { lines: HistoryLine[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {lines.map((l, i) => (
        <li key={i} className="grid gap-1 md:grid-cols-[170px_1fr] md:gap-4">
          <span className="type-spec text-secondary">{l.when}</span>
          <span className="type-body text-primary">{l.text}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Preview product form (636:596): what suppliers fill in for the category, built from its schema in display order
 * and grouped as the spec table is. Read-only; the product editor itself is step 8.3.
 */
export function PreviewDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  attributes: AttributeDef[];
}) {
  const groups = [...new Set(props.attributes.map((a) => a.displayGroup))];
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={`Product form · ${props.label}`}
      description="What suppliers fill in for this category, after the common product fields. A preview: nothing here is saved."
      footer={
        <Button
          variant="outline"
          onClick={() => {
            props.onOpenChange(false);
          }}
        >
          Close preview
        </Button>
      }
    >
      {props.attributes.length === 0 ? (
        <p className="type-body text-body">
          This category has no attributes yet, so suppliers see only the common fields.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <fieldset key={g} className="flex flex-col gap-4 rounded-card border border-default p-4">
              <legend className="px-1 type-eyebrow text-secondary">{g}</legend>
              {props.attributes
                .filter((a) => a.displayGroup === g)
                .map((a) => (
                  <PreviewField key={a.key} def={a} />
                ))}
            </fieldset>
          ))}
        </div>
      )}
    </Modal>
  );
}

function PreviewField({ def }: { def: AttributeDef }) {
  const allowed = formatAllowedValues(def);
  const helper = [
    def.type === "choice" || def.type === "boolean" ? null : allowed !== "—" ? `Allowed: ${allowed}` : null,
    def.testCondition ? `Test condition: ${def.testCondition}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const unit = def.unit ?? undefined;
  return (
    <FormField label={def.label} required={def.required} helper={helper || ATTRIBUTE_TYPE_LABEL[def.type]}>
      {def.type === "choice" ? (
        <Select disabled placeholder="Choose">
          {def.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      ) : def.type === "boolean" ? (
        <Select disabled placeholder="Yes or no">
          <option>Yes</option>
          <option>No</option>
        </Select>
      ) : def.type === "range" ? (
        <div className="grid grid-cols-2 gap-2">
          <Input disabled placeholder="Min" suffix={unit} aria-label={`${def.label}, lowest`} />
          <Input disabled placeholder="Max" suffix={unit} aria-label={`${def.label}, highest`} />
        </div>
      ) : (
        <Input disabled placeholder={def.type === "text" ? (def.hint ?? "") : ""} suffix={unit} />
      )}
    </FormField>
  );
}

function FormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="type-body-sm text-error">
      {message}
    </p>
  ) : null;
}

/** Choose applications (not drawn, A11): where the category appears under Browse by application (step 6.2). */
export function ApplicationsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; label: string; applicationIds: string[] };
  applications: { id: string; label: string; hidden: boolean }[];
  onDone: Done;
}) {
  const [chosen, setChosen] = useState<string[]>(props.category.applicationIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = () => {
    start(async () => {
      const r = await setCategoryApplicationsAction(props.category.id, chosen);
      if (!r.ok) {
        setError(Object.values(r.errors)[0] ?? "Something went wrong. Try again.");
        return;
      }
      props.onOpenChange(false);
      props.onDone(`Applications saved for ${props.category.label}`);
    });
  };
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      width={480}
      title={`Applications for ${props.category.label}`}
      description="Buyers browsing these applications see this category on the application page."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              props.onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            Save
          </Button>
        </>
      }
    >
      <FormError message={error ?? undefined} />
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Applications</legend>
        {props.applications.map((a) => (
          <Checkbox
            key={a.id}
            checked={chosen.includes(a.id)}
            onCheckedChange={(v) => {
              setChosen((c) => (v === true ? [...c, a.id] : c.filter((x) => x !== a.id)));
            }}
            label={a.hidden ? `${a.label} (hidden)` : a.label}
          />
        ))}
      </fieldset>
    </Modal>
  );
}
