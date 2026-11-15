"use client";

import { Alert, Button, cx, FileRow, FileUpload, FormField, Icon, Input, Modal, Textarea, useToast } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth-client";
import { checkFile, useUploads } from "@/lib/uploads";
import {
  acceptDeliveryAction,
  acceptOfferAction,
  approveAction,
  cancelAction,
  escalateAction,
  payOnlineAction,
  rateAction,
  rejectAction,
  reportProblemAction,
  requestDateAction,
  type BuyerOrderResult,
} from "./actions";

// Buyer order controls (steps 10.3, 10.5, 10.10). Words from the frames named beside each; the ones built without a
// frame are listed in docs/approvals/frames-to-check.md (A178).

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ title: string; fields: Record<string, string> } | null>(null);
  const go = (work: () => Promise<BuyerOrderResult>, after?: (r: BuyerOrderResult & { ok: true }) => void) => {
    start(async () => {
      const r = await work();
      if (r.ok) {
        setError(null);
        if (after) after(r);
        router.refresh();
      } else setError({ title: r.error, fields: r.errors ?? {} });
    });
  };
  return { pending, error, go };
}

function Footer({ onCancel, children }: { onCancel: () => void; children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      {children}
    </div>
  );
}

/** Approve order (806:14572) with "Confirm it's you" (744:29031): a fresh passkey, then the approval. */
export function ApprovePanel({ orderId, requester }: { orderId: string; requester: string }) {
  const [note, setNote] = useState("");
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const a = useAction();
  const r = useAction();
  return (
    <section className="flex flex-col gap-4 self-start rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Your decision</h2>
      {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
      <FormField label="Note to the requester" helper="Optional">
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
          }}
        />
      </FormField>
      <Button
        size="lg"
        className="w-full"
        disabled={a.pending}
        onClick={() => {
          a.go(async () => {
            const pk = await authClient.signIn.passkey();
            if (pk.error)
              return {
                ok: false,
                error: "The passkey wasn't confirmed. Try again, or add a passkey in Sign-in and security.",
              };
            return approveAction(orderId, note);
          });
        }}
      >
        <Icon name="lock" size={18} />
        Approve with passkey
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => {
          setDeclining(true);
        }}
      >
        Decline
      </Button>
      <p className="type-caption text-secondary">
        Approving sends the order to the supplier. {requester} is told either way.
      </p>
      <Modal
        open={declining}
        onOpenChange={setDeclining}
        width={480}
        title="Decline this order?"
        description={`${requester} gets your reason by email and can change the order.`}
        footer={
          <Footer
            onCancel={() => {
              setDeclining(false);
            }}
          >
            <Button
              variant="destructive"
              disabled={r.pending || !reason.trim()}
              onClick={() => {
                r.go(
                  () => rejectAction(orderId, reason),
                  () => {
                    setDeclining(false);
                  },
                );
              }}
            >
              Decline order
            </Button>
          </Footer>
        }
      >
        {r.error ? <Alert tone="error" title={r.error.title} live /> : null}
        <FormField label="Reason">
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

/** Pay online (792:15399): opens the payment partner's checkout for the due milestone. */
export function PayOnline({ orderId, milestoneId, amount }: { orderId: string; milestoneId: string; amount: string }) {
  const a = useAction();
  const pay = (method: "upi" | "card" | "netbanking") => {
    a.go(
      () => payOnlineAction(orderId, milestoneId, method),
      (r) => {
        if (r.url) window.location.assign(r.url);
      },
    );
  };
  return (
    <div className="flex flex-col gap-3">
      {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
      <Button
        size="lg"
        disabled={a.pending}
        onClick={() => {
          pay("upi");
        }}
      >
        Pay {amount} online
      </Button>
      <p className="type-caption text-secondary">
        UPI, cards or net banking on our payment partner&apos;s page.{" "}
        <button
          type="button"
          className="underline"
          disabled={a.pending}
          onClick={() => {
            pay("card");
          }}
        >
          Pay by card
        </button>{" "}
        ·{" "}
        <button
          type="button"
          className="underline"
          disabled={a.pending}
          onClick={() => {
            pay("netbanking");
          }}
        >
          Net banking
        </button>
      </p>
    </div>
  );
}

/** Delivered: accept, or report a problem (330:27033, 330:27342), with accept part (697:8). */
export function AcceptOrReport({
  orderId,
  reference,
  supplier,
  organisationId,
  held,
}: {
  orderId: string;
  reference: string;
  supplier: string;
  organisationId: string;
  held: string;
}) {
  const [reporting, setReporting] = useState(false);
  const [form, setForm] = useState({ reason: "", details: "", fix: "", accepted: "" });
  const accept = useAction();
  const report = useAction();
  const toast = useToast();
  const uploads = useUploads("order_document", { organisationId, max: 5 });
  return (
    <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">Is everything as ordered?</h2>
      <p className="type-body-sm text-body">
        Accepting releases {held} to {supplier}. If something&apos;s wrong, report it and the payment stays on hold.
      </p>
      {accept.error ? <Alert tone="error" title={accept.error.title} live /> : null}
      <Button
        size="lg"
        disabled={accept.pending}
        onClick={() => {
          accept.go(
            () => acceptDeliveryAction(orderId),
            () => {
              toast({ tone: "success", title: "Delivery accepted. The supplier is paid in 2 working days." });
            },
          );
        }}
      >
        Accept delivery
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => {
          setReporting(true);
        }}
      >
        Report a problem
      </Button>
      <Modal
        open={reporting}
        onOpenChange={setReporting}
        title={`Report a problem with ${reference}`}
        description={`${supplier} gets your report and has 2 working days to reply. Their payout stays on hold until it is resolved, and H2 India steps in if you can't agree within 5 working days.`}
        footer={
          <Footer
            onCancel={() => {
              setReporting(false);
            }}
          >
            <Button
              disabled={report.pending || (uploads.items.length > 0 && !uploads.ready)}
              onClick={() => {
                report.go(
                  () =>
                    reportProblemAction(orderId, {
                      ...form,
                      fileIds: uploads.items.map((f) => f.fileId).filter((x): x is string => Boolean(x)),
                    }),
                  () => {
                    setReporting(false);
                  },
                );
              }}
            >
              Report problem
            </Button>
          </Footer>
        }
      >
        {report.error ? <Alert tone="error" title={report.error.title} live /> : null}
        <FormField label="What went wrong?" error={report.error?.fields.reason}>
          <Input
            value={form.reason}
            onChange={(e) => {
              setForm({ ...form, reason: e.target.value });
            }}
          />
        </FormField>
        <FormField label="Details and photos" error={report.error?.fields.details}>
          <Textarea
            rows={3}
            value={form.details}
            onChange={(e) => {
              setForm({ ...form, details: e.target.value });
            }}
          />
        </FormField>
        <FileUpload
          label="Add photos"
          hint="JPG, PNG or PDF, up to 10 MB each"
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
        <FormField label="What would fix it?">
          <Input
            value={form.fix}
            onChange={(e) => {
              setForm({ ...form, fix: e.target.value });
            }}
          />
        </FormField>
        <FormField
          label="Accept part of the order (₹)"
          helper={`Optional. The amount you accept is released now; the rest of ${held} stays held.`}
          error={report.error?.fields.accepted}
        >
          <Input
            inputMode="decimal"
            value={form.accepted}
            onChange={(e) => {
              setForm({ ...form, accepted: e.target.value });
            }}
          />
        </FormField>
      </Modal>
    </section>
  );
}

