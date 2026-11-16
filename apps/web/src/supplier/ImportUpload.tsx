"use client";

import { Alert, FileRow, FileUpload, Icon, Select, buttonClasses } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { checkFile, useUploads } from "@/lib/uploads";
import { startImportAction } from "./product-actions";

/** 1. Download the template for a category · 2. Upload the filled-in file (607:9). */
export function ImportUpload({
  organisationId,
  categories,
  checking,
}: {
  organisationId: string;
  categories: { id: string; label: string }[];
  checking: boolean;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const up = useUploads("product_import", { organisationId, max: 1 });
  const file = up.items[0];
  // Once the file passed its checks, hand it to the worker.
  useEffect(() => {
    if (!file?.fileId || file.state !== "uploaded" || pending) return;
    const id = file.fileId;
    start(async () => {
      const r = await startImportAction(id, file.name, category);
      if (r.ok) {
        up.remove(file.localId);
        router.refresh();
      } else setError(r.error ?? "The file wasn't imported");
    });
  }, [file, category, pending, router, up]);
  // While rows are being checked, look again every few seconds.
  useEffect(() => {
    if (!checking) return;
    const t = setInterval(() => {
      router.refresh();
    }, 4000);
    return () => {
      clearInterval(t);
    };
  }, [checking, router]);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h2 className="type-h4">1. Download the template for a category</h2>
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
        </label>
        <a
          // Only an id from the list, encoded (CodeQL js/xss-through-dom).
          href={`/supplier/products/import/template?category=${encodeURIComponent(categories.find((c) => c.id === category)?.id ?? "")}`}
          className={buttonClasses({ variant: "outline", size: "sm" }) + " self-start"}
        >
          <Icon name="download" size={16} />
          Download template (CSV)
        </a>
        <p className="type-caption text-secondary">
          One row per product. Required columns are marked in the file&apos;s first row.
        </p>
      </section>
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h2 className="type-h4">2. Upload the filled-in file</h2>
        {error ? <Alert tone="error" title={error} live /> : null}
        <FileUpload
          multiple={false}
          accept=".csv,text/csv"
          label="Drop your CSV here, or choose a file"
          hint="We check every row and list any that need fixing."
          check={(f) => checkFile("product_import", f)}
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
      </section>
    </div>
  );
}
