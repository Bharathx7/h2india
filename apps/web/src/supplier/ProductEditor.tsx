"use client";

import type { AttributeDef } from "@h2india/core/catalogue/attributes";
import {
  Alert,
  Button,
  Checkbox,
  cx,
  FileRow,
  FileUpload,
  Icon,
  Input,
  Radio,
  RadioGroup,
  Select,
  StatusBadge,
  Textarea,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { saveProductAction, type EditorForm } from "./product-actions";

// Product editor (602:281 needs changes, 603:8 rejected), step 8.3. Specification fields come from the category's
// schema (step 6.1). Needs changes shows the operator's notes field by field; a live listing stays up while its change
// is reviewed; price, stock and lead time go live at once.

export interface EditorStart {
  id?: string;
  status: string;
  live: boolean;
  slug: string | null;
  model: string;
  notes: { field: string; section: string; text: string }[];
  reviewedOn: string | null;
  rejectReason: string | null;
  form: EditorForm;
}

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <section
      id={id}
      className="grid scroll-mt-24 grid-cols-1 gap-4 rounded-card border border-default bg-page p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-6"
    >
      <div>
        <h2 className="type-h4">{title}</h2>
        <p className="type-caption text-secondary">{text}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  note,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  note?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="type-label">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="type-caption text-error">{error}</span>
      ) : hint ? (
        <span className="type-caption text-secondary">{hint}</span>
      ) : null}
      {note ? (
        <span className="flex gap-1.5 rounded-control bg-warning px-2 py-1.5 type-caption text-primary">
          <Icon name="message-square" size={14} />
          H2 India: {note}
        </span>
      ) : null}
    </label>
  );
}

const unitBox = (unit: string | null, input: ReactNode) =>
  unit ? (
    <span className="flex items-center rounded-control border-[1.5px] border-control bg-page pr-3 focus-within:border-focus">
      {input}
      <span className="type-body-sm text-secondary">{unit}</span>
    </span>
  ) : (
    input
  );

