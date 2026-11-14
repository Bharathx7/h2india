"use client";

import { Money } from "@h2india/core/money";
import { PAYMENT_PRESETS, quoteFigures } from "@h2india/core/rfq/totals";
import {
  Alert,
  Button,
  buttonClasses,
  FileRow,
  FileUpload,
  Icon,
  Input,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Textarea,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import {
  declineRfqAction,
  saveQuoteAction,
  sendQuoteAction,
  viewedAction,
  withdrawQuoteAction,
  type QuoteForm,
} from "./actions";

// Your quote (617:8 draft, 618:16 sent, 619:8 states) and the Withdraw quote (620:8) and Decline RFQ (620:146) dialogs,
// step 9.5. What the supplier receives after fees isn't shown until the fees are decided (C1, C3): a note says so.

const rupees = (p: bigint) => Money.format(p);
const toPaise = (v: string) => {
  try {
    return v.trim() ? Money.parse(v) : 0n;
  } catch {
    return 0n;
  }
};

export const WITHDRAW_REASONS = [
  "Can't meet the lead time",
  "Prices have changed",
  "Can't supply this any more",
  "Something else",
];
export const DECLINE_REASONS = [
  "We don't make this product",
  "We can't meet the date needed",
  "The quantity is outside what we supply",
  "Something else",
];

function Field({
  label,
  error,
  children,
  suffix,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="type-label">
        {label} <span className="text-error">*</span>
        {suffix ? <span className="sr-only"> ({suffix})</span> : null}
      </span>
      {children}
      {error ? <span className="type-caption text-error">{error}</span> : null}
    </label>
  );
}

export function MarkViewed({ rfqId }: { rfqId: string }) {
  useEffect(() => {
    void viewedAction(rfqId);
  }, [rfqId]);
  return null;
}

export function QuoteBuilder({
  rfqId,
  supplierId,
  start,
  version,
  previous,
  sentLabel,
}: {
  rfqId: string;
  supplierId: string;
  start: QuoteForm;
  /** The version this draft becomes. */
  version: number;
  /** "unit price ₹41,50,000 · lead time 16" when revising. */
  previous: string | null;
  sentLabel: string | null;
}) {
  const router = useRouter();
  const [f, setF] = useState(start);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const [pending, run] = useTransition();
  const uploads = useUploads("quote_attachment", { organisationId: supplierId, max: 10 });
  const set = (p: Partial<QuoteForm>) => {
    setF((x) => ({ ...x, ...p }));
  };
  const gst = Math.round(Number(f.gstRate || "0") * 100);
  const figures = quoteFigures([{ quantity: f.quantity, unitPricePaise: toPaise(f.unitPrice), gstRateBps: gst }], {
    paise: toPaise(f.freight),
    gstRateBps: gst,
  });
  const files = uploads.items.filter((i) => i.state === "uploaded" && i.fileId).map((i) => i.fileId ?? "");
  const form = () => ({ ...f, documents: [...new Set([...f.documents, ...files])] });
  const go = (send: boolean) => {
    run(async () => {
      const r = send ? await sendQuoteAction(rfqId, form()) : await saveQuoteAction(rfqId, form());
      setError(r.ok ? "" : r.error);
      setErrors(r.ok ? {} : (r.errors ?? {}));
      if (r.ok) {
        setSaved(send ? "" : "Draft saved");
        router.refresh();
      }
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="type-h3">{version > 1 ? "Revise your quote" : "Your quote"}</h2>
        {version > 1 ? <span className="rounded-pill bg-subtle px-2 py-0.5 type-caption">v{version} draft</span> : null}
      </div>
      {version > 1 ? (
        <p className="type-caption text-secondary">
          v{version - 1} stays with the buyer until you send v{version}.
        </p>
      ) : null}
      {saved ? (
        <p className="flex items-center gap-1 type-caption text-secondary" aria-live="polite">
          <Icon name="check-circle" size={14} />
          {saved}
        </p>
      ) : null}
      {error ? <Alert tone="error" title={error} live /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Unit price, before GST" error={errors.unitPrice}>
          <Input
            inputMode="decimal"
            value={f.unitPrice}
            placeholder="₹"
            onChange={(e) => {
              set({ unitPrice: e.target.value });
            }}
          />
        </Field>
        <Field label="GST rate" error={errors.gstRate} suffix="%">
          <Input
            inputMode="decimal"
            value={f.gstRate}
            onChange={(e) => {
              set({ gstRate: e.target.value });
            }}
          />
        </Field>
        <Field label="HSN code" error={errors.hsn}>
          <Input
            value={f.hsn}
            onChange={(e) => {
              set({ hsn: e.target.value });
            }}
          />
        </Field>
        <Field label="Quantity" suffix={f.unit}>
          <Input value={`${String(f.quantity)} ${f.unit}`} disabled />
        </Field>
        <Field label="Freight" error={errors.freight}>
          <Input
            inputMode="decimal"
            value={f.freight}
            placeholder="₹"
            onChange={(e) => {
              set({ freight: e.target.value });
            }}
          />
        </Field>
        <Field label="Lead time" error={errors.leadTime} suffix="weeks">
          <Input
            inputMode="numeric"
            value={f.leadTime}
            onChange={(e) => {
              set({ leadTime: e.target.value });
            }}
          />
        </Field>
      </div>
      <Field label="Delivery terms" error={errors.deliveryTerms}>
        <Input
          value={f.deliveryTerms}
          list="delivery-terms"
          onChange={(e) => {
            set({ deliveryTerms: e.target.value });
          }}
        />
        <datalist id="delivery-terms">
          <option value="Delivered to site, freight included" />
          <option value="Ex-works, freight extra" />
        </datalist>
      </Field>
      <Field label="Payment schedule" error={errors.schedule}>
        <Select
          value={f.schedule}
          onChange={(e) => {
            set({ schedule: e.target.value });
          }}
        >
          <option value="">Choose</option>
          {PAYMENT_PRESETS.map((p) => (
            <option key={p.label}>{p.label}</option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Warranty" suffix="months">
          <Input
            inputMode="numeric"
            value={f.warranty}
            onChange={(e) => {
              set({ warranty: e.target.value });
            }}
          />
        </Field>
        <Field label="Valid until" error={errors.validUntil}>
          <Input
            type="date"
            value={f.validUntil}
            onChange={(e) => {
              set({ validUntil: e.target.value });
            }}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="type-label">Attachments</span>
        <FileUpload
          multiple
          label="Add file"
          hint={uploadHint("quote_attachment")}
          check={(file) => checkFile("quote_attachment", file)}
          onFiles={(list) => {
            uploads.add(list);
          }}
        />
        {uploads.items.map((i) => (
          <FileRow
            key={i.localId}
            name={i.name}
            status={i.state}
            progress={i.progress}
            meta={i.meta}
            error={i.problem}
            onRemove={() => {
              uploads.remove(i.localId);
            }}
          />
        ))}
      </div>
      {version > 1 ? (
        <label className="flex flex-col gap-1.5">
          <span className="type-label">What changed (the buyer sees this)</span>
          {previous ? (
            <span className="type-caption text-secondary">
              Changed from v{version - 1}: {previous}
            </span>
          ) : null}
          <Textarea
            rows={4}
            maxLength={500}
            value={f.changeNote}
            onChange={(e) => {
              set({ changeNote: e.target.value });
            }}
          />
          <span className="self-end type-caption text-secondary">{f.changeNote.length} / 500</span>
          {errors.changeNote ? <span className="type-caption text-error">{errors.changeNote}</span> : null}
        </label>
      ) : null}
      <p className="flex justify-between gap-3 type-label">
        <span>Buyer sees total</span>
        <span className="type-mono">{rupees(figures.totalPaise)} incl. GST and freight</span>
      </p>
      <div className="rounded-card bg-mint p-4">
        <p className="type-label">If the buyer accepts this quote</p>
        <p className="type-caption text-body">
          H2 India&apos;s commission and the TCS and TDS on this order are shown here once fees are finalised. Until
          then nothing is deducted.
        </p>
      </div>
      {Object.keys(errors).length && !errors.unitPrice ? (
        <p className="type-caption text-error">{Object.values(errors).join(". ")}.</p>
      ) : null}
      <Button
        disabled={pending}
        onClick={() => {
          go(true);
        }}
      >
        {version > 1 ? `Send v${String(version)}` : "Send quote"}
      </Button>
      <div className="flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            go(false);
          }}
        >
          Save draft
        </Button>
        {sentLabel ? (
          <Link href={`/supplier/rfqs/${rfqId}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Cancel
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function WithdrawQuote({
  rfqId,
  quoteId,
  buyer,
  version,
}: {
  rfqId: string;
  quoteId: string;
  buyer: string;
  version: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(WITHDRAW_REASONS[0] ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, run] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(true);
        }}
      >
        Withdraw quote
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Withdraw your quote?"
        description={`${buyer} won't be able to accept v${String(version)} any more. You can't undo this.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Keep quote
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                run(async () => {
                  const r = await withdrawQuoteAction(rfqId, quoteId, reason, note);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              Withdraw quote
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">
            Reason <span className="text-error">*</span>
          </span>
          <Select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          >
            {WITHDRAW_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Note to the buyer (optional)</span>
          <Textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
          <span className="self-end type-caption text-secondary">{note.length} / 500</span>
        </label>
      </Modal>
    </>
  );
}

export function DeclineRfq({ rfqId, buyer, startOpen }: { rfqId: string; buyer: string; startOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(startOpen));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, run] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Decline with a reason
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Decline this RFQ?"
        description={`${buyer} is told you won't quote. You can't undo this.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Keep RFQ
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !reason}
              onClick={() => {
                run(async () => {
                  const r = await declineRfqAction(rfqId, reason, note);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              Decline RFQ
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <RadioGroup value={reason} onValueChange={setReason} aria-label="Reason">
          {DECLINE_REASONS.map((r) => (
            <Radio key={r} value={r} label={r} />
          ))}
        </RadioGroup>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Note to the buyer (optional)</span>
          <Textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
          <span className="self-end type-caption text-secondary">{note.length} / 500</span>
        </label>
      </Modal>
    </>
  );
}
