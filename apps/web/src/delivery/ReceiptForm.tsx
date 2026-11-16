"use client";

import type { FormGuard } from "@h2india/core";
import {
  Alert,
  Button,
  FileRow,
  FileUpload,
  FormField,
  Input,
  OtpInput,
  Radio,
  RadioGroup,
  Textarea,
} from "@h2india/ui";
import { useState, useTransition } from "react";
import { useFormGuard } from "@/lib/form-guard";
import { checkFile, useUploads } from "@/lib/uploads";
import { recordReceiptAction, type ReceiptResult } from "./actions";

// Record what arrived (695:13) and Receipt recorded (695:110). Built for a basic phone: one column, large targets.

const CONDITIONS = [
  { value: "Good", label: "Everything arrived in good condition" },
  { value: "Damaged", label: "Something is damaged" },
  { value: "Short", label: "Something is missing" },
] as const;

export function ReceiptForm({ token, reference }: { token: string; reference: string }) {
  const [code, setCode] = useState("");
  const [condition, setCondition] = useState("Good");
  const [notes, setNotes] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [pending, start] = useTransition();
  const { trap, guard } = useFormGuard();
  const uploads = useUploads("delivery_photo", { max: 5 });
  if (result?.ok)
    return (
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5 text-center">
        <h2 className="type-h3">Receipt recorded</h2>
        <p className="type-body text-body">
          Thank you. We&apos;ve told the buyer and the supplier what arrived for {reference}. You can close this page.
        </p>
      </section>
    );
  if (result && (result.state === "locked" || result.state === "closed"))
    return (
      <Alert
        tone="error"
        title={result.state === "locked" ? "This link is locked" : "This link can't be used any more"}
      >
        {result.state === "locked"
          ? "Too many wrong codes. H2 Economy has been told and will send a new code or confirm the delivery with you."
          : "The delivery was already recorded, or the link has expired."}
      </Alert>
    );
  const send = () => {
    start(async () => {
      const g: FormGuard = guard();
      setResult(
        await recordReceiptAction({
          token,
          code,
          condition,
          notes,
          receivedBy,
          photos: uploads.items
            .filter((i) => i.fileId && i.key)
            .map((i) => ({ fileId: i.fileId ?? "", key: i.key ?? "" })),
          guard: g,
        }),
      );
    });
  };
  const fields = result?.errors ?? {};
  return (
    <form
      className="relative flex flex-col gap-5 rounded-card border border-default bg-page p-5"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {trap}
      {result && result.state === "wrong" ? (
        <Alert tone="error" title="That code isn't right" live>
          {result.left ?? 0} {result.left === 1 ? "try" : "tries"} left. Check the SMS sent to this phone.
        </Alert>
      ) : null}
      {result && result.error ? <Alert tone="error" title={result.error} live /> : null}
      <FormField label="Delivery code" helper="The 6-digit code in the SMS" required>
        <OtpInput value={code} onChange={setCode} length={6} />
      </FormField>
      <RadioGroup
        value={condition}
        onValueChange={setCondition}
        aria-label="What arrived"
        className="flex flex-col gap-3"
      >
        {CONDITIONS.map((c) => (
          <Radio key={c.value} value={c.value} label={c.label} />
        ))}
      </RadioGroup>
      {condition !== "Good" ? (
        <FormField label="What's wrong?" required error={fields.notes}>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
          />
        </FormField>
      ) : null}
      <FileUpload
        label="Add up to 5 photos"
        hint="Photos of the goods and the packing, JPG or PNG"
        check={(f) => checkFile("delivery_photo", f)}
        onFiles={(files) => {
          uploads.add(files);
        }}
      />
      {uploads.items.map((f) => (
        <FileRow
          key={f.localId}
          name={f.name}
          status={f.state}
          progress={f.progress}
          meta={f.meta}
          error={f.problem}
          onRemove={() => {
            uploads.remove(f.localId);
          }}
        />
      ))}
      <FormField label="Your name">
        <Input
          value={receivedBy}
          autoComplete="name"
          onChange={(e) => {
            setReceivedBy(e.target.value);
          }}
        />
      </FormField>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || code.length !== 6 || (uploads.items.length > 0 && !uploads.ready)}
      >
        Record delivery
      </Button>
    </form>
  );
}
