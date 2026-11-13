"use client";

import {
  Alert,
  Button,
  Checkbox,
  cx,
  FilterChip,
  FormField,
  Icon,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Switch,
  Textarea,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Action } from "@/cms/workflow";
import { moveArticleAction, saveArticleAction } from "./actions";
import type { ArticleForm } from "./articles";
import type { BodyBlock } from "./body";

// The article editor in the H2 India back office (step 4.6; Doc 1 §11.4 "CMS editors: Article editor"): blocks,
// required sources, SEO panel, the workflow Draft → In review → Legal check → Scheduled → Published, and the
// corrections log. Saving keeps a draft; status changes go through the workflow actions.

type Option = { id: number; label: string };

export interface EditorMeta {
  id: number;
  slug: string | null;
  workflow: string;
  publishAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  corrections: { date: string; note: string }[];
  legalPassed: string | null;
}

const TYPES = [
  { value: "news", label: "News" },
  { value: "analysis", label: "Analysis" },
  { value: "explainer", label: "Explainer" },
  { value: "interview", label: "Interview" },
  { value: "press_release", label: "Press release" },
  { value: "sponsored", label: "Sponsored" },
];
const ALWAYS_LEGAL = ["sponsored", "press_release"];
const STEPS = ["Draft", "In review", "Legal check", "Scheduled", "Published"];
const TONE: Record<string, "neutral" | "progress" | "warning" | "success"> = {
  Draft: "neutral",
  "In review": "progress",
  "Legal check": "warning",
  Scheduled: "progress",
  Published: "success",
};

const BLOCKS: { kind: BodyBlock["kind"]; label: string }[] = [
  { kind: "paragraph", label: "Paragraph" },
  { kind: "heading", label: "Heading" },
  { kind: "list", label: "List" },
  { kind: "quote", label: "Quote" },
  { kind: "keyNumbers", label: "Key numbers" },
  { kind: "keyFacts", label: "Key facts" },
];

function newBlock(kind: BodyBlock["kind"]): BodyBlock {
  switch (kind) {
    case "heading":
      return { kind, level: 2, text: "" };
    case "list":
      return { kind, ordered: false, items: [""] };
    case "quote":
      return { kind, text: "" };
    case "keyNumbers":
      return { kind, heading: "", items: [{ value: "", label: "" }], source: "" };
    case "keyFacts":
      return { kind, heading: "", items: [{ label: "", value: "" }] };
    default:
      return { kind: "paragraph", text: "" };
  }
}

const Card = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={cx("flex flex-col gap-4 rounded-card border border-default bg-page p-5", className)}>
    <h2 className="type-h5">{title}</h2>
    {children}
  </section>
);

