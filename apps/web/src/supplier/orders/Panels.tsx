"use client";

import type { ChecklistItem, DisputeOffer } from "@h2india/core/orders";
import {
  Alert,
  Button,
  FileRow,
  FileUpload,
  FormField,
  Icon,
  Input,
  Modal,
  Radio,
  RadioGroup,
  StatusBadge,
  Textarea,
  useToast,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import {
  acceptOrderAction,
  askH2IndiaAction,
  declineOrderAction,
  decideDateAction,
  disputeResponseAction,
  markShippedAction,
  proofOfDeliveryAction,
  saveDispatchAction,
  type ActionResult,
  type DispatchForm,
} from "./actions";

// Supplier order panels (steps 10.7 to 10.10): the controls on the order page. Words are from the frames named
// beside each; every action goes through ./actions, which takes the company from the session.

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ title: string; fields: Record<string, string> } | null>(null);
  const go = (work: () => Promise<ActionResult>, after?: () => void) => {
    start(async () => {
      const r = await work();
      if (r.ok) {
        setError(null);
        after?.();
        router.refresh();
      } else setError({ title: r.error, fields: r.errors ?? {} });
    });
  };
  return {
    pending,
    error,
    go,
    clear: () => {
      setError(null);
    },
  };
}

/** Accept or decline (693:8): the dispatch date is required; declining asks for a reason (275:23250). */
export function AcceptDecline({
  orderId,
  reference,
  value,
  buyerContact,
  defaultDate,
  shipsIn,
}: {
  orderId: string;
  reference: string;
  /** "₹50,80,000 before GST" */
  value: string;
  buyerContact: string;
  defaultDate: string;
  shipsIn: string | null;
}) {
  const [date, setDate] = useState(defaultDate);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const accept = useAction();
  const decline = useAction();
  return (
    <section className="flex flex-col gap-4 self-start rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Accept or decline</h2>
      {accept.error ? <Alert tone="error" title={accept.error.title} live /> : null}
      <FormField
        label="Dispatch date"
        required
        helper={`${shipsIn ? `Your listing says ships in ${shipsIn}. ` : ""}The buyer sees this date.`}
        error={accept.error?.fields.dispatchBy}
      >
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
          }}
        />
      </FormField>
      <Button
        size="lg"
        className="w-full"
        disabled={accept.pending}
        onClick={() => {
          accept.go(() => acceptOrderAction(orderId, date));
        }}
      >
        <Icon name="check" size={20} />
        Accept order
      </Button>
      <div className="flex flex-col gap-2 border-t border-default pt-4">
        <p className="type-label">Can&apos;t fulfil it?</p>
        <p className="type-caption text-secondary">
          Declining asks for a reason and tells the buyer straight away. It also counts against your acceptance rate.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => {
            setOpen(true);
          }}
        >
          Decline order
        </Button>
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Decline this order?"
        description={`${reference} · ${value}. ${buyerContact} gets your reason by email and can change the order.`}
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
            <Button
              variant="destructive"
              disabled={decline.pending || !reason.trim()}
              onClick={() => {
                decline.go(
                  () => declineOrderAction(orderId, reason),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Decline order
            </Button>
          </div>
        }
      >
        {decline.error ? <Alert tone="error" title={decline.error.title} live /> : null}
        <FormField label="Reason" error={decline.error?.fields.reason}>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </section>
  );
}

const ITEM_FIELDS: Record<
  ChecklistItem["key"],
  { title: string; fields: { key: keyof DispatchForm; label: string; type?: "date" | "text" | "long" }[] }
> = {
  invoice: { title: "Upload tax invoice", fields: [{ key: "invoiceNumber", label: "Invoice number" }] },
  irn: { title: "Add the e-invoice IRN", fields: [{ key: "irn", label: "IRN" }] },
  eway: { title: "Add e-way bill number", fields: [{ key: "ewayBillNumber", label: "E-way bill number" }] },
  certificates: {
    title: "Certificates for this product",
    fields: [{ key: "certificatesNote", label: "What's included, or why none is needed", type: "long" }],
  },
  carrier: {
    title: "Add carrier details",
    fields: [
      { key: "transporter", label: "Carrier" },
      { key: "lrNumber", label: "LR or tracking number" },
      { key: "expectedAt", label: "Expected delivery", type: "date" },
    ],
  },
};

