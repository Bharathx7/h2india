"use client";

import { Button, EmptyState, FormField, Icon, Input, Modal, StatusBadge } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addApplicationAction, setApplicationHiddenAction, updateApplicationAction } from "../actions";

// The applications list (founder QC, 17 Nov 2026): add, rename, hide and show. A new application starts hidden, so
// nothing half-made reaches the site; categories join it from their Applications tab.

export interface ApplicationListRow {
  id: string;
  label: string;
  shortLabel: string;
  examples: string;
  hidden: boolean;
  categories: number;
}

type Form = { label: string; shortLabel: string; examples: string };
const blank: Form = { label: "", shortLabel: "", examples: "" };

export function ApplicationsManager({ rows, canEdit }: { rows: ApplicationListRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ApplicationListRow | "new" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, start] = useTransition();
  const toggle = (row: ApplicationListRow) => {
    start(async () => {
      const r = await setApplicationHiddenAction(row.id, !row.hidden);
      setMessage(
        r.ok
          ? {
              tone: "success",
              text: `${row.shortLabel} is ${row.hidden ? "shown on the site" : "hidden from the site"}`,
            }
          : { tone: "error", text: Object.values(r.errors)[0] ?? "Something went wrong. Try again." },
      );
      router.refresh();
    });
  };
  return (
    <>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="type-h3">Applications</h2>
          <p className="mt-1 type-body text-secondary">
            How buyers browse by use: the home tiles, the Marketplace menu and its landing page. Categories join an
            application from their Applications tab.
          </p>
        </div>
        {canEdit ? (
          <Button
            onClick={() => {
              setEditing("new");
            }}
          >
            <Icon name="plus" size={20} />
            Add application
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
      {rows.length ? (
        <div
          className="relative overflow-x-auto rounded-card border border-default"
          tabIndex={0}
          role="region"
          aria-label="Applications"
        >
          <table className="w-full min-w-200 text-left">
            <thead className="bg-subtle type-label-sm">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Application
                </th>
                <th scope="col" className="px-2 py-3">
                  Short name
                </th>
                <th scope="col" className="px-2 py-3">
                  Categories
                </th>
                <th scope="col" className="px-2 py-3">
                  On the site
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-default align-top">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block type-label">{r.label}</span>
                    {r.examples ? <span className="block type-caption text-secondary">{r.examples}</span> : null}
                  </th>
                  <td className="px-2 py-3 type-body-sm">{r.shortLabel}</td>
                  <td className="px-2 py-3 type-body-sm">{r.categories.toLocaleString("en-IN")}</td>
                  <td className="px-2 py-3">
                    <StatusBadge status={r.hidden ? "Hidden" : "Shown"} tone={r.hidden ? "neutral" : "success"} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit ? (
                      <span className="inline-flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(r);
                          }}
                        >
                          Edit<span className="sr-only"> {r.shortLabel}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            toggle(r);
                          }}
                        >
                          {r.hidden ? "Show" : "Hide"}
                          <span className="sr-only"> {r.shortLabel}</span>
                        </Button>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No applications yet">Add the first one to let buyers browse by use.</EmptyState>
      )}
      {editing ? (
        <ApplicationDialog
          key={editing === "new" ? "new" : editing.id}
          row={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
          }}
          onDone={(text) => {
            setEditing(null);
            setMessage({ tone: "success", text });
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function ApplicationDialog(props: {
  row: ApplicationListRow | null;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [form, setForm] = useState<Form>(
    props.row ? { label: props.row.label, shortLabel: props.row.shortLabel, examples: props.row.examples } : blank,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
  };
  const submit = () => {
    start(async () => {
      const r = props.row ? await updateApplicationAction(props.row.id, form) : await addApplicationAction(form);
      if (!r.ok) {
        setErrors(r.errors);
        return;
      }
      props.onDone(
        props.row
          ? `${form.shortLabel.trim()} saved`
          : `${form.shortLabel.trim()} added. It's hidden until you show it.`,
      );
    });
  };
  return (
    <Modal
      open
      onOpenChange={(o) => {
        if (!o) props.onClose();
      }}
      width={480}
      title={props.row ? `Edit ${props.row.shortLabel}` : "Add an application"}
      description={props.row ? "Its address stays the same." : "It starts hidden, so you can link categories first."}
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {props.row ? "Save" : "Add application"}
          </Button>
        </>
      }
    >
      {errors._ ? (
        <p role="alert" className="type-body-sm text-error">
          {errors._}
        </p>
      ) : null}
      <FormField label="Full name" required error={errors.label} helper="As on the marketplace landing page">
        <Input
          value={form.label}
          maxLength={80}
          onChange={(e) => {
            set("label", e.target.value);
          }}
        />
      </FormField>
      <FormField label="Short name" required error={errors.shortLabel} helper="As on the home tiles and the menu">
        <Input
          value={form.shortLabel}
          maxLength={30}
          onChange={(e) => {
            set("shortLabel", e.target.value);
          }}
        />
      </FormField>
      <FormField label="Examples" error={errors.examples} helper="The line under the name on the home tile">
        <Input
          value={form.examples}
          maxLength={160}
          onChange={(e) => {
            set("examples", e.target.value);
          }}
        />
      </FormField>
    </Modal>
  );
}