/** The supplier's offer on a dispute (697:579): accept it, or ask H2 India to decide. */
export function OfferActions({
  orderId,
  disputeId,
  canAccept,
}: {
  orderId: string;
  disputeId: string;
  canAccept: boolean;
}) {
  const a = useAction();
  return (
    <div className="flex flex-col gap-3">
      {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
      <div className="flex flex-wrap gap-3">
        {canAccept ? (
          <Button
            disabled={a.pending}
            onClick={() => {
              a.go(() => acceptOfferAction(orderId, disputeId));
            }}
          >
            Accept the offer
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={a.pending}
          onClick={() => {
            a.go(() => escalateAction(orderId, disputeId));
          }}
        >
          Ask H2 India to decide
        </Button>
      </div>
    </div>
  );
}

/** Cancel order (330:27379; words A178). */
export function CancelOrder({
  orderId,
  reference,
  refund,
}: {
  orderId: string;
  reference: string;
  refund: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const a = useAction();
  const toast = useToast();
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(true);
        }}
      >
        Cancel order
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Cancel ${reference}?`}
        description={`The supplier is told straight away.${refund ? ` ${refund} you've paid is refunded to the account it came from.` : ""}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Keep order
            </Button>
            <Button
              variant="destructive"
              disabled={a.pending || !reason.trim()}
              onClick={() => {
                a.go(
                  () => cancelAction(orderId, reason),
                  () => {
                    setOpen(false);
                    toast({ tone: "success", title: "Order cancelled" });
                  },
                );
              }}
            >
              Cancel order
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
        <FormField label="Reason">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </>
  );
}

/** Ask to change the dispatch date (344:27740). */
export function RequestDate({
  orderId,
  supplier,
  current,
}: {
  orderId: string;
  supplier: string;
  current: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const a = useAction();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Ask to change the dispatch date
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Ask to change the dispatch date"
        description={`${supplier} booked dispatch for ${current ?? "the agreed date"}. If they agree, the balance due date moves with it.`}
        footer={
          <Footer
            onCancel={() => {
              setOpen(false);
            }}
          >
            <Button
              disabled={a.pending || !date || !reason.trim()}
              onClick={() => {
                a.go(
                  () => requestDateAction(orderId, date, reason),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Send request
            </Button>
          </Footer>
        }
      >
        {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
        <FormField label="Preferred dispatch date" error={a.error?.fields.date}>
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
            }}
          />
        </FormField>
        <FormField label="Reason">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </>
  );
}

/** Rate this order (G12; built from the design system, A178): 1 to 5 and a comment the supplier sees. */
export function RateOrder({ orderId, supplier }: { orderId: string; supplier: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const a = useAction();
  return (
    <section className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
      <h2 className="type-h4">How did {supplier} do?</h2>
      {a.error ? <Alert tone="error" title={a.error.title} live /> : null}
      <div role="radiogroup" aria-label="Rating, 1 to 5" className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            onClick={() => {
              setRating(n);
            }}
            className={cx(
              "flex size-11 items-center justify-center rounded-pill border type-label",
              n === rating ? "border-selected bg-mint" : "border-control",
            )}
          >
            {n}
          </button>
        ))}
        <span className="type-caption text-secondary">1 poor · 5 excellent</span>
      </div>
      <FormField label="Comment (optional)">
        <Textarea
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
          }}
        />
      </FormField>
      <Button
        disabled={a.pending || rating === 0}
        onClick={() => {
          a.go(() => rateAction(orderId, rating, comment));
        }}
      >
        Send rating
      </Button>
    </section>
  );
}