function ChecklistAction({
  orderId,
  organisationId,
  item,
}: {
  orderId: string;
  organisationId: string;
  item: ChecklistItem;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DispatchForm>({});
  const a = useAction();
  const uploads = useUploads("order_document", { organisationId, max: 1 });
  const file = uploads.items[0];
  const spec = ITEM_FIELDS[item.key];
  const needsFile = item.key === "invoice";
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        {item.action}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={spec.title}
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
            <Button
              disabled={a.pending || (needsFile && !file?.fileId)}
              onClick={() => {
                a.go(
                  () => saveDispatchAction(orderId, { ...form, ...(needsFile ? { invoiceFileId: file?.fileId } : {}) }),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
        {needsFile ? (
          <>
            <FileUpload
              multiple={false}
              label="Drop the invoice here or browse"
              hint={uploadHint("order_document")}
              check={(f) => checkFile("order_document", f)}
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
          </>
        ) : null}
        {spec.fields.map((f) => (
          <FormField key={f.key} label={f.label} error={a.error?.fields[f.key]}>
            {f.type === "long" ? (
              <Textarea
                rows={3}
                value={form[f.key] ?? ""}
                onChange={(e) => {
                  setForm({ ...form, [f.key]: e.target.value });
                }}
              />
            ) : (
              <Input
                type={f.type === "date" ? "date" : "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => {
                  setForm({ ...form, [f.key]: e.target.value });
                }}
              />
            )}
          </FormField>
        ))}
      </Modal>
    </>
  );
}

/** Dispatch checklist (693:814): Mark as shipped unlocks when every item is done. */
export function DispatchChecklist({
  orderId,
  organisationId,
  items,
  left,
  paid,
}: {
  orderId: string;
  organisationId: string;
  items: ChecklistItem[];
  left: string;
  /** Everything due before dispatch is paid. */
  paid: boolean;
}) {
  const ship = useAction();
  const toast = useToast();
  return (
    <section className="flex flex-col rounded-card border border-default bg-page p-5">
      <div className="flex flex-col gap-1 pb-3">
        <h2 className="type-h4">Dispatch checklist</h2>
        <p className="type-caption text-secondary">Mark as shipped unlocks when every item is done.</p>
      </div>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3 border-t border-default py-3.5">
          <Icon
            name={item.done ? "check-circle" : "clock"}
            size={20}
            className={item.done ? "text-icon-success" : "text-icon-secondary"}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="type-label">{item.label}</p>
            <p className="type-caption text-secondary">{item.detail}</p>
          </div>
          {item.done ? (
            <StatusBadge status="Done" tone="success" />
          ) : (
            <ChecklistAction orderId={orderId} organisationId={organisationId} item={item} />
          )}
        </div>
      ))}
      {ship.error ? <Alert tone="error" title={ship.error.title} live /> : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-default pt-4">
        <p className="min-w-0 flex-1 type-body-sm text-body">
          {left || (paid ? "Everything is in. Mark it shipped when it leaves." : "Waiting for the buyer's payment.")}
        </p>
        <Button
          disabled={Boolean(left) || !paid || ship.pending}
          onClick={() => {
            ship.go(
              () => markShippedAction(orderId),
              () => {
                toast({ tone: "success", title: "Marked as shipped. The buyer and their receiving contact are told." });
              },
            );
          }}
        >
          Mark as shipped
        </Button>
      </div>
    </section>
  );
}

