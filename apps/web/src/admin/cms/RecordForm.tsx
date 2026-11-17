"use client";

import {
  Alert,
  Button,
  Checkbox,
  FilterChip,
  FormField,
  Icon,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Textarea,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markVerifiedAction } from "@/admin/content/actions";
import { BodyEditor } from "./ArticleEditor";
import { blocksToLexical, lexicalToBlocks, type BodyBlock } from "./body";
import { STALE_DAYS } from "@/cms/records/thresholds";
import type { FieldSpec } from "./fields";
import { recordCards } from "./layout";
import { saveRecordAction, saveSettingAction, unpublishRecordAction } from "./record-actions";

// The native content editor (step 4.6): any record, tracker entry, knowledge item, page or setting, drawn from its
// fields with our components. The main column holds the content, the side column its filing and status.

type Choice = { id: number; label: string };
type Values = Record<string, unknown>;

const IST = 330 * 60_000;
const istLocal = (iso: unknown, withTime: boolean) => {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(new Date(iso).getTime() + IST).toISOString();
  return withTime ? d.slice(0, 16) : d.slice(0, 10);
};
const fromIst = (v: string, withTime: boolean) =>
  v ? new Date(withTime ? `${v}:00+05:30` : `${v}T00:00:00+05:30`).toISOString() : null;
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
const dayMonthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const istStamp = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

function emptyOf(f: FieldSpec): unknown {
  if (f.kind === "array" || f.hasMany) return [];
  if (f.kind === "group") return Object.fromEntries((f.fields ?? []).map((x) => [x.name, emptyOf(x)]));
  if (f.kind === "checkbox") return false;
  return null;
}

function RichText({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [blocks, setBlocks] = useState<BodyBlock[]>(() => {
    const b = value ? lexicalToBlocks(value) : [];
    return b.length ? b : [{ kind: "paragraph", text: "" }];
  });
  return (
    <div className="flex flex-col gap-3">
      <BodyEditor
        blocks={blocks}
        onChange={(b) => {
          setBlocks(b);
          onChange(blocksToLexical(b));
        }}
      />
    </div>
  );
}

function JsonField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => (value === null || value === undefined ? "" : JSON.stringify(value, null, 2)));
  const [bad, setBad] = useState(false);
  return (
    <Textarea
      rows={6}
      className="type-mono"
      invalid={bad}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
      }}
      onBlur={() => {
        try {
          onChange(text.trim() ? JSON.parse(text) : null);
          setBad(false);
        } catch {
          setBad(true);
        }
      }}
    />
  );
}

