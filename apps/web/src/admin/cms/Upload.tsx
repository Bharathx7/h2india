"use client";

import { Alert, Button, FormField, Icon, Input } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// Upload to the media library or report files (step 4.6). The file goes to the CMS's own upload endpoint, as the
// signed-in editor; the CMS virus-checks it and refuses other types (SVG is never accepted).

export function ContentUpload({
  slug,
  accept,
  needsAlt,
  maxLabel,
}: {
  slug: string;
  accept: string;
  needsAlt: boolean;
  maxLabel: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [credit, setCredit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const upload = async () => {
    if (!file) return;
    if (needsAlt && !alt.trim()) {
      setError("Add alt text: describe what the image shows.");
      return;
    }
    setBusy(true);
    setError("");
    setDone("");
    const body = new FormData();
    body.append("file", file);
    body.append("_payload", JSON.stringify(needsAlt ? { alt: alt.trim(), credit: credit.trim() || null } : {}));
    try {
      const res = await fetch(`/api/cms/${slug}`, { method: "POST", body, credentials: "same-origin" });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { errors?: { message?: string }[] } | null;
        setError(j?.errors?.[0]?.message ?? "The upload didn't work. Check the file type and size, then try again.");
        return;
      }
      setDone(`${file.name} uploaded.`);
      setFile(null);
      setAlt("");
      setCredit("");
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError("The upload didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <h2 className="type-h5">Upload</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField label="File" required helper={maxLabel}>
          <input
            ref={input}
            type="file"
            accept={accept}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
            }}
            className="type-body-sm file:mr-3 file:rounded-pill file:border-[1.5px] file:border-control file:bg-page file:px-3 file:py-1.5 file:type-label"
          />
        </FormField>
        {needsAlt ? (
          <>
            <FormField label="Alt text" required helper="What the image shows, for people who can't see it.">
              <Input
                value={alt}
                onChange={(e) => {
                  setAlt(e.target.value);
                }}
              />
            </FormField>
            <FormField label="Credit" helper="Photographer or source.">
              <Input
                value={credit}
                onChange={(e) => {
                  setCredit(e.target.value);
                }}
              />
            </FormField>
          </>
        ) : null}
      </div>
      {error ? (
        <Alert tone="error" title="Not uploaded">
          {error}
        </Alert>
      ) : null}
      {done ? <Alert tone="success" title={done} /> : null}
      <span>
        <Button disabled={!file || busy} onClick={() => void upload()}>
          <Icon name="upload" size={16} />
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </span>
    </section>
  );
}
