"use client";

import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Icon,
  Input,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Textarea,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeAction, declineAllAction, editRfqAction, extendAction, revisionAction } from "./rfq-actions";

// RFQ actions (564:9): Extend offer deadline (564:577), Close RFQ (566:776), Ask for a revised quote (566:892) and
// Decline all quotes (566:1011). Words as drawn.

type R = { ok: true } | { ok: false; error: string };

function useAct() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (work: () => Promise<R>, done: () => void) => {
    start(async () => {
      const r = await work();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError("");
      done();
      router.refresh();
    });
  };
  return { error, pending, go };
}

const EXTEND_REASONS = ["Need more quotes", "Suppliers asked for more time", "Our dates changed"];
const CLOSE_REASONS = [
  "We bought elsewhere",
  "Project is on hold",
  "Prices are above budget",
  "Our requirements changed",
  "Other reason",
];
const DECLINE_REASONS = [
  "Prices are above budget",
  "Lead times are too long",
  "We bought elsewhere",
  "Project is on hold",
  "Other reason",
];
const ASPECTS = ["Price", "Lead time", "Payment schedule", "Delivery terms", "Warranty"];

export function ExtendDeadline({
  id,
  reference,
  current,
  suppliers,
  today,
}: {
  id: string;
  reference: string;
  current: string;
  suppliers: number;
  today: string;
}) {
  const a = useAct();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("18:00");
  const [why, setWhy] = useState(EXTEND_REASONS[0] ?? "");
  const label = day
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00+05:30`))
    : "";
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="calendar" size={16} />
        Extend deadline
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Extend the offer deadline"
        description={`${reference} · current deadline ${current}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={a.pending || !day}
              onClick={() => {
                a.go(
                  () => extendAction(id, day, time, why),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              {label ? `Extend to ${label}` : "Extend"}
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error} live /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="type-label">New deadline</span>
            <Input
              type="date"
              min={today}
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Time</span>
            <Select
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
              }}
            >
              {["10:00", "12:00", "15:00", "18:00"].map((t) => (
                <option key={t} value={t}>
                  {new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
                    new Date(`2026-01-01T${t}:00Z`),
                  )}{" "}
                  IST
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Reason</span>
          <Select
            value={why}
            onChange={(e) => {
              setWhy(e.target.value);
            }}
          >
            {EXTEND_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <span className="type-caption text-secondary">Suppliers see this reason.</span>
        </label>
        <p className="type-caption text-secondary">
          All {suppliers} suppliers are told about the new deadline. Suppliers who already quoted can update their quote
          until then.
        </p>
      </Modal>
    </>
  );
}

export function CloseRfq({ id, reference, quotes }: { id: string; reference: string; quotes: number }) {
  const a = useAct();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [note, setNote] = useState("");
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Close RFQ
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Close ${reference}?`}
        description={`Suppliers can't send or change quotes after this.${quotes ? ` The ${String(quotes)} ${quotes === 1 ? "quote" : "quotes"} you received move to Closed with this RFQ.` : ""}`}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Keep it open
            </Button>
            <Button
              variant="destructive"
              disabled={a.pending || !why}
              onClick={() => {
                a.go(
                  () => closeAction(id, why, note),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Close RFQ
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error} live /> : null}
        <p className="type-label">Why are you closing it?</p>
        <RadioGroup value={why} onValueChange={setWhy} aria-label="Why are you closing it?">
          {CLOSE_REASONS.map((r) => (
            <Radio key={r} value={r} label={r} />
          ))}
        </RadioGroup>
        <p className="type-caption text-secondary">Suppliers see the reason, not your note.</p>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Note for your team (optional)</span>
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

export function DeclineAll({ id, names }: { id: string; names: string[] }) {
  const a = useAct();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(DECLINE_REASONS[0] ?? "");
  const [note, setNote] = useState("");
  const list =
    names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1] ?? ""}` : (names[0] ?? "");
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Decline all quotes
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Decline all ${String(names.length)} quotes?`}
        description={`${list} are told their quotes were declined, and the RFQ closes.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={a.pending}
              onClick={() => {
                a.go(
                  () => declineAllAction(id, why, note),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Decline all quotes
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Reason</span>
          <Select
            value={why}
            onChange={(e) => {
              setWhy(e.target.value);
            }}
          >
            {DECLINE_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <span className="type-caption text-secondary">Suppliers see this reason.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Note to suppliers (optional)</span>
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

export function AskRevision({
  id,
  subtitle,
  quotes,
  deadline,
}: {
  id: string;
  subtitle: string;
  quotes: { quoteId: string; label: string; name: string }[];
  deadline: string;
}) {
  const a = useAct();
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState(quotes[0]?.quoteId ?? "");
  const [aspects, setAspects] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const name = quotes.find((q) => q.quoteId === quoteId)?.name ?? "the supplier";
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Ask for a revised quote
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Ask for a revised quote"
        description={subtitle}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={a.pending || !message.trim()}
              onClick={() => {
                a.go(
                  () => revisionAction(id, quoteId, aspects, message),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Send request
            </Button>
          </div>
        }
      >
        {a.error ? <Alert tone="error" title={a.error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Supplier</span>
          <Select
            value={quoteId}
            onChange={(e) => {
              setQuoteId(e.target.value);
            }}
          >
            {quotes.map((q) => (
              <option key={q.quoteId} value={q.quoteId}>
                {q.label}
              </option>
            ))}
          </Select>
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="type-label">What should they look at?</legend>
          <div className="flex flex-wrap gap-4">
            {ASPECTS.map((x) => (
              <Checkbox
                key={x}
                label={x}
                checked={aspects.includes(x)}
                onCheckedChange={(v) => {
                  setAspects(v === true ? [...aspects, x] : aspects.filter((y) => y !== x));
                }}
              />
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Message to {name}</span>
          <Textarea
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
          />
          <span className="self-end type-caption text-secondary">{message.length} / 1,000</span>
        </label>
        <p className="type-caption text-secondary">
          Their current quote stays on the comparison until they send a revised one. They have until the offer deadline,{" "}
          {deadline}.
        </p>
      </Modal>
    </>
  );
}

/** Edit RFQ after sending (564:383): quantity, needed by and specification, with what changed for the suppliers. */
export function EditRfq({
  id,
  reference,
  subtitle,
  version,
  suppliers,
  quoted,
  start,
}: {
  id: string;
  reference: string;
  subtitle: string;
  version: number;
  suppliers: number;
  quoted: number;
  start: { quantity: number; unit: string; requiredBy: string; requirements: string };
}) {
  const a = useAct();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(start.quantity));
  const [requiredBy, setRequiredBy] = useState(start.requiredBy);
  const [spec, setSpec] = useState(start.requirements);
  const [what, setWhat] = useState("");
  const next = version + 1;
  const all = suppliers === 1 ? "the supplier" : `all ${String(suppliers)} suppliers`;
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="pencil" size={16} />
        Edit RFQ
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Edit ${reference}`}
        description={subtitle}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={a.pending || !what.trim()}
              onClick={() => {
                a.go(
                  () =>
                    editRfqAction(id, {
                      quantity: Number(quantity),
                      requiredBy: requiredBy || null,
                      requirements: spec,
                      whatChanged: what,
                    }),
                  () => {
                    setOpen(false);
                    setWhat("");
                  },
                );
              }}
            >
              Save as version {next}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert
            tone="warning"
            title={
              quoted
                ? `${String(quoted)} ${quoted === 1 ? "supplier has" : "suppliers have"} already quoted`
                : "Suppliers will be told"
            }
          >
            Saving creates version {next} of this RFQ and tells {all} what changed.
          </Alert>
          {a.error ? <Alert tone="error" title={a.error} live /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Quantity" required helper={start.unit}>
              <Input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                }}
              />
            </FormField>
            <FormField label="Needed by">
              <Input
                type="date"
                value={requiredBy}
                onChange={(e) => {
                  setRequiredBy(e.target.value);
                }}
              />
            </FormField>
          </div>
          <FormField label="Specification">
            <Textarea
              rows={4}
              maxLength={1000}
              showCount
              value={spec}
              onChange={(e) => {
                setSpec(e.target.value);
              }}
            />
          </FormField>
          <FormField label="What changed (shown to suppliers)" required>
            <Input
              maxLength={200}
              value={what}
              onChange={(e) => {
                setWhat(e.target.value);
              }}
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
