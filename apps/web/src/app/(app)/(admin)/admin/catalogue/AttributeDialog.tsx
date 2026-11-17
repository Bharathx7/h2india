"use client";

import {
  ATTRIBUTE_TYPE_LABEL,
  ATTRIBUTE_TYPES,
  checkAttribute,
  formatAllowedValues,
  type AttributeDef,
  type AttributeInput,
} from "@h2india/core/catalogue/attributes";
import { Button, Drawer, FormField, Input, Select, Switch } from "@h2india/ui";
import { useState, useTransition } from "react";
import { addAttributeAction, updateAttributeAction } from "./actions";

// Dialog · Add attribute (637:417), also used to edit an attribute (not drawn, A11). The browser checks with the same
// rules as the server (checkAttribute); the server checks again and answers with the same words.

const NEW_GROUP = "__new";

export interface AttributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; label: string; parentLabel: string | null; groups: string[]; otherLabels: string[] };
  /** Editing this attribute; adding when absent. `inUse`: products that store a value for it (type and unit lock). */
  editing?: (AttributeDef & { id: string; inUse?: number }) | null;
  onDone: (message: string) => void;
}

const blank: AttributeInput = {
  label: "",
  type: "number",
  unit: "",
  allowedValues: "",
  displayGroup: "",
  required: false,
  filterable: false,
  comparable: false,
  askTestCondition: false,
  testCondition: "",
};

const fromDef = (d: AttributeDef): AttributeInput => ({
  label: d.label,
  type: d.type,
  unit: d.unit ?? "",
  allowedValues: formatAllowedValues(d) === "—" || d.type === "boolean" ? "" : formatAllowedValues(d),
  displayGroup: d.displayGroup,
  required: d.required,
  filterable: d.filterable,
  comparable: d.comparable,
  askTestCondition: d.testCondition !== null,
  testCondition: d.testCondition ?? "",
});

/** "diaphragm compression systems": the dialog's line names the kind of product (637:417). */
export function productKind(label: string, parentLabel: string | null): string {
  return [label, parentLabel].filter(Boolean).join(" ").toLowerCase();
}

export function AttributeDialog({ open, onOpenChange, category, editing, onDone }: AttributeDialogProps) {
  // The dialog is mounted fresh for each opening (keyed by the caller), so the initial values are enough.
  const [form, setForm] = useState<AttributeInput>(() => (editing ? fromDef(editing) : blank));
  const [groupChoice, setGroupChoice] = useState(() => form.displayGroup);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof AttributeInput>(key: K, value: AttributeInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const numeric = form.type === "number" || form.type === "range";
  const others = category.otherLabels.filter((l) => l !== editing?.label);
  const locked = editing?.inUse ?? 0;

  const submit = () => {
    const checked = checkAttribute(form, others);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    start(async () => {
      const result = editing
        ? await updateAttributeAction(editing.id, form)
        : await addAttributeAction(category.id, form);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      onOpenChange(false);
      onDone(editing ? `${checked.value.label} saved` : `${checked.value.label} added to ${category.label}`);
    });
  };

  return (
    // A side panel (founder QC, 17 Nov 2026), so the table stays in view while an attribute is edited.
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Edit ${editing.label}` : `Add an attribute to ${category.label}`}
      description={`Suppliers see this field in the product form for ${productKind(category.label, category.parentLabel)}.`}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {editing ? "Save changes" : "Add attribute"}
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
        {errors._ ? (
          <p role="alert" className="type-body-sm text-error">
            {errors._}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Name" required error={errors.label}>
            <Input
              value={form.label}
              onChange={(e) => {
                set("label", e.target.value);
              }}
              autoComplete="off"
            />
          </FormField>
          <FormField
            label="Type"
            error={errors.type}
            helper={
              locked
                ? `${String(locked)} ${locked === 1 ? "product uses" : "products use"} it: type and unit are locked`
                : undefined
            }
          >
            <Select
              disabled={locked > 0}
              value={form.type}
              onChange={(e) => {
                set("type", e.target.value);
              }}
            >
              {ATTRIBUTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ATTRIBUTE_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Unit" error={errors.unit}>
            <Input
              value={form.type === "choice" || form.type === "boolean" ? "" : form.unit}
              onChange={(e) => {
                set("unit", e.target.value);
              }}
              disabled={locked > 0 || form.type === "choice" || form.type === "boolean"}
              autoComplete="off"
            />
          </FormField>
          <FormField
            label="Allowed values"
            error={errors.allowedValues}
            helper={
              form.type === "text"
                ? "A hint for suppliers, for example L × W"
                : "Min–max for numbers, or a comma-separated list for choices"
            }
          >
            <Input
              value={form.type === "boolean" ? "" : form.allowedValues}
              onChange={(e) => {
                set("allowedValues", e.target.value);
              }}
              disabled={form.type === "boolean"}
              inputMode={numeric ? "decimal" : undefined}
              autoComplete="off"
            />
          </FormField>
        </div>
        <FormField label="Display group" error={groupChoice === NEW_GROUP ? undefined : errors.displayGroup}>
          <Select
            value={groupChoice}
            placeholder="Choose a group"
            onChange={(e) => {
              setGroupChoice(e.target.value);
              set("displayGroup", e.target.value === NEW_GROUP ? "" : e.target.value);
            }}
          >
            {category.groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            <option value={NEW_GROUP}>New group…</option>
          </Select>
        </FormField>
        {groupChoice === NEW_GROUP ? (
          <FormField label="New group name" required error={errors.displayGroup}>
            <Input
              value={form.displayGroup}
              onChange={(e) => {
                set("displayGroup", e.target.value);
              }}
              autoComplete="off"
            />
          </FormField>
        ) : null}
        <div className="flex flex-col gap-3">
          <Switch
            label="Required"
            checked={form.required}
            onCheckedChange={(v) => {
              set("required", v);
            }}
          />
          <Switch
            label="Filterable on search and category pages"
            checked={form.filterable}
            onCheckedChange={(v) => {
              set("filterable", v);
            }}
          />
          <Switch
            label="Comparable in compare and the table view"
            checked={form.comparable}
            onCheckedChange={(v) => {
              set("comparable", v);
            }}
          />
          <Switch
            label="Ask for a test condition"
            checked={form.askTestCondition}
            onCheckedChange={(v) => {
              set("askTestCondition", v);
            }}
          />
        </div>
        {form.askTestCondition ? (
          <FormField
            label="Test condition label"
            error={errors.testCondition}
            helper={`Shown next to the value, e.g. "72 dB(A) at 1 m"`}
          >
            <Input
              value={form.testCondition}
              onChange={(e) => {
                set("testCondition", e.target.value);
              }}
              autoComplete="off"
            />
          </FormField>
        ) : null}
        {/* Enter submits the form from any field. */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Drawer>
  );
}
