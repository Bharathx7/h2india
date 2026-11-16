"use client";

import type { AttributeDef } from "@h2india/core/catalogue/attributes";
import { Alert, Button, Icon, Input, StatusBadge } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { decideFieldAction, submitDatasheetAction } from "./datasheet-actions";

// Datasheet review (610:8; fields 611:8), step 8.4: each field read from the PDF with its confidence and source;
// Medium and Low fields need Accept or an edit; Not in datasheet keeps it off the product page. Submit stays disabled
// until every field that needs a check has one.

export interface ReviewField {
  key: string;
  label: string;
  unit: string | null;
  group: string;
  type: AttributeDef["type"];
  value: unknown;
  confidence: "high" | "medium" | "low";
  sourceText?: string;
  sourcePage?: number;
  problem?: string;
  decision?: { state: "accepted" | "edited" | "absent"; value?: unknown };
}

const show = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" || typeof v === "number") return String(v);
  const r = v as { min?: number; max?: number };
  return `${String(r.min ?? "")}–${String(r.max ?? "")}`;
};

const parse = (type: string, text: string): unknown => {
  if (type === "number") return Number(text.replace(/,/g, ""));
  if (type === "range") {
    const [a, b] = text.split(/[–-]/).map((t) => Number(t.trim().replace(/,/g, "")));
    return { min: a, max: b ?? a };
  }
  if (type === "boolean") return /^y/i.test(text);
  return text;
};