/** A multi-pick: chosen items as chips, and a list to add more. */
function Picker({
  label,
  options,
  value,
  onChange,
  helper,
}: {
  label: string;
  options: Option[];
  value: number[];
  onChange: (v: number[]) => void;
  helper?: string;
}) {
  const left = options.filter((o) => !value.includes(o.id));
  return (
    <FormField label={label} helper={helper}>
      <Select
        value=""
        onChange={(e) => {
          const id = Number(e.target.value);
          if (id) onChange([...value, id]);
        }}
        disabled={!left.length}
      >
        <option value="">{left.length ? `Add ${label.toLowerCase()}…` : "All added"}</option>
        {left.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
      {value.length ? (
        <span className="flex flex-wrap gap-2">
          {value.map((id) => (
            <FilterChip
              key={id}
              label={options.find((o) => o.id === id)?.label ?? `#${String(id)}`}
              onRemove={() => {
                onChange(value.filter((x) => x !== id));
              }}
            />
          ))}
        </span>
      ) : null}
    </FormField>
  );
}

function BlockEditor({ block, onChange }: { block: BodyBlock; onChange: (b: BodyBlock) => void }) {
  switch (block.kind) {
    case "paragraph":
    case "quote":
      return (
        <Textarea
          aria-label={block.kind === "quote" ? "Quote" : "Paragraph"}
          rows={block.kind === "quote" ? 2 : 4}
          value={block.text}
          placeholder={block.kind === "quote" ? "The quote, then — the person" : "Write the paragraph"}
          onChange={(e) => {
            onChange({ ...block, text: e.target.value });
          }}
        />
      );
    case "heading":
      return (
        <span className="flex gap-2">
          <Select
            aria-label="Heading level"
            boxClassName="w-28"
            value={String(block.level)}
            onChange={(e) => {
              onChange({ ...block, level: e.target.value === "3" ? 3 : 2 });
            }}
          >
            <option value="2">H2</option>
            <option value="3">H3</option>
          </Select>
          <Input
            aria-label="Heading"
            boxClassName="flex-1"
            value={block.text}
            onChange={(e) => {
              onChange({ ...block, text: e.target.value });
            }}
          />
        </span>
      );
    case "list":
      return (
        <span className="flex flex-col gap-2">
          <Checkbox
            label="Numbered list"
            checked={block.ordered}
            onCheckedChange={(c) => {
              onChange({ ...block, ordered: c === true });
            }}
          />
          <Textarea
            aria-label="List items, one per line"
            rows={Math.max(3, block.items.length)}
            value={block.items.join("\n")}
            onChange={(e) => {
              onChange({ ...block, items: e.target.value.split("\n") });
            }}
          />
          <span className="type-caption text-secondary">One item per line.</span>
        </span>
      );
    case "keyNumbers":
    case "keyFacts": {
      const numbers = block.kind === "keyNumbers";
      const rows = block.items as { label: string; value: string }[];
      const setRows = (items: { label: string; value: string }[]) => {
        onChange({ ...block, items });
      };
      return (
        <span className="flex flex-col gap-3">
          <Input
            aria-label="Box heading"
            placeholder={numbers ? "Key numbers" : "Key facts"}
            value={block.heading}
            onChange={(e) => {
              onChange({ ...block, heading: e.target.value });
            }}
          />
          {rows.map((r, i) => (
            <span key={i} className="flex gap-2">
              <Input
                aria-label={numbers ? `Figure ${String(i + 1)}` : `Label ${String(i + 1)}`}
                placeholder={numbers ? "Figure" : "Label"}
                boxClassName="w-40"
                value={numbers ? r.value : r.label}
                onChange={(e) => {
                  setRows(
                    rows.map((x, j) =>
                      j === i ? (numbers ? { ...x, value: e.target.value } : { ...x, label: e.target.value }) : x,
                    ),
                  );
                }}
              />
              <Input
                aria-label={numbers ? `What it measures ${String(i + 1)}` : `Value ${String(i + 1)}`}
                placeholder={numbers ? "What it measures" : "Value"}
                boxClassName="flex-1"
                value={numbers ? r.label : r.value}
                onChange={(e) => {
                  setRows(
                    rows.map((x, j) =>
                      j === i ? (numbers ? { ...x, label: e.target.value } : { ...x, value: e.target.value }) : x,
                    ),
                  );
                }}
              />
              <IconButton
                icon="x"
                label={`Remove row ${String(i + 1)}`}

                onClick={() => {
                  setRows(rows.filter((_, j) => j !== i));
                }}
              />
            </span>
          ))}
          <span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRows([...rows, { label: "", value: "" }]);
              }}
            >
              <Icon name="plus" size={14} />
              Add row
            </Button>
          </span>
          {block.kind === "keyNumbers" ? (
            <Input
              aria-label="Source of the figures"
              placeholder="Source of the figures"
              value={block.source}
              onChange={(e) => {
                onChange({ ...block, source: e.target.value });
              }}
            />
          ) : null}
        </span>
      );
    }
    default:
      return (
        <p className="rounded-input bg-subtle p-3 type-body-sm text-secondary">
          {block.summary}. Kept as it is; edit it in the advanced editor.
        </p>
      );
  }
}

