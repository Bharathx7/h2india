"use client";

import { Alert, Button, FileRow, FileUpload, FormField, Input } from "@h2india/ui";
import Link from "next/link";
import { useState } from "react";
import { checkFile, useUploads } from "@/lib/uploads";
import { StatusIcon } from "../../StatusIcon";
import { sendSupportRequest } from "../actions";

// "Or send a support request" on Lost email (528:534) and "We've got your request" (528:664). Step 3.7: the Work ID
// uploads straight to storage, is virus-checked, then sent with the form. Decisions A16, A22, A23.

type Field = "fullName" | "company" | "contactEmail" | "file";

export function SupportRequestForm({ onSent }: { onSent: (sent: Sent) => void }) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const uploads = useUploads("work_id");
  const file = uploads.items[0];
  const fileProblem = file?.state === "error" ? file.problem : undefined;

  const submit = () => {
    const next: Partial<Record<Field, string>> = {};
    if (fullName.trim().length < 2) next.fullName = "Enter your full name";
    if (company.trim().length < 2) next.company = "Enter your company";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      next.contactEmail = "Enter an email we can reach you on, like name@example.com";
    }
    if (!file || file.state === "error") next.file = "Add your work ID or a letter from your company";
    else if (file.state !== "uploaded") next.file = "Wait for the file to finish checking";
    setErrors(next);
    setProblem(undefined);
    if (Object.keys(next).length > 0 || !file?.fileId) return;
    setBusy(true);
    void sendSupportRequest({ fullName, company, contactEmail, fileId: file.fileId, fileKey: file.key }).then((r) => {
      setBusy(false);
      if (r.ok) onSent(r);
      else if (r.field) setErrors({ [r.field]: r.message });
      else setProblem(r.message);
    });
  };

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      aria-labelledby="support-heading"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 id="support-heading" className="type-label-lg text-primary">
        Or send a support request
      </h2>
      {problem ? <Alert tone="error" title={problem} live /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full name" error={errors.fullName}>
          <Input
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setErrors((x) => ({ ...x, fullName: undefined }));
            }}
          />
        </FormField>
        <FormField label="Company" error={errors.company}>
          <Input
            autoComplete="organization"
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setErrors((x) => ({ ...x, company: undefined }));
            }}
          />
        </FormField>
      </div>
      <FormField label="An email we can reach you on" helper="Only used for this request" error={errors.contactEmail}>
        <Input
          type="email"
          autoComplete="email"
          value={contactEmail}
          onChange={(e) => {
            setContactEmail(e.target.value);
            setErrors((x) => ({ ...x, contactEmail: undefined }));
          }}
        />
      </FormField>
      <div className="flex flex-col gap-2" role="group" aria-labelledby="work-id-label">
        <span className="type-label text-primary" id="work-id-label">
          Work ID or letter from your company
        </span>
        <FileUpload
          multiple={false}
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          label="Drop a photo or PDF here or browse"
          hint="JPG, PNG or PDF, up to 10 MB"
          check={(f) => checkFile("work_id", f)}
          error={fileProblem ?? errors.file}
          onFiles={(files) => {
            setErrors((x) => ({ ...x, file: undefined }));
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
        {fileProblem ? (
          <Alert tone="error" title="Work ID not uploaded">
            Choose a JPG, PNG or PDF file up to 10 MB. Everything else you entered is still here.
          </Alert>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        Send request
      </Button>
    </form>
  );
}

export interface Sent {
  reference: string;
  company: string;
  contactEmail: string;
}

/** 528:664 */
export function SupportRequestSent({ sent }: { sent: Sent }) {
  return (
    <>
      <p className="type-caption text-secondary">Lost email</p>
      <StatusIcon name="clock" />
      <h1 className="type-h2 text-primary">We&apos;ve got your request</h1>
      <p className="type-body text-body">
        Our support team will check your ID with {sent.company} and email {sent.contactEmail} within 2 working days.
      </p>
      <p className="inline-flex items-center gap-2 self-start rounded-pill bg-subtle px-3 py-1.5">
        <span className="type-caption text-secondary">Reference</span>
        <span className="type-spec text-primary">{sent.reference}</span>
      </p>
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </>
  );
}