export function DatasheetReview({
  id,
  status,
  fileName,
  fields,
  name: startName,
  ready,
}: {
  id: string;
  status: string;
  fileName: string;
  fields: ReviewField[];
  name: string;
  ready: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(startName);
  const [model, setModel] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  // While the worker reads the file, check again every few seconds.
  useEffect(() => {
    if (status !== "Queued" && status !== "Reading") return;
    const t = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => {
      clearInterval(t);
    };
  }, [status, router]);
  const needs = fields.filter((f) => (f.confidence !== "high" || f.problem) && !f.decision);
  const count = (c: string) => fields.filter((f) => f.confidence === c).length;
  const decide = (key: string, state: "accepted" | "edited" | "absent", value?: unknown) => {
    start(async () => {
      const r = await decideFieldAction(id, key, state, value);
      setError(r.ok ? "" : r.error);
      if (r.ok) router.refresh();
    });
  };
  if (status === "Queued" || status === "Reading") {
    return (
      <Alert tone="info" title="Reading your datasheet…">
        This usually takes under a minute. You can leave this page; the draft waits for you.
      </Alert>
    );
  }
  if (status === "Failed") {
    return (
      <Alert tone="error" title="We couldn't read this datasheet">
        Check it's a text PDF, not a photo, and try again, or add the product by hand.
      </Alert>
    );
  }
  const groups = [...new Set(fields.map((f) => f.group))];
  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-wrap items-center gap-2 rounded-card bg-subtle p-3">
        <span className="type-label">{fields.length} fields found</span>
        <StatusBadge
          status={`${String(fields.filter((f) => f.decision?.state === "accepted" || (f.confidence === "high" && !f.problem)).length)} accepted`}
          tone="success"
        />
        <StatusBadge status={`${String(needs.length)} to check`} tone="neutral" />
        {count("low") ? <StatusBadge status={`${String(count("low"))} low confidence`} tone="warning" /> : null}
        <span className="ml-auto type-caption text-secondary">
          Nothing shows to buyers until H2 Economy approves it.
        </span>
      </div>
      {error ? <Alert tone="error" title={error} live /> : null}
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <p className="type-eyebrow text-secondary">Product</p>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Product name</span>
          <Input
            value={name}
            disabled={!ready}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Model</span>
          <Input
            value={model}
            disabled={!ready}
            onChange={(e) => {
              setModel(e.target.value);
            }}
          />
        </label>
        <p className="type-caption text-secondary">Read from {fileName}</p>
      </section>
      {groups.map((g) => (
        <section key={g} className="flex flex-col rounded-card border border-default bg-page">
          <p className="border-b border-default px-5 py-3 type-eyebrow text-secondary">{g}</p>
          {fields
            .filter((f) => f.group === g)
            .map((f) => {
              const checked = f.decision;
              const auto = f.confidence === "high" && !f.problem && !checked;
              const tone = f.confidence === "high" ? "success" : f.confidence === "medium" ? "neutral" : "warning";
              return (
                <div
                  key={f.key}
                  className={
                    f.confidence === "low" && !checked
                      ? "flex flex-col gap-2 border-b border-default bg-warning p-5 last:border-0"
                      : "flex flex-col gap-2 border-b border-default p-5 last:border-0"
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="type-label">{f.label}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        status={`${f.confidence[0]?.toUpperCase() ?? ""}${f.confidence.slice(1)} confidence`}
                        tone={tone}
                      />
                      {checked ? (
                        <span className="type-caption text-success">
                          {checked.state === "absent"
                            ? "Not in datasheet"
                            : checked.state === "edited"
                              ? "Edited"
                              : "Accepted"}
                        </span>
                      ) : auto ? (
                        <span className="type-caption text-success">Accepted</span>
                      ) : null}
                    </span>
                  </div>
                  {checked?.state === "absent" ? (
                    <p className="type-caption text-secondary">
                      Marked as not in the datasheet. It won&apos;t show on the product page.
                    </p>
                  ) : (
                    <>
                      <span className="flex items-center gap-2">
                        <Input
                          aria-label={f.label}
                          disabled={!ready}
                          value={edits[f.key] ?? show(checked?.state === "edited" ? checked.value : f.value)}
                          onChange={(e) => {
                            setEdits({ ...edits, [f.key]: e.target.value });
                          }}
                        />
                        {f.unit ? <span className="type-body-sm text-secondary">{f.unit}</span> : null}
                      </span>
                      {f.problem ? (
                        <p className="type-caption text-error">{f.problem}. It won&apos;t be saved as read.</p>
                      ) : null}
                      {f.sourceText ? (
                        <p className="type-caption text-secondary">
                          The datasheet says &quot;{f.sourceText}&quot;
                          {f.sourcePage ? `, page ${String(f.sourcePage)}` : ""}.
                        </p>
                      ) : null}
                    </>
                  )}
                  {ready ? (
                    <div className="flex flex-wrap gap-2">
                      {edits[f.key] !== undefined ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            decide(f.key, "edited", parse(f.type, edits[f.key] ?? ""));
                          }}
                        >
                          <Icon name="check" size={16} />
                          Save edit
                        </Button>
                      ) : !checked && !auto ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending || Boolean(f.problem)}
                          onClick={() => {
                            decide(f.key, "accepted");
                          }}
                        >
                          <Icon name="check" size={16} />
                          Accept
                        </Button>
                      ) : null}
                      {checked?.state !== "absent" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => {
                            decide(f.key, "absent");
                          }}
                        >
                          Not in datasheet
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </section>
      ))}
      {ready ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-default bg-page p-4 shadow-ink-float-sm">
          <p className="type-caption text-secondary">
            {needs.length
              ? `Check ${String(needs.length)} more ${needs.length === 1 ? "field" : "fields"} to submit.`
              : "Submitting sends this draft to H2 Economy's catalogue team with your checked values."}
          </p>
          <Button
            disabled={pending || needs.length > 0 || !name.trim()}
            onClick={() => {
              start(async () => {
                const r = await submitDatasheetAction(id, name, model);
                if (r.ok)
                  router.push(
                    r.status === "In review" ? "/supplier/products?tab=in-review" : `/supplier/products/${r.productId}`,
                  );
                else setError(r.error);
              });
            }}
          >
            Submit for review
          </Button>
        </div>
      ) : null}
    </div>
  );
}
