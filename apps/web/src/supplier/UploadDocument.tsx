"use client";

import { DOCUMENT_TYPES, UPLOADABLE, type DocumentType } from "@h2india/core/supplier/rules";
import { Alert, Button, FileRow, FileUpload, FormField, Icon, Input, Modal, Select, useToast } from "@h2india/ui";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { uploadDocumentAction } from "./verification-actions";

// Modal Upload document (272:4545): "Reviewers check it within 1 working day. Your badge stays on while the old
// document is valid."

export interface Renewal {
  id: string;
  type: string;
  name: string | null;
  scope: string | null;
  number: string | null;
}

export function UploadDocument({
  organisationId,
  renew,
  type: preset,
  label = "Upload a document",
  look = "primary",
  openOnLoad = false,
}: {
  organisationId: string;
  renew?: Renewal;
  /** The document this button is for (the PAN card row uploads a PAN card); the person can still change it. */
  type?: DocumentType;
  label?: string;
  look?: "primary" | "outline";
  /** Open straight away, for the renewal link in the expiry email (?renew=<id>); closing drops the query. */
  openOnLoad?: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const initialType = (renew?.type as DocumentType | undefined) ?? preset ?? "gstin";
  const [open, setOpen] = useState(openOnLoad);
  const [type, setType] = useState<DocumentType>(initialType);
  const [name, setName] = useState(renew?.name ?? "");
  const [scope, setScope] = useState(renew?.scope ?? "");
  const [number, setNumber] = useState(renew?.number ?? "");
  const [issuedBy, setIssuedBy] = useState("");
  const [expires, setExpires] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const uploads = useUploads("verification_document", { organisationId, max: 1 });
  const file = uploads.items[0];
  const t = DOCUMENT_TYPES[type];
  // Every uploadable document needs its number except a certificate (core checks the same in uploadDocument()).
  const numberRequired = t.number && type !== "certificate";
  const reset = () => {
    setType(initialType);
    setName(renew?.name ?? "");
    setScope(renew?.scope ?? "");
    setNumber(renew?.number ?? "");
    setIssuedBy("");
    setExpires("");
    setError("");
    if (file) uploads.remove(file.localId);
  };
  const close = (next: boolean) => {
    setOpen(next);
    if (next) return;
    reset();
    if (openOnLoad) router.replace(path, { scroll: false });
  };
  const save = () => {
    if (!file?.fileId) return;
    if (numberRequired && !number.trim()) {
      setError("Enter the number on the document");
      return;
    }
    start(async () => {
      const r = await uploadDocumentAction({
        type,
        name: type === "certificate" ? name : undefined,
        scope,
        number,
        fileId: file.fileId ?? "",
        issuedBy,
        expiresOn: expires || undefined,
        replaces: renew?.id,
      });
      if (r.ok) {
        close(false);
        toast({ tone: "success", title: "Uploaded. We'll check it within 1 working day." });
        router.refresh();
      } else setError(r.error);
    });
  };
  return (
    <>
      <Button
        variant={look}
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="upload" size={16} />
        {label}
      </Button>
      <Modal
        open={open}
        onOpenChange={close}
        width={480}
        title={renew ? "Upload a renewal" : "Upload a document"}
        description="Reviewers check it within 1 working day. Your badge stays on while the old document is valid."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                close(false);
              }}
            >
              Cancel
            </Button>
            <Button disabled={pending || !uploads.ready} onClick={save}>
              Upload
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Document</span>
          <Select
            value={type}
            disabled={Boolean(renew)}
            onChange={(e) => {
              setType(e.target.value as DocumentType);
            }}
          >
            {UPLOADABLE.map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_TYPES[k].file}
              </option>
            ))}
          </Select>
        </label>
        {type === "certificate" ? (
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Certificate</span>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              placeholder="For example ISO 22734, PESO approval"
            />
          </label>
        ) : null}
        <FileUpload
          multiple={false}
          label="Drop a PDF here or browse"
          hint={uploadHint("verification_document")}
          check={(f) => checkFile("verification_document", f)}
          error={file?.problem}
          onFiles={(files) => {
            uploads.add(files);
          }}
        />
        {file ? (
          <FileRow
            name={file.name}
            status={file.state}
            progress={file.progress}
            meta={file.meta}
            error={file.problem}
            onRemove={() => {
              uploads.remove(file.localId);
            }}
          />
        ) : null}
        {t.number ? (
          <FormField label="Number" required={numberRequired} helper={numberRequired ? undefined : "Optional"}>
            <Input
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
              }}
            />
          </FormField>
        ) : null}
        {type === "certificate" || type === "factory_licence" ? (
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Covers</span>
            <Input
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
              }}
              placeholder="Product, process or site"
            />
          </label>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Issued by</span>
            <Input
              value={issuedBy}
              onChange={(e) => {
                setIssuedBy(e.target.value);
              }}
            />
          </label>
          {t.expires ? (
            <label className="flex flex-col gap-1.5">
              <span className="type-label">Valid until</span>
              <Input
                type="date"
                value={expires}
                onChange={(e) => {
                  setExpires(e.target.value);
                }}
              />
            </label>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