/** Upload proof of delivery (308:6627). */
export function ProofOfDelivery({
  orderId,
  organisationId,
  reference,
  buyer,
}: {
  orderId: string;
  organisationId: string;
  reference: string;
  buyer: string;
}) {
  const [open, setOpen] = useState(false);
  const [deliveredOn, setDeliveredOn] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const a = useAction();
  const uploads = useUploads("order_document", { organisationId, max: 1 });
  const file = uploads.items[0];
  return (
    <>
      <Button
        onClick={() => {
          if (!deliveredOn) setDeliveredOn(new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10));
          setOpen(true);
        }}
      >
        <Icon name="upload" size={18} />
        Upload proof of delivery
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Upload proof of delivery"
        description={`${reference} · ${buyer}. Once uploaded, the buyer has 5 working days to accept; the payout follows 2 working days after acceptance.`}
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
            <Button
              disabled={a.pending || !file?.fileId}
              onClick={() => {
                a.go(
                  () =>
                    proofOfDeliveryAction(orderId, {
                      fileIds: file?.fileId ? [file.fileId] : [],
                      deliveredOn,
                      receivedBy,
                    }),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Upload and notify buyer
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
        <FormField label="Signed delivery note or POD" error={a.error?.fields.files ?? file?.problem}>
          <FileUpload
            multiple={false}
            label="Drop the file here or browse"
            hint="PDF or JPG, up to 10 MB"
            check={(f) => checkFile("order_document", f)}
            onFiles={(files) => {
              uploads.add(files);
            }}
          />
        </FormField>
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
        <FormField label="Delivered on" error={a.error?.fields.deliveredOn}>
          <Input
            type="date"
            value={deliveredOn}
            onChange={(e) => {
              setDeliveredOn(e.target.value);
            }}
          />
        </FormField>
        <FormField label="Received by" error={a.error?.fields.receivedBy}>
          <Input
            value={receivedBy}
            onChange={(e) => {
              setReceivedBy(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </>
  );
}

const OFFERS: { value: DisputeOffer; label: string }[] = [
  { value: "replace", label: "Replace or repair at our cost" },
  { value: "partial_refund", label: "Offer a partial refund" },
  { value: "disagree", label: "Disagree and explain" },
];

/** Your response (813:12602): an offer, words, photos or documents; or ask H2 Economy to decide. */
export function DisputeResponse({
  orderId,
  disputeId,
  organisationId,
}: {
  orderId: string;
  disputeId: string;
  organisationId: string;
}) {
  const [offer, setOffer] = useState<DisputeOffer>("replace");
  const [reply, setReply] = useState("");
  const [refund, setRefund] = useState("");
  const a = useAction();
  const ask = useAction();
  const uploads = useUploads("order_document", { organisationId, max: 5 });
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Your response</h2>
      {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
      <RadioGroup
        value={offer}
        onValueChange={(v) => {
          setOffer(v as DisputeOffer);
        }}
        aria-label="Your response"
      >
        {OFFERS.map((o) => (
          <Radio key={o.value} value={o.value} label={o.label} />
        ))}
      </RadioGroup>
      {offer === "partial_refund" ? (
        <FormField label="Refund (₹)" error={a.error?.fields.refund}>
          <Input
            inputMode="decimal"
            value={refund}
            onChange={(e) => {
              setRefund(e.target.value);
            }}
          />
        </FormField>
      ) : null}
      <FormField label="Your reply" error={a.error?.fields.reply}>
        <Textarea
          rows={4}
          maxLength={1000}
          showCount
          value={reply}
          onChange={(e) => {
            setReply(e.target.value);
          }}
        />
      </FormField>
      <FileUpload
        label="Add photos or documents"
        hint="Dispatch photos, packing list, transit insurance claim · PDF or JPG up to 10 MB each"
        check={(f) => checkFile("order_document", f)}
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
      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          disabled={a.pending || (uploads.items.length > 0 && !uploads.ready)}
          onClick={() => {
            a.go(() =>
              disputeResponseAction(orderId, disputeId, {
                offer,
                reply,
                refund,
                fileIds: uploads.items.map((f) => f.fileId).filter((x): x is string => Boolean(x)),
              }),
            );
          }}
        >
          Send response
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={ask.pending}
          onClick={() => {
            ask.go(() => askH2IndiaAction(orderId, disputeId));
          }}
        >
          Ask H2 Economy to decide
        </Button>
      </div>
    </section>
  );
}

/** The buyer asked to change the dispatch date (344:27740): agree or decline. */
export function DateRequest({
  orderId,
  requestId,
  children,
}: {
  orderId: string;
  requestId: string;
  children: ReactNode;
}) {
  const a = useAction();
  return (
    <Alert
      tone="info"
      title="The buyer asked to change the dispatch date"
      action={
        <span className="flex gap-2">
          <Button
            size="sm"
            disabled={a.pending}
            onClick={() => {
              a.go(() => decideDateAction(orderId, requestId, true));
            }}
          >
            Agree
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={a.pending}
            onClick={() => {
              a.go(() => decideDateAction(orderId, requestId, false));
            }}
          >
            Decline
          </Button>
        </span>
      }
    >
      {children}
    </Alert>
  );
}
