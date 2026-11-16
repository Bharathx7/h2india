"use client";

import { Alert, Button, FormField, Input } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addSupplierAction } from "./actions";

// Add a supplier (admin QC, 16 Nov 2026): GSTIN, legal name only if GST records have none, and the owner's email.

export function AddSupplierForm() {
  const router = useRouter();
  const [gstin, setGstin] = useState("");
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      className="flex max-w-160 flex-col gap-5 rounded-card border border-default bg-page p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addSupplierAction({ gstin, name, ownerEmail });
          if (r.ok) {
            router.push(`/admin/users/companies/${r.organisationId}?added=1`);
            return;
          }
          setError(r.error);
          setErrors(r.errors ?? {});
          setExisting(r.existingId);
        });
      }}
    >
      {error ? (
        <Alert tone="error" title={error} live>
          {existing ? (
            <Link href={`/admin/users/companies/${existing}`} className="underline underline-offset-2">
              Open the company that has it
            </Link>
          ) : null}
        </Alert>
      ) : null}
      <FormField label="GSTIN" error={errors.gstin} required helper="We check it with GST records, as Join does.">
        <Input
          value={gstin}
          autoComplete="off"
          onChange={(e) => {
            setGstin(e.target.value.toUpperCase());
          }}
        />
      </FormField>
      <FormField
        label="Legal name (only if GST records have none)"
        error={errors.name}
        helper="Leave empty: the name comes from GST records."
      >
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
      </FormField>
      <FormField
        label="Owner's email"
        error={errors.ownerEmail}
        required
        helper="They're invited as the company's Admin and take it over when they accept."
      >
        <Input
          type="email"
          value={ownerEmail}
          onChange={(e) => {
            setOwnerEmail(e.target.value);
          }}
        />
      </FormField>
      <div>
        <Button type="submit" disabled={pending}>
          Add supplier and invite owner
        </Button>
      </div>
    </form>
  );
}
