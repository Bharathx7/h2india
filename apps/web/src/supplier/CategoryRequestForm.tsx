"use client";

import { Alert, Button, FormField, Input, Select, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestCategoryAction } from "./company-actions";

// Request a category (supplier QC, 16 Nov 2026): where it would sit, its name, what it is for, an example product.
// The limits match categoryRequestProblems() in core, which checks again on the server.

export interface ClassOption {
  id: string;
  label: string;
  categories: { id: string; label: string }[];
}

const LIMITS = { label: 80, description: 600, example: 160 };

export function CategoryRequestForm({ classes, initialLabel = "" }: { classes: ClassOption[]; initialLabel?: string }) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [parentId, setParentId] = useState("");
  const [label, setLabel] = useState(initialLabel);
  const [description, setDescription] = useState("");
  const [example, setExample] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const parents = classes.find((c) => c.id === classId)?.categories ?? [];

  const submit = () => {
    const e: Record<string, string> = {};
    if (!label.trim()) e.label = "Name the category";
    if (!description.trim()) e.description = "Say what products it is for";
    setErrors(e);
    if (Object.keys(e).length) return;
    start(async () => {
      const r = await requestCategoryAction({ classId, parentId, label, description, example });
      if (r.ok) {
        setSent(true);
        setError("");
        setErrors({});
        setLabel("");
        setDescription("");
        setExample("");
        router.refresh();
      } else {
        setError(r.error);
        setErrors(r.errors ?? {});
      }
    });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-5 rounded-card border border-default bg-page p-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {sent ? (
        <Alert tone="success" title="Request sent" live>
          We&apos;ll review it within 2 working days and tell you here and in your notifications.
        </Alert>
      ) : null}
      {error ? <Alert tone="error" title={error} live /> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField label="Class" error={errors.classId} required>
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setParentId("");
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Under an existing category (optional)"
          helper="Leave empty for a new category in the class."
          error={errors.parentId}
        >
          <Select
            value={parentId}
            onChange={(e) => {
              setParentId(e.target.value);
            }}
          >
            <option value="">None: a new category</option>
            {parents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Category name" error={errors.label} required>
        <Input
          value={label}
          maxLength={LIMITS.label}
          placeholder="Hydrogen leak sensors"
          onChange={(e) => {
            setLabel(e.target.value);
          }}
        />
      </FormField>
      <FormField label="What products is it for?" error={errors.description} required>
        <Textarea
          value={description}
          maxLength={LIMITS.description}
          rows={4}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
        />
      </FormField>
      <FormField label="An example product you want to list (optional)" error={errors.example}>
        <Input
          value={example}
          maxLength={LIMITS.example}
          onChange={(e) => {
            setExample(e.target.value);
          }}
        />
      </FormField>
      <div>
        <Button type="submit" disabled={pending}>
          Send request
        </Button>
      </div>
    </form>
  );
}
