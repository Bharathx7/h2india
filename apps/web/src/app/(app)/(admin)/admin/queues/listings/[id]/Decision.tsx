"use client";

import { Alert, Button, Input, Radio, RadioGroup, Select, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideListingAction } from "../../actions";

type Section = "category" | "details" | "specifications" | "documents" | "commercial";

/** Decision (632:695): Approve, Request changes (one note per field), Reject (a reason). */
export function Decision({
  id,
  fields,
  live,
}: {
  id: string;
  fields: { key: string; label: string; section: Section }[];
  live: boolean;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"Approved" | "Needs changes" | "Rejected">("Approved");
  const [notes, setNotes] = useState<{ field: string; section: Section; text: string }[]>([
    { field: fields[0]?.key ?? "name", section: fields[0]?.section ?? "details", text: "" },
  ]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = () => {
    start(async () => {
      const r = await decideListingAction(id, outcome, outcome === "Needs changes" ? notes : [], reason);
      if (r.ok) router.push("/admin/queues/listings");
      else setError(r.error);
    });
  };
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Decision</h2>
      {error ? <Alert tone="error" title={error} live /> : null}
      <RadioGroup
        value={outcome}
        onValueChange={(v) => {
          setOutcome(v as typeof outcome);
        }}
      >
        <Radio value="Approved" label="Approve" />
        <Radio value="Needs changes" label="Request changes" />
        <Radio value="Rejected" label="Reject" />
      </RadioGroup>
      {outcome === "Needs changes" ? (
        <div className="flex flex-col gap-3">
          {notes.map((n, i) => (
            <div key={String(i)} className="flex flex-col gap-2 rounded-control border border-default p-3">
              <Select
                aria-label={`Field for change ${String(i + 1)}`}
                value={n.field}
                onChange={(e) => {
                  const f = fields.find((x) => x.key === e.target.value);
                  setNotes(
                    notes.map((x, j) =>
                      j === i ? { ...x, field: e.target.value, section: f?.section ?? "details" } : x,
                    ),
                  );
                }}
              >
                {fields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </Select>
              <Input
                aria-label={`What to change, ${String(i + 1)}`}
                placeholder="What to change"
                value={n.text}
                onChange={(e) => {
                  setNotes(notes.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)));
                }}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              setNotes([
                ...notes,
                { field: fields[0]?.key ?? "name", section: fields[0]?.section ?? "details", text: "" },
              ]);
            }}
          >
            Add another change
          </Button>
        </div>
      ) : null}
      {outcome === "Rejected" ? (
        <Textarea
          aria-label="Why it can't be listed"
          placeholder="Why it can't be listed"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
          }}
        />
      ) : null}
      <Button variant={outcome === "Rejected" ? "destructive" : "primary"} disabled={pending} onClick={go}>
        {outcome === "Approved"
          ? live
            ? "Approve changes"
            : "Approve listing"
          : outcome === "Needs changes"
            ? "Send changes to the supplier"
            : "Reject listing"}
      </Button>
      <p className="type-caption text-secondary">
        {outcome === "Approved"
          ? live
            ? "The live listing updates as soon as you approve."
            : "The listing goes live and the supplier gets Listing approved."
          : outcome === "Needs changes"
            ? `The supplier sees each change next to its field${live ? "; the live listing stays up" : ""}.`
            : "The supplier is told why. Nothing is shown to buyers."}
      </p>
    </section>
  );
}
