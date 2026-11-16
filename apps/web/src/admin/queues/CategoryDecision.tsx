"use client";

import { Alert, Button, FormField, Input, Select, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveCategoryAction, rejectCategoryAction } from "./category-actions";

// Approve (with the name and place settled on) or reject with a reason (supplier QC, 16 Nov 2026).

export interface PlaceOption {
  id: string;
  label: string;
  categories: { id: string; label: string }[];
}

export function CategoryDecision({
  id,
  classes,
  start,
  canApprove,
}: {
  id: string;
  classes: PlaceOption[];
  start: { classId: string; parentId: string; label: string };
  canApprove: boolean;
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(start.classId);
  const [parentId, setParentId] = useState(start.parentId);
  const [label, setLabel] = useState(start.label);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, run] = useTransition();
  const parents = classes.find((c) => c.id === classId)?.categories ?? [];

  const done = (r: { ok: true } | { ok: false; error: string; errors?: Record<string, string> }) => {
    if (r.ok) {
      router.push("/admin/queues/categories");
      router.refresh();
    } else {
      setError(r.error);
      setErrors(r.errors ?? {});
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error ? <Alert tone="error" title={error} live /> : null}
      {canApprove ? (
        <section
          aria-labelledby="approve"
          className="flex flex-col gap-4 rounded-card border border-default bg-page p-5"
        >
          <h2 id="approve" className="type-h4">
            Approve
          </h2>
          <p className="type-body-sm text-secondary">
            Approving adds the category to the catalogue. Fix the name or where it sits first if needed; add its
            attributes afterwards in Catalogue.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Class" error={errors.classId}>
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
            <FormField label="Under category" error={errors.parentId}>
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
          <FormField label="Category name" error={errors.label}>
            <Input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
              }}
            />
          </FormField>
          <div>
            <Button
              disabled={pending}
              onClick={() => {
                run(async () => {
                  done(await approveCategoryAction({ id, classId, parentId, label }));
                });
              }}
            >
              Approve and add category
            </Button>
          </div>
        </section>
      ) : (
        <p className="type-body-sm text-secondary">Approving needs catalogue editing. A catalogue moderator can.</p>
      )}
      <section aria-labelledby="reject" className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
        <h2 id="reject" className="type-h4">
          Reject
        </h2>
        <FormField label="Reason (the supplier sees this)" error={errors.reason}>
          <Textarea
            value={reason}
            rows={3}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
        <div>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              run(async () => {
                done(await rejectCategoryAction(id, reason));
              });
            }}
          >
            Reject request
          </Button>
        </div>
      </section>
    </div>
  );
}