export function ArticleEditor({
  initial,
  meta,
  choices,
  states,
  canPublish,
}: {
  initial: ArticleForm;
  meta: EditorMeta | null;
  choices: { topics: Option[]; tags: Option[]; authors: Option[]; editors: Option[] };
  states: { value: string; label: string }[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const [publishAt, setPublishAt] = useState(meta?.publishAt ? toLocal(meta.publishAt) : "");
  const [correction, setCorrection] = useState("");
  const set = <K extends keyof ArticleForm>(k: K, v: ArticleForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const setBlock = (i: number, b: BodyBlock | null) => {
    set("body", b ? form.body.map((x, j) => (j === i ? b : x)) : form.body.filter((_, j) => j !== i));
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= form.body.length) return;
    const next = [...form.body];
    [next[i], next[j]] = [next[j] as BodyBlock, next[i] as BodyBlock];
    set("body", next);
  };

  const status = meta?.workflow ?? "Draft";
  const legal = ALWAYS_LEGAL.includes(form.type) || form.legal.flagged;
  const words = form.body
    .map((b) => ("text" in b ? b.text : "items" in b ? JSON.stringify(b.items) : ""))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const checks = [
    { ok: form.title.trim().length > 0, label: "Headline" },
    { ok: form.dek.trim().length > 0, label: "Standfirst" },
    { ok: words > 0, label: "Body" },
    { ok: form.authors.length > 0, label: "At least one author" },
    { ok: form.sources.some((s) => s.title.trim()), label: "At least one source" },
    ...(legal ? [{ ok: Boolean(meta?.legalPassed), label: "Legal check passed" }] : []),
  ];

  const save = (then?: (id: number) => Promise<{ ok: boolean; error?: string }>) => {
    setError("");
    setNotice("");
    start(async () => {
      const r = await saveArticleAction(meta?.id ?? null, form);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDirty(false);
      if (then) {
        const t = await then(r.id);
        if (!t.ok) setError(t.error ?? "That didn't work.");
      } else setNotice("Draft saved.");
      if (!meta) router.replace(`/admin/content/articles/${String(r.id)}`);
      else router.refresh();
    });
  };
  const act = (action: Action, opts: { publishAt?: string; note?: string } = {}) => {
    save(async (id) => {
      const r = await moveArticleAction(id, action, opts);
      if (r.ok) setNotice("Done.");
      return r;
    });
  };

  const buttons: {
    action: Action;
    label: string;
    variant?: "primary" | "outline" | "ghost";
    needsPublish?: boolean;
  }[] = [];
  if (status === "Draft") buttons.push({ action: "submit", label: "Submit for review" });
  if (status === "In review") {
    if (legal && !meta?.legalPassed) buttons.push({ action: "send-to-legal", label: "Send to legal check" });
    else buttons.push({ action: "publish", label: "Publish now", needsPublish: true });
    buttons.push({ action: "back-to-draft", label: "Back to draft", variant: "ghost" });
  }
  if (status === "Legal check") {
    buttons.push({ action: "pass-legal", label: "Pass legal check", needsPublish: true });
    buttons.push({ action: "back-to-draft", label: "Return to writer", variant: "ghost" });
  }
  if (status === "Scheduled") {
    buttons.push({ action: "publish", label: "Publish now", needsPublish: true });
    buttons.push({ action: "unschedule", label: "Unschedule", variant: "outline", needsPublish: true });
  }
  if (status === "Published")
    buttons.push({ action: "unpublish", label: "Unpublish", variant: "ghost", needsPublish: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link href="/admin/content?tab=articles" className="inline-flex items-center gap-1 type-label text-secondary">
            <Icon name="arrow-left" size={16} />
            Content library
          </Link>
          <h1 className="type-h2">{meta ? form.title || "Untitled article" : "New article"}</h1>
          <span className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            <StatusBadge status={status} tone={TONE[status] ?? "neutral"} />
            {dirty
              ? "Unsaved changes"
              : meta
                ? `Saved ${new Date(meta.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`
                : "Not saved yet"}
            {` · ${String(words)} words`}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {meta?.slug && status === "Published" ? (
            <Link
              href={`/news/${meta.slug}`}
              target="_blank"
              className={cx("inline-flex h-10 items-center gap-2 px-3 type-label")}
            >
              <Icon name="external-link" size={16} />
              View live
            </Link>
          ) : null}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              save();
            }}
          >
            {pending ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert tone="error" title="Not saved">
          {error}
        </Alert>
      ) : null}
      {notice ? <Alert tone="success" title={notice} /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card title="Story">
            <FormField
              label="Type"
              required
              helper={
                ALWAYS_LEGAL.includes(form.type)
                  ? "Readers always see this label, and it needs a legal check."
                  : undefined
              }
            >
              <Select
                value={form.type}
                onChange={(e) => {
                  set("type", e.target.value);
                }}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Headline" required>
              <Textarea
                rows={2}
                maxLength={140}
                showCount
                value={form.title}
                onChange={(e) => {
                  set("title", e.target.value);
                }}
              />
            </FormField>
            <FormField label="Standfirst" required helper="One or two sentences under the headline.">
              <Textarea
                rows={3}
                maxLength={300}
                showCount
                value={form.dek}
                onChange={(e) => {
                  set("dek", e.target.value);
                }}
              />
            </FormField>
            <FormField label="Why it matters" helper="Optional. A short box for readers in a hurry.">
              <Textarea
                rows={3}
                value={form.whyItMatters}
                onChange={(e) => {
                  set("whyItMatters", e.target.value);
                }}
              />
            </FormField>
            {form.type === "interview" ? (
              <div className="grid gap-4 md:grid-cols-3">
                {(["name", "role", "organisation"] as const).map((k) => (
                  <FormField
                    key={k}
                    label={k === "name" ? "Interviewee" : k === "role" ? "Their role" : "Organisation"}
                  >
                    <Input
                      value={form.interviewee[k]}
                      onChange={(e) => {
                        set("interviewee", { ...form.interviewee, [k]: e.target.value });
                      }}
                    />
                  </FormField>
                ))}
              </div>
            ) : null}
            {form.type === "press_release" ? (
              <FormField label="Issued by" required>
                <Input
                  value={form.issuer}
                  onChange={(e) => {
                    set("issuer", e.target.value);
                  }}
                />
              </FormField>
            ) : null}
            {form.type === "sponsored" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Sponsor" required>
                  <Input
                    value={form.sponsor.name}
                    onChange={(e) => {
                      set("sponsor", { ...form.sponsor, name: e.target.value });
                    }}
                  />
                </FormField>
                <FormField label="About the sponsor">
                  <Input
                    value={form.sponsor.about}
                    onChange={(e) => {
                      set("sponsor", { ...form.sponsor, about: e.target.value });
                    }}
                  />
                </FormField>
                <FormField label="Disclosure" className="md:col-span-2">
                  <Textarea
                    rows={2}
                    value={form.sponsor.disclosure}
                    onChange={(e) => {
                      set("sponsor", { ...form.sponsor, disclosure: e.target.value });
                    }}
                  />
                </FormField>
              </div>
            ) : null}
          </Card>

          <Card title="Body">
            <p className="type-caption text-secondary">
              Use **bold**, *italic* and [link text](https://…) inside a block. Glossary terms are linked automatically.
            </p>
            <ol className="flex flex-col gap-3">
              {form.body.map((b, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-input border border-default p-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="type-caption text-secondary">
                      {BLOCKS.find((x) => x.kind === b.kind)?.label ?? "Other block"}
                    </span>
                    <span className="flex gap-1">
                      <IconButton
                        icon="chevron-up"
                        label={`Move block ${String(i + 1)} up`}
                        size="sm"
                        disabled={i === 0}
                        onClick={() => {
                          move(i, -1);
                        }}
                      />
                      <IconButton
                        icon="chevron-down"
                        label={`Move block ${String(i + 1)} down`}
                        size="sm"
                        disabled={i === form.body.length - 1}
                        onClick={() => {
                          move(i, 1);
                        }}
                      />
                      <IconButton
                        icon="trash"
                        label={`Remove block ${String(i + 1)}`}
                        size="sm"
                        onClick={() => {
                          setBlock(i, null);
                        }}
                      />
                    </span>
                  </span>
                  <BlockEditor
                    block={b}
                    onChange={(nb) => {
                      setBlock(i, nb);
                    }}
                  />
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              {BLOCKS.map((x) => (
                <Button
                  key={x.kind}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    set("body", [...form.body, newBlock(x.kind)]);
                  }}
                >
                  <Icon name="plus" size={14} />
                  {x.label}
                </Button>
              ))}
            </div>
          </Card>

          <Card title="Sources">
            <p className="type-caption text-secondary">
              Every article needs at least one source before it's published.
            </p>
            {form.sources.length ? (
              <ul className="flex flex-col gap-3">
                {form.sources.map((s, i) => (
                  <li key={i} className="grid gap-2 rounded-input border border-default p-3 md:grid-cols-2">
                    <Input
                      aria-label={`Source ${String(i + 1)} title`}
                      placeholder="Title, for example MNRE order of 4 January"
                      value={s.title}
                      onChange={(e) => {
                        set(
                          "sources",
                          form.sources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                        );
                      }}
                    />
                    <Input
                      aria-label={`Source ${String(i + 1)} link`}
                      placeholder="https://"
                      type="url"
                      value={s.url}
                      onChange={(e) => {
                        set(
                          "sources",
                          form.sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                        );
                      }}
                    />
                    <Input
                      aria-label={`Source ${String(i + 1)} note`}
                      placeholder="Note (optional)"
                      value={s.note}
                      onChange={(e) => {
                        set(
                          "sources",
                          form.sources.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)),
                        );
                      }}
                    />
                    <span className="flex items-center justify-between gap-2">
                      <Checkbox
                        label="Internal only"
                        checked={s.internal}
                        onCheckedChange={(c) => {
                          set(
                            "sources",
                            form.sources.map((x, j) => (j === i ? { ...x, internal: c === true } : x)),
                          );
                        }}
                      />
                      <IconButton
                        icon="trash"
                        label={`Remove source ${String(i + 1)}`}
                        size="sm"
                        onClick={() => {
                          set(
                            "sources",
                            form.sources.filter((_, j) => j !== i),
                          );
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  set("sources", [...form.sources, { title: "", url: "", note: "", internal: false }]);
                }}
              >
                <Icon name="plus" size={14} />
                Add source
              </Button>
            </span>
          </Card>

          <Card title="Search and sharing">
            <FormField label="SEO title" helper="Leave empty to use the headline.">
              <Input
                maxLength={60}
                value={form.seo.title}
                onChange={(e) => {
                  set("seo", { ...form.seo, title: e.target.value });
                }}
              />
            </FormField>
            <FormField label="SEO description" helper="Leave empty to use the standfirst.">
              <Textarea
                rows={2}
                maxLength={160}
                showCount
                value={form.seo.description}
                onChange={(e) => {
                  set("seo", { ...form.seo, description: e.target.value });
                }}
              />
            </FormField>
            <div className="flex flex-col gap-1 rounded-input bg-subtle p-4" aria-label="Search preview">
              <span className="type-caption text-secondary">Preview</span>
              <span className="type-label text-link">{(form.seo.title || form.title || "Headline").slice(0, 60)}</span>
              <span className="type-caption text-secondary">h2india.in/news/{meta?.slug ?? "…"}</span>
              <span className="type-body-sm text-body">
                {(form.seo.description || form.dek || "Standfirst").slice(0, 160)}
              </span>
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card title="Workflow">
            <ol className="flex flex-col gap-2" aria-label="Workflow steps">
              {STEPS.filter((s) => s !== "Legal check" || legal).map((s) => {
                const here = s === status;
                const done = STEPS.indexOf(s) < STEPS.indexOf(status);
                return (
                  <li
                    key={s}
                    aria-current={here ? "step" : undefined}
                    className={cx(
                      "flex items-center gap-2 type-body-sm",
                      here ? "type-label" : done ? "text-body" : "text-secondary",
                    )}
                  >
                    <span
                      className={cx(
                        "flex size-5 items-center justify-center rounded-pill border",
                        here
                          ? "border-transparent bg-inverse text-inverse"
                          : done
                            ? "border-transparent bg-accent"
                            : "border-default",
                      )}
                    >
                      {done ? <Icon name="check" size={12} /> : null}
                    </span>
                    {s}
                  </li>
                );
              })}
            </ol>
            <ul className="flex flex-col gap-1 border-t border-default pt-3">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={cx("flex items-center gap-2 type-caption", c.ok ? "text-body" : "text-secondary")}
                >
                  <Icon name={c.ok ? "check-circle" : "alert-circle"} size={14} />
                  {c.label}
                </li>
              ))}
            </ul>
            {meta ? (
              <div className="flex flex-col gap-2">
                {status === "In review" && canPublish && (!legal || meta.legalPassed) ? (
                  <span className="flex flex-col gap-2">
                    <FormField label="Publish at (IST)">
                      <Input
                        type="datetime-local"
                        value={publishAt}
                        onChange={(e) => {
                          setPublishAt(e.target.value);
                        }}
                      />
                    </FormField>
                    <Button
                      variant="outline"
                      disabled={pending || !publishAt}
                      onClick={() => {
                        act("schedule", { publishAt: fromLocal(publishAt) });
                      }}
                    >
                      <Icon name="calendar" size={16} />
                      Schedule
                    </Button>
                  </span>
                ) : null}
                {status === "Scheduled" && meta.publishAt ? (
                  <p className="type-body-sm">
                    Publishes{" "}
                    {new Date(meta.publishAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    IST
                  </p>
                ) : null}
                {buttons
                  .filter((b) => !b.needsPublish || canPublish)
                  .map((b) => (
                    <Button
                      key={b.action}
                      variant={b.variant ?? "primary"}
                      disabled={pending}
                      onClick={() => {
                        act(b.action);
                      }}
                    >
                      {b.label}
                    </Button>
                  ))}
                {buttons.some((b) => b.needsPublish) && !canPublish ? (
                  <p className="type-caption text-secondary">An Editor-in-chief schedules and publishes.</p>
                ) : null}
              </div>
            ) : (
              <p className="type-caption text-secondary">Save the draft to start the workflow.</p>
            )}
          </Card>

          <Card title="Filing">
            <Picker
              label="Topics"
              options={choices.topics}
              value={form.topics}
              onChange={(v) => {
                set("topics", v);
              }}
            />
            <Picker
              label="Tags"
              options={choices.tags}
              value={form.tags}
              onChange={(v) => {
                set("tags", v);
              }}
            />
            <FormField label="States">
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) set("states", [...form.states, e.target.value]);
                }}
              >
                <option value="">Add a state…</option>
                {states
                  .filter((s) => !form.states.includes(s.value))
                  .map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
              </Select>
              {form.states.length ? (
                <span className="flex flex-wrap gap-2">
                  {form.states.map((v) => (
                    <FilterChip
                      key={v}
                      label={states.find((s) => s.value === v)?.label ?? v}
                      onRemove={() => {
                        set(
                          "states",
                          form.states.filter((x) => x !== v),
                        );
                      }}
                    />
                  ))}
                </span>
              ) : null}
            </FormField>
            <Switch
              label="Featured on the newsroom"
              checked={form.featured}
              onCheckedChange={(c) => {
                set("featured", c);
              }}
            />
          </Card>

          <Card title="People">
            <Picker
              label="Authors"
              options={choices.authors}
              value={form.authors}
              onChange={(v) => {
                set("authors", v);
              }}
              helper="Required. Shown in the byline."
            />
            <FormField label="Editor">
              <Select
                value={form.editor === null ? "" : String(form.editor)}
                onChange={(e) => {
                  set("editor", e.target.value ? Number(e.target.value) : null);
                }}
              >
                <option value="">Not set</option>
                {choices.editors.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </Card>

          <Card title="Legal check">
            {ALWAYS_LEGAL.includes(form.type) ? (
              <p className="type-body-sm">Sponsored pieces and press releases always need a legal check.</p>
            ) : (
              <Checkbox
                label="Needs a legal check"
                checked={form.legal.flagged}
                onCheckedChange={(c) => {
                  set("legal", { ...form.legal, flagged: c === true });
                }}
              />
            )}
            {legal ? (
              <>
                <FormField label="Note for the legal check">
                  <Textarea
                    rows={2}
                    value={form.legal.note}
                    onChange={(e) => {
                      set("legal", { ...form.legal, note: e.target.value });
                    }}
                  />
                </FormField>
                <StatusBadge
                  status={meta?.legalPassed ? "Passed" : "Not checked yet"}
                  tone={meta?.legalPassed ? "success" : "warning"}
                />
              </>
            ) : null}
          </Card>

          {meta && status === "Published" ? (
            <Card title="Corrections">
              {meta.corrections.length ? (
                <ul className="flex flex-col gap-2">
                  {meta.corrections.map((c, i) => (
                    <li key={i} className="type-body-sm">
                      <span className="block type-caption text-secondary">
                        {new Date(c.date).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          dateStyle: "medium",
                        })}
                      </span>
                      {c.note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-caption text-secondary">No corrections yet.</p>
              )}
              {canPublish ? (
                <>
                  <FormField
                    label="What was corrected"
                    helper="Readers see this note under the article. Saves and republishes."
                  >
                    <Textarea
                      rows={2}
                      value={correction}
                      onChange={(e) => {
                        setCorrection(e.target.value);
                      }}
                    />
                  </FormField>
                  <Button
                    variant="outline"
                    disabled={pending || !correction.trim()}
                    onClick={() => {
                      act("correct", { note: correction });
                      setCorrection("");
                    }}
                  >
                    Publish correction
                  </Button>
                </>
              ) : null}
            </Card>
          ) : null}

          {meta ? (
            <Link
              href={`/cms/collections/articles/${String(meta.id)}`}
              className="inline-flex items-center gap-1 type-caption text-secondary underline"
            >
              Open in the advanced editor (images, embeds, live updates)
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** ISO time to a datetime-local value in IST. */
function toLocal(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 330 * 60_000);
  return d.toISOString().slice(0, 16);
}
/** A datetime-local value read as IST, to ISO. */
function fromLocal(v: string): string {
  return new Date(`${v}:00+05:30`).toISOString();
}
