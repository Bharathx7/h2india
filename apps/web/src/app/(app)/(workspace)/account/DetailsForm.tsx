"use client";

import { JOB_ROLES } from "@h2india/core/account/rules";
import { Alert, Button, FormField, Input, Select, useToast } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAccountDetailsAction } from "./actions";

/** Your details: name and job role, saved together. Email (and mobile, when shown) change through account recovery. */
export function DetailsForm({ name, jobRole }: { name: string; jobRole: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ name, jobRole: jobRole ?? "" });
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const changed = values.name.trim() !== name || (values.jobRole || null) !== jobRole;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const r = await saveAccountDetailsAction({ name: values.name, jobRole: values.jobRole || null });
          if (r.ok) {
            setProblems({});
            setError("");
            toast({ tone: "success", title: "Details saved" });
            router.refresh();
          } else {
            setProblems(r.problems ?? {});
            setError(r.problems ? "" : r.error);
          }
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Full name" error={problems.name}>
          <Input
            name="name"
            autoComplete="name"
            value={values.name}
            onChange={(event) => {
              setValues((v) => ({ ...v, name: event.target.value }));
            }}
          />
        </FormField>
        <FormField label="Your role" helper="Optional" error={problems.jobRole}>
          <Select
            name="jobRole"
            value={values.jobRole}
            onChange={(event) => {
              setValues((v) => ({ ...v, jobRole: event.target.value }));
            }}
          >
            <option value="">Not set</option>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      {error ? <Alert tone="error" title={error} live /> : null}
      <div>
        <Button type="submit" disabled={pending || !changed}>
          Save details
        </Button>
      </div>
    </form>
  );
}
