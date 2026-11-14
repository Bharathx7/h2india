"use client";

import { Alert, Button, FileRow, FileUpload, Select } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkFile, useUploads } from "@/lib/uploads";
import { startDatasheetAction } from "./datasheet-actions";

/** Start from a datasheet (612:8 "Other ways to add"): the category, then the PDF. */
export function DatasheetUpload({
  organisationId,
  categories,
}: {
  organisationId: string;
  categories: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const up = useUploads("datasheet", { organisationId, max: 1 });
  const file = up.items[0];
  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-card border border-default bg-page p-5">
      {error ? <Alert tone="error" title={error} live /> : null}
      <label className="flex flex-col gap-1.5">
        <span className="type-label">Category</span>
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        <span className="type-caption text-secondary">We read the fields this category asks for.</span>
      </label>
      <FileUpload
        multiple={false}
        accept=".pdf,application/pdf"
        label="Drop the datasheet PDF here or browse"
        hint="PDF, up to 20 MB. It stays private."
        check={(f) => checkFile("datasheet", f)}
        onFiles={(files) => up.add(files)}
      />
      {file ? (
        <FileRow
          name={file.name}
          status={file.state}
          progress={file.progress}
          meta={file.meta}
          error={file.problem}
          onRemove={() => {
            up.remove(file.localId);
          }}
        />
      ) : null}
      <Button
        className="self-start"
        disabled={pending || !up.ready || !category}
        onClick={() => {
          start(async () => {
            const r = await startDatasheetAction(file?.fileId ?? "", category);
            if (r.ok) router.push(`/supplier/products/datasheet/${r.id}`);
            else setError(r.error);
          });
        }}
      >
        Read the datasheet
      </Button>
    </div>
  );
}