function ManyPicker({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  disabled: boolean;
}) {
  const left = options.filter((o) => !value.includes(o.value));
  return (
    <>
      <Select
        value=""
        disabled={disabled || !left.length}
        onChange={(e) => {
          if (e.target.value) onChange([...value, e.target.value]);
        }}
      >
        <option value="">{left.length ? `Add ${label.toLowerCase()}…` : "All added"}</option>
        {left.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {value.length ? (
        <span className="flex flex-wrap gap-2">
          {value.map((v) => (
            <FilterChip
              key={v}
              label={options.find((o) => o.value === v)?.label ?? v}
              disabled={disabled}
              onRemove={() => {
                onChange(value.filter((x) => x !== v));
              }}
            />
          ))}
        </span>
      ) : null}
    </>
  );
}

function Field({
  spec,
  value,
  onChange,
  choices,
  locked,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (v: unknown) => void;
  choices: Record<string, Choice[]>;
  locked: boolean;
}) {
  const disabled = locked || spec.readOnly;
  const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
  const relOptions = (choices[spec.relationTo ?? ""] ?? []).map((c) => ({ value: String(c.id), label: c.label }));
  const idOf = (v: unknown) => (v && typeof v === "object" ? (v as { id: unknown }).id : v);

  switch (spec.kind) {
    case "group":
      return (
        <fieldset
          className={spec.bare ? "flex flex-col gap-4" : "flex flex-col gap-4 rounded-input border border-default p-4"}
        >
          <legend className={spec.bare ? "sr-only" : "px-1 type-label"}>{spec.label}</legend>
          {spec.description ? <p className="type-caption text-secondary">{spec.description}</p> : null}
          {(spec.fields ?? []).map((f) => (
            <Field
              key={f.name}
              spec={f}
              value={(value as Values | null)?.[f.name]}
              onChange={(v) => {
                onChange({ ...(value ?? {}), [f.name]: v });
              }}
              choices={choices}
              locked={locked}
            />
          ))}
        </fieldset>
      );
    case "array": {
      const rows = Array.isArray(value) ? (value as Values[]) : [];
      const fields = spec.fields ?? [];
      const set = (next: Values[]) => {
        onChange(next);
      };
      return (
        <fieldset className="flex flex-col gap-3">
          <legend className={spec.bare ? "sr-only" : "type-label"}>
            {spec.label}
            {spec.required ? (
              <span aria-hidden="true" className="text-error">
                {" "}
                *
              </span>
            ) : null}
          </legend>
          {spec.description ? <p className="type-caption text-secondary">{spec.description}</p> : null}
          {rows.length ? (
            <ol className="flex flex-col gap-3">
              {rows.map((row, i) => (
                <li
                  key={typeof row.id === "string" || typeof row.id === "number" ? row.id : i}
                  className="flex flex-col gap-3 rounded-input border border-default p-3"
                >
                  <span className="flex items-center justify-between">
                    <span className="type-caption text-secondary">
                      {spec.label} {i + 1}
                    </span>
                    {disabled ? null : (
                      <span className="flex gap-1">
                        <IconButton
                          icon="chevron-up"
                          size="sm"
                          label={`Move ${spec.label} ${String(i + 1)} up`}
                          disabled={i === 0}
                          onClick={() => {
                            const n = [...rows];
                            [n[i - 1], n[i]] = [n[i] as Values, n[i - 1] as Values];
                            set(n);
                          }}
                        />
                        <IconButton
                          icon="chevron-down"
                          size="sm"
                          label={`Move ${spec.label} ${String(i + 1)} down`}
                          disabled={i === rows.length - 1}
                          onClick={() => {
                            const n = [...rows];
                            [n[i + 1], n[i]] = [n[i] as Values, n[i + 1] as Values];
                            set(n);
                          }}
                        />
                        <IconButton
                          icon="trash"
                          size="sm"
                          label={`Remove ${spec.label} ${String(i + 1)}`}
                          onClick={() => {
                            set(rows.filter((_, j) => j !== i));
                          }}
                        />
                      </span>
                    )}
                  </span>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {fields.map((f) => (
                      <Field
                        key={f.name}
                        spec={f}
                        value={row[f.name]}
                        onChange={(v) => {
                          set(rows.map((r, j) => (j === i ? { ...r, [f.name]: v } : r)));
                        }}
                        choices={choices}
                        locked={locked}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {disabled ? null : (
            <span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  set([...rows, Object.fromEntries(fields.map((f) => [f.name, emptyOf(f)]))]);
                }}
              >
                <Icon name="plus" size={14} />
                Add {spec.label.toLowerCase()}
              </Button>
            </span>
          )}
        </fieldset>
      );
    }
    case "richText":
      return (
        <div className="flex flex-col gap-2">
          <span className="type-label">{spec.label}</span>
          {disabled ? (
            <p className="type-body-sm text-secondary">Read only.</p>
          ) : (
            <RichText value={value} onChange={onChange} />
          )}
        </div>
      );
    case "checkbox":
      return (
        <span className="flex flex-col gap-1">
          <Checkbox
            label={spec.label}
            checked={value === true}
            disabled={disabled}
            onCheckedChange={(c) => {
              onChange(c === true);
            }}
          />
          {spec.description ? <span className="pl-7 type-caption text-secondary">{spec.description}</span> : null}
        </span>
      );
    default:
      break;
  }

  let control: React.ReactNode;
  switch (spec.kind) {
    case "textarea":
      control = (
        <Textarea
          rows={3}
          disabled={disabled}
          maxLength={spec.maxLength}
          showCount={Boolean(spec.maxLength)}
          value={str(value)}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      );
      break;
    case "number":
      control = (
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={spec.min}
          max={spec.max}
          disabled={disabled}
          value={str(value)}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      );
      break;
    case "date":
      control = (
        <Input
          type={spec.withTime ? "datetime-local" : "date"}
          disabled={disabled}
          value={istLocal(value, Boolean(spec.withTime))}
          onChange={(e) => {
            onChange(fromIst(e.target.value, Boolean(spec.withTime)));
          }}
        />
      );
      break;
    case "select":
    case "radio":
      control = spec.hasMany ? (
        <ManyPicker
          label={spec.label}
          options={spec.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
          disabled={disabled}
        />
      ) : (
        <Select
          disabled={disabled}
          value={str(value)}
          onChange={(e) => {
            onChange(e.target.value || null);
          }}
        >
          <option value="">{spec.required ? "Choose…" : "None"}</option>
          {(spec.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    case "relationship":
    case "upload":
      control = spec.hasMany ? (
        <ManyPicker
          label={spec.label}
          options={relOptions}
          value={(Array.isArray(value) ? value : []).map((v) => String(idOf(v)))}
          onChange={(v) => {
            onChange(v.map(Number));
          }}
          disabled={disabled}
        />
      ) : (
        <Select
          disabled={disabled}
          value={str(idOf(value))}
          onChange={(e) => {
            onChange(e.target.value ? Number(e.target.value) : null);
          }}
        >
          <option value="">{spec.required ? "Choose…" : "None"}</option>
          {relOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
      break;
    case "json":
      control = <JsonField value={value} onChange={onChange} />;
      break;
    case "unsupported":
      control = <p className="type-body-sm text-secondary">Edited in the advanced editor.</p>;
      break;
    default:
      control = (
        <Input
          type={spec.kind === "email" ? "email" : "text"}
          disabled={disabled}
          maxLength={spec.maxLength}
          value={str(value)}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      );
  }
  return (
    <FormField
      label={spec.label}
      required={spec.required}
      helper={
        spec.kind === "upload" && spec.relationTo === "media" ? (
          <>
            {spec.description ? `${spec.description} ` : ""}
            <Link href="/admin/content/media" className="underline">
              Upload in Media
            </Link>
          </>
        ) : (
          spec.description
        )
      }
    >
      {control}
    </FormField>
  );
}

export interface FormMeta {
  id: number | null;
  /** Published state for content with drafts; null when the content has no drafts. */
  published: boolean | null;
  status: string | null;
  updatedAt: string | null;
  verifiedAt: string | null;
  /** Whole days since it was last verified (worked out on the server), or null. */
  verifiedDays: number | null;
}

export function RecordForm({
  kind,
  slug,
  singular,
  backHref,
  backLabel,
  titleField,
  fields,
  initial,
  meta,
  choices,
  canEdit,
  verify,
  cmsHref,
}: {
  kind: "record" | "setting";
  slug: string;
  singular: string;
  backHref: string;
  backLabel: string;
  titleField: string | null;
  fields: FieldSpec[];
  initial: Values;
  meta: FormMeta;
  choices: Record<string, Choice[]>;
  canEdit: boolean;
  verify: boolean;
  cmsHref: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const drafts = meta.published !== null;
  const locked = !canEdit;
  const title = titleField ? (typeof values[titleField] === "string" ? values[titleField] : "") : "";

  const run = (fn: () => Promise<{ ok: true; id: number } | { ok: false; error: string }>, done: string) => {
    setError("");
    setNotice("");
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDirty(false);
      setNotice(done);
      // A new newsletter issue carries on in its composer (founder QC, 17 Nov 2026), not the generic editor.
      if (kind === "record" && !meta.id)
        router.replace(
          slug === "newsletter-issues"
            ? `/admin/content/newsletter/${String(r.id)}`
            : `/admin/content/${slug}/${String(r.id)}`,
        );
      else router.refresh();
    });
  };
  const save = (mode: "draft" | "publish" | "save") => {
    run(
      () =>
        kind === "setting" ? saveSettingAction(slug, values, mode) : saveRecordAction(slug, meta.id, values, mode),
      mode === "publish" ? "Published." : mode === "draft" ? "Draft saved." : "Saved.",
    );
  };

  const field = (f: FieldSpec) => (
    <Field
      key={f.name}
      spec={f}
      value={values[f.name]}
      onChange={(v) => {
        setValues((x) => ({ ...x, [f.name]: v }));
        setDirty(true);
      }}
      choices={choices}
      locked={locked}
    />
  );
  const cards =
    kind === "record"
      ? recordCards(slug, singular, fields)
      : [{ title: singular, fields: fields.filter((f) => !f.sidebar) }];
  const side = fields.filter((f) => f.sidebar && f.name !== "verification" && f.name !== "status");
  const editorName = (v: unknown) => {
    const id = v && typeof v === "object" ? (v as { id: unknown }).id : v;
    return (choices.editors ?? []).find((c) => c.id === id)?.label ?? null;
  };
  const owner = editorName(values.owner);
  const verification = (values.verification ?? {}) as { at?: string | null; by?: unknown; note?: string | null };
  const verifiedBy = editorName(verification.by);
  const [status, setStatus] = useState<"Draft" | "Published">(meta.published ? "Published" : "Draft");
  const days = meta.verifiedDays;
  const stale = days === null || days >= STALE_DAYS;

  const saveChanges = () => {
    if (kind === "setting") {
      save(drafts ? (status === "Published" ? "publish" : "draft") : "save");
      return;
    }
    if (!drafts) {
      save("save");
      return;
    }
    if (status === "Published") {
      save("publish");
      return;
    }
    const id = meta.id;
    run(
      async () => {
        const r = await saveRecordAction(slug, id, values, "draft");
        if (r.ok && meta.published) return unpublishRecordAction(slug, r.id);
        return r;
      },
      meta.published ? "Unpublished. It's a draft again." : "Draft saved.",
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href={backHref} className="inline-flex items-center gap-1 self-start type-label">
          <Icon name="arrow-left" size={16} />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="type-h2">
              {meta.id || kind === "setting" ? title || singular : `New ${singular.toLowerCase()}`}
            </h1>
            <span className="flex flex-wrap items-center gap-2 type-caption text-secondary">
              {drafts ? (
                <StatusBadge
                  status={meta.published ? "Published" : "Draft"}
                  tone={meta.published ? "success" : "neutral"}
                />
              ) : null}
              {meta.status ? <StatusBadge status={meta.status} /> : null}
              {[
                singular,
                owner ? `owner ${owner}` : null,
                dirty ? "unsaved changes" : meta.updatedAt ? `updated ${dayMonth(meta.updatedAt)}` : "not saved yet",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              {verify && meta.id ? (
                <VerifyButton
                  collection={slug}
                  id={meta.id}
                  label="Mark verified"
                  onDone={() => {
                    router.refresh();
                  }}
                />
              ) : null}
              <Button disabled={pending} onClick={saveChanges}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert tone="error" title="Not saved">
          {error}
        </Alert>
      ) : null}
      {notice ? <Alert tone="success" title={notice} /> : null}
      {locked ? (
        <Alert tone="info" title="View only">
          Your role can read this but not change it.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          {cards.map((c) => (
            <section key={c.title} className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">{c.title}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {c.fields.map((f) => (
                  <div
                    key={f.name}
                    className={
                      f.kind === "text" ||
                      f.kind === "number" ||
                      f.kind === "date" ||
                      f.kind === "email" ||
                      ((f.kind === "select" || f.kind === "relationship" || f.kind === "radio") && !f.hasMany) ||
                      f.kind === "checkbox"
                        ? undefined
                        : "md:col-span-2"
                    }
                  >
                    {field(f)}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="flex flex-col gap-6">
          {verify && meta.id ? (
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="type-h4">Last verified</h2>
                {days !== null ? (
                  <StatusBadge
                    status={days === 0 ? "Today" : `${String(days)} ${days === 1 ? "day" : "days"} ago`}
                    tone={stale ? "warning" : "success"}
                  />
                ) : null}
              </div>
              <p className="type-body-sm">
                {meta.verifiedAt
                  ? `${dayMonthYear(meta.verifiedAt)}${verifiedBy ? ` by ${verifiedBy}` : ""}`
                  : "Never verified"}
              </p>
              {verification.note ? <p className="type-caption text-secondary">{verification.note}</p> : null}
              {stale && meta.verifiedAt ? (
                <p className="type-caption text-secondary">Due for a check. This record is in Data quality as stale.</p>
              ) : null}
              {canEdit ? (
                <VerifyButton
                  collection={slug}
                  id={meta.id}
                  label="Mark verified now"
                  size="sm"
                  onDone={() => {
                    router.refresh();
                  }}
                />
              ) : null}
              <p className="type-caption text-secondary">
                Records not verified for {STALE_DAYS} days move to Data quality.
              </p>
            </section>
          ) : null}
          {drafts ? (
            <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">Workflow</h2>
              <FormField label="Status">
                <Select
                  value={status}
                  disabled={locked}
                  onChange={(e) => {
                    setStatus(e.target.value === "Published" ? "Published" : "Draft");
                    setDirty(true);
                  }}
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </Select>
              </FormField>
              {meta.updatedAt ? (
                <p className="type-caption text-secondary">Last saved {istStamp(meta.updatedAt)} IST</p>
              ) : null}
            </section>
          ) : null}
          {side.length ? (
            <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
              <h2 className="type-h4">Details</h2>
              {side.map(field)}
            </section>
          ) : null}
          <Link href={cmsHref} className="type-caption text-secondary underline">
            Open in the advanced editor
          </Link>
        </aside>
      </div>
    </div>
  );
}

function VerifyButton({
  collection,
  id,
  onDone,
  label,
  size,
}: {
  collection: string;
  id: number;
  onDone: () => void;
  label: string;
  size?: "sm";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="flex flex-col gap-1">
      <Button
        variant="outline"
        size={size}
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await markVerifiedAction(collection, id);
            setError(r.ok ? "" : r.error);
            onDone();
          });
        }}
      >
        <Icon name="check" size={16} />
        {label}
      </Button>
      {error ? <span className="type-caption text-error">{error}</span> : null}
    </span>
  );
}