export function ProductEditor({
  start,
  defs,
  categories,
  organisationId,
  canEdit,
}: {
  start: EditorStart;
  defs: AttributeDef[];
  categories: { id: string; label: string }[];
  organisationId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState<EditorForm>(start.form);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, run] = useTransition();
  const photos = useUploads("product_image", { organisationId, max: 8 });
  const docs = useUploads("datasheet", { organisationId, max: 5 });
  const readOnly = !canEdit || start.status === "In review" || start.status === "Rejected";
  const set = (patch: Partial<EditorForm>) => {
    setF({ ...f, ...patch });
  };
  const setAttr = (key: string, value: unknown) => {
    set({ attributes: { ...f.attributes, [key]: value } });
  };
  const note = (field: string) => start.notes.find((n) => n.field === field)?.text;
  const groups = [...new Set(defs.map((d) => d.displayGroup))];
  const resubmit = start.status === "Needs changes";

  const save = (submit: boolean) => {
    const form: EditorForm = {
      ...f,
      images: [
        ...f.images,
        ...photos.items.filter((i) => i.fileId && i.state === "uploaded").map((i) => ({ fileId: i.fileId ?? "" })),
      ],
      documents: [
        ...f.documents,
        ...docs.items
          .filter((i) => i.fileId && i.state === "uploaded")
          .map((i) => ({ label: i.name, fileId: i.fileId ?? "" })),
      ],
    };
    run(async () => {
      const r = await saveProductAction(form, submit);
      if (r.ok) {
        setErrors({});
        setMessage({
          tone: "success",
          text: submit ? "Sent to H2 India for review. We'll email you when it's checked." : "Draft saved.",
        });
        if (!start.id) router.replace(`/supplier/products/${r.id}`);
        else router.refresh();
      } else {
        setErrors(r.errors);
        setMessage({ tone: "error", text: r.error });
      }
    });
  };

  const input = (d: AttributeDef) => {
    const v = f.attributes[d.key];
    const num = (x: string) => (x.trim() === "" ? undefined : Number(x));
    switch (d.type) {
      case "number":
        return unitBox(
          d.unit,
          <input
            inputMode="decimal"
            aria-label={d.label}
            disabled={readOnly}
            defaultValue={typeof v === "number" ? String(v) : ""}
            onChange={(e) => {
              setAttr(d.key, num(e.target.value));
            }}
            className={cx(
              "h-11 min-w-0 flex-1 bg-transparent px-3 type-body outline-none",
              !d.unit && "rounded-control border-[1.5px] border-control",
            )}
          />,
        );
      case "range": {
        const r = (v ?? {}) as { min?: number; max?: number };
        return (
          <span className="flex items-center gap-2">
            <Input
              aria-label={`${d.label}, lowest`}
              disabled={readOnly}
              inputMode="decimal"
              defaultValue={r.min ?? ""}
              onChange={(e) => {
                setAttr(d.key, { ...r, min: num(e.target.value) });
              }}
            />
            <span>to</span>
            <Input
              aria-label={`${d.label}, highest`}
              disabled={readOnly}
              inputMode="decimal"
              defaultValue={r.max ?? ""}
              onChange={(e) => {
                setAttr(d.key, { ...r, max: num(e.target.value) });
              }}
            />
            {d.unit ? <span className="type-body-sm text-secondary">{d.unit}</span> : null}
          </span>
        );
      }
      case "choice":
        return (
          <Select
            aria-label={d.label}
            disabled={readOnly}
            value={typeof v === "string" ? v : ""}
            onChange={(e) => {
              setAttr(d.key, e.target.value || undefined);
            }}
          >
            <option value="">Choose</option>
            {d.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        );
      case "boolean":
        return (
          <Checkbox
            label="Yes"
            disabled={readOnly}
            checked={v === true}
            onCheckedChange={(x) => {
              setAttr(d.key, x === true);
            }}
          />
        );
      default:
        return (
          <Input
            aria-label={d.label}
            disabled={readOnly}
            value={typeof v === "string" ? v : ""}
            onChange={(e) => {
              setAttr(d.key, e.target.value || undefined);
            }}
          />
        );
    }
  };

  const sectionOf: Record<string, string> = {
    category: "category",
    details: "details",
    documents: "documents",
    commercial: "commercial",
  };
  return (
    <div className="flex flex-col gap-6 pb-24">
      <Link href="/supplier/products" className="inline-flex items-center gap-1.5 type-label text-primary">
        <Icon name="arrow-left" size={16} />
        Products
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-h2">{f.name || "New product"}</h1>
          <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            <StatusBadge
              status={start.status}
              tone={
                start.status === "Needs changes"
                  ? "warning"
                  : start.status === "Live"
                    ? "success"
                    : start.status === "Rejected"
                      ? "error"
                      : "neutral"
              }
            />
            {[
              start.model,
              start.live && start.status !== "Live" ? "the live version stays up while you fix this" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {start.live && start.slug ? (
          <a
            href={`/marketplace/products/${start.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 type-label text-primary"
          >
            <Icon name="eye" size={16} />
            Preview as buyer
          </a>
        ) : null}
      </div>

      {start.notes.length ? (
        <Alert
          tone="warning"
          title={`H2 India asked for ${String(start.notes.length)} ${start.notes.length === 1 ? "change" : "changes"} before this goes live${start.live ? " again" : ""}`}
        >
          <ol className="mt-2 flex flex-col gap-2">
            {start.notes.map((n, i) => (
              <li key={`${n.field}${String(i)}`} className="flex flex-wrap justify-between gap-2">
                <span>
                  {i + 1}. {n.text}
                </span>
                <a href={`#${sectionOf[n.section] ?? "specifications"}`} className="type-label underline">
                  Go to {n.section === "specifications" ? "specifications" : n.section}
                </a>
              </li>
            ))}
          </ol>
          {start.reviewedOn ? <p className="mt-2 type-caption">Catalogue team · {start.reviewedOn}</p> : null}
        </Alert>
      ) : null}
      {start.rejectReason !== null ? (
        <Alert tone="error" title="H2 India can't list this product">
          {start.rejectReason || "The catalogue team couldn't approve this listing."} You can delete it, or start a new
          listing.
        </Alert>
      ) : null}
      {start.status === "In review" ? (
        <Alert tone="info" title="With H2 India for review">
          You can edit it again once the catalogue team replies, usually within 2 working days.
        </Alert>
      ) : null}
      {message ? <Alert tone={message.tone} title={message.text} live /> : null}

      <Section
        id="category"
        title="Category"
        text="Decides which specification fields buyers can filter and compare on."
      >
        <Field
          label="Category"
          required
          error={errors.categoryId}
          note={note("categoryId")}
          hint={start.live ? "Changing the category sends this product back to review." : undefined}
        >
          <Select
            value={f.categoryId}
            disabled={readOnly}
            onChange={(e) => {
              // A new schema: reload the editor for the chosen category.
              const id = e.target.value;
              router.push(
                start.id ? `/supplier/products/${start.id}?category=${id}` : `/supplier/products/new?category=${id}`,
              );
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section id="details" title="Details" text="The name and summary buyers see on cards and search.">
        <Field label="Product name" required error={errors.name} note={note("name")}>
          <Input
            value={f.name}
            disabled={readOnly}
            onChange={(e) => {
              set({ name: e.target.value });
            }}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Model">
            <Input
              value={f.model}
              disabled={readOnly}
              onChange={(e) => {
                set({ model: e.target.value });
              }}
            />
          </Field>
          <Field label="Your SKU" hint="Used to match rows when you re-import a spreadsheet.">
            <Input
              value={f.sku}
              disabled={readOnly}
              onChange={(e) => {
                set({ sku: e.target.value });
              }}
            />
          </Field>
        </div>
        <Field label="Summary" hint={`${String(f.summary.length)} / 1000`}>
          <Textarea
            value={f.summary}
            maxLength={1000}
            disabled={readOnly}
            onChange={(e) => {
              set({ summary: e.target.value });
            }}
          />
        </Field>
        <Checkbox
          label="Made in India (self-declared)"
          disabled={readOnly}
          checked={f.madeInIndia}
          onCheckedChange={(v) => {
            set({ madeInIndia: v === true });
          }}
        />
        {!readOnly ? (
          <FileUpload
            label="Add product photos"
            hint={uploadHint("product_image")}
            check={(x) => checkFile("product_image", x)}
            onFiles={(files) => photos.add(files)}
          />
        ) : null}
        {photos.items.map((i) => (
          <FileRow
            key={i.localId}
            name={i.name}
            status={i.state}
            progress={i.progress}
            meta={i.meta}
            error={i.problem}
            onRemove={() => {
              photos.remove(i.localId);
            }}
          />
        ))}
        {f.images.length ? <p className="type-caption text-secondary">{f.images.length} photos saved</p> : null}
      </Section>

      <Section
        id="specifications"
        title="Specifications"
        text="Grouped as buyers compare them. Every value needs a unit, and test conditions where the category asks for them."
      >
        {defs.length === 0 ? (
          <p className="type-body-sm text-body">This category has no specification fields yet.</p>
        ) : null}
        {groups.map((g) => (
          <fieldset key={g} className="flex flex-col gap-3">
            <legend className="mb-1 type-eyebrow text-secondary">{g}</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {defs
                .filter((d) => d.displayGroup === g)
                .map((d) => (
                  <div key={d.key} className="flex flex-col gap-3">
                    <Field label={d.label} required={d.required} error={errors[d.key]} note={note(d.key)}>
                      {input(d)}
                    </Field>
                    {d.testCondition ? (
                      <Field
                        label="Test conditions"
                        required
                        error={errors[`note:${d.key}`]}
                        note={note(`note:${d.key}`)}
                      >
                        <Input
                          placeholder={`e.g. ${d.testCondition}`}
                          disabled={readOnly}
                          value={f.attributeNotes[d.key] ?? ""}
                          onChange={(e) => {
                            set({ attributeNotes: { ...f.attributeNotes, [d.key]: e.target.value } });
                          }}
                        />
                      </Field>
                    ) : null}
                  </div>
                ))}
            </div>
          </fieldset>
        ))}
      </Section>

      <Section
        id="documents"
        title="Documents and compliance"
        text="Datasheets and certificates buyers can download. Certificates are checked by H2 India."
      >
        {f.documents.map((d) => (
          <FileRow
            key={d.fileId}
            name={d.label}
            status="uploaded"
            meta="Saved"
            onRemove={
              readOnly
                ? undefined
                : () => {
                    set({ documents: f.documents.filter((x) => x.fileId !== d.fileId) });
                  }
            }
          />
        ))}
        {docs.items.map((i) => (
          <FileRow
            key={i.localId}
            name={i.name}
            status={i.state}
            progress={i.progress}
            meta={i.meta}
            error={i.problem}
            onRemove={() => {
              docs.remove(i.localId);
            }}
          />
        ))}
        {!readOnly ? (
          <FileUpload
            label="Add a datasheet or certificate"
            hint={uploadHint("datasheet")}
            check={(x) => checkFile("datasheet", x)}
            onFiles={(files) => docs.add(files)}
          />
        ) : null}
        {note("documents") ? (
          <p className="rounded-control bg-warning px-2 py-1.5 type-caption">H2 India: {note("documents")}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          <span className="type-label">Certificates named on the listing</span>
          {f.certificates.map((c, i) => (
            <div key={String(i)} className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
              <Input
                aria-label="Certificate"
                placeholder="For example ISO 22734"
                disabled={readOnly}
                value={c.name}
                onChange={(e) => {
                  set({ certificates: f.certificates.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) });
                }}
              />
              <Input
                aria-label="Certificate number"
                placeholder="Number"
                disabled={readOnly}
                value={c.number ?? ""}
                onChange={(e) => {
                  set({ certificates: f.certificates.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)) });
                }}
              />
              <Input
                aria-label="Valid until"
                type="date"
                disabled={readOnly}
                value={c.validUntil ?? ""}
                onChange={(e) => {
                  set({
                    certificates: f.certificates.map((x, j) => (j === i ? { ...x, validUntil: e.target.value } : x)),
                  });
                }}
              />
              {!readOnly ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    set({ certificates: f.certificates.filter((_, j) => j !== i) });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          {!readOnly ? (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                set({ certificates: [...f.certificates, { name: "" }] });
              }}
            >
              <Icon name="plus" size={16} />
              Add certificate
            </Button>
          ) : null}
        </div>
      </Section>

      <Section
        id="commercial"
        title="Commercial terms"
        text="Choose how buyers see price. Price, stock and lead time changes go live straight away."
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 type-label">Pricing</legend>
          <RadioGroup
            value={f.pricing}
            onValueChange={(v) => {
              set({ pricing: v as EditorForm["pricing"] });
            }}
            disabled={readOnly}
          >
            <Radio value="fixed" label="Fixed price: buyers see the price and can order" />
            <Radio value="quote" label="Quote only: buyers request a quote" />
            <Radio value="indicative" label="Indicative range: show a range, final price by quote" />
          </RadioGroup>
        </fieldset>
        {f.pricing === "fixed" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Price (₹, before GST)" required error={errors.pricePaise}>
              <Input
                inputMode="decimal"
                disabled={readOnly}
                value={f.price}
                onChange={(e) => {
                  set({ price: e.target.value });
                }}
              />
            </Field>
            <Field label="GST (%)">
              <Input
                inputMode="decimal"
                disabled={readOnly}
                value={f.gstPercent}
                onChange={(e) => {
                  set({ gstPercent: e.target.value });
                }}
              />
            </Field>
          </div>
        ) : null}
        {f.pricing === "indicative" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Lowest (₹)" required error={errors.indicativeMinPaise}>
              <Input
                inputMode="decimal"
                disabled={readOnly}
                value={f.indicativeMin}
                onChange={(e) => {
                  set({ indicativeMin: e.target.value });
                }}
              />
            </Field>
            <Field label="Highest (₹)" required>
              <Input
                inputMode="decimal"
                disabled={readOnly}
                value={f.indicativeMax}
                onChange={(e) => {
                  set({ indicativeMax: e.target.value });
                }}
              />
            </Field>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Lead time (weeks)"
            required
            error={errors.leadTimeMinWeeks}
            hint="Ex-works, from purchase order"
          >
            <span className="flex items-center gap-2">
              <Input
                aria-label="Lead time, shortest"
                inputMode="numeric"
                disabled={readOnly}
                value={f.leadTimeMinWeeks}
                onChange={(e) => {
                  set({ leadTimeMinWeeks: e.target.value });
                }}
              />
              <span>to</span>
              <Input
                aria-label="Lead time, longest"
                inputMode="numeric"
                disabled={readOnly}
                value={f.leadTimeMaxWeeks}
                onChange={(e) => {
                  set({ leadTimeMaxWeeks: e.target.value });
                }}
              />
            </span>
          </Field>
          <Field label="Minimum order (units)">
            <Input
              inputMode="numeric"
              disabled={readOnly}
              value={f.minOrder}
              onChange={(e) => {
                set({ minOrder: e.target.value });
              }}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Stock" required hint="Made to order products show lead time instead of stock.">
            <Select
              value={f.stock}
              disabled={readOnly}
              onChange={(e) => {
                set({ stock: e.target.value as EditorForm["stock"] });
              }}
            >
              <option value="made_to_order">Made to order</option>
              <option value="in_stock">In stock</option>
            </Select>
          </Field>
          {f.stock === "in_stock" ? (
            <Field label="Units in stock" required error={errors.stockQty}>
              <Input
                inputMode="numeric"
                disabled={readOnly}
                value={f.stockQty}
                onChange={(e) => {
                  set({ stockQty: e.target.value });
                }}
              />
            </Field>
          ) : null}
        </div>
        <Alert tone="success" title="What goes back to review">
          Changes to specs, certificates or category are checked again before they go live. Price, lead time and stock
          changes go live straight away.
        </Alert>
      </Section>

      {!readOnly ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-default bg-page p-4 shadow-ink-float-sm">
          <p className="type-caption text-secondary">
            {resubmit || start.live
              ? "Resubmitting sends these changes to H2 India's catalogue team. Your live listing stays up until they approve."
              : "H2 India checks every new listing before buyers see it, usually within 2 working days."}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                save(false);
              }}
            >
              Save draft
            </Button>
            <Button
              disabled={
                pending ||
                photos.items.some((i) => i.state === "uploading") ||
                docs.items.some((i) => i.state === "uploading")
              }
              onClick={() => {
                save(true);
              }}
            >
              {resubmit ? "Resubmit" : "Submit for review"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
