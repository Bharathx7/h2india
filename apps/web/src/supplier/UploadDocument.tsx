"use client";

import { DOCUMENT_TYPES, UPLOADABLE, type DocumentType } from "@h2india/core/supplier/rules";
import { Alert, Button, FileRow, FileUpload, Icon, Input, Modal, Select } from "@h2india/ui";
import { useRouter } from "next/navigation";
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
  label = "Upload a document",
  look = "primary",
}: {
  organisationId: string;
  renew?: Renewal;
  label?: string;
  look?: "primary" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DocumentType>((renew?.type as DocumentType | undefined) ?? "gstin");
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
  const save = () => {
    if (!file?.fileId) return;
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
        setOpen(false);
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
        onOpenChange={setOpen}
        width={480}
        title="Upload a document"
        description="Reviewers check it within 1 working day. Your badge stays on while the old document is valid."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
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
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Number</span>
            <Input
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
              }}
            />
          </label>
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
