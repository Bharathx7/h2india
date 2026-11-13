"use client";

import { REPORT_PROBLEMS, QUESTION_MAX } from "@h2india/core/products/rules-client";
import { Button, buttonClasses, cx, FormField, Icon, Input, Modal, Select, Switch, Textarea } from "@h2india/ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useFormGuard } from "@/lib/form-guard";
import { useCompare } from "@/marketplace/compare";
import { askQuestionAction, reportListingAction } from "./actions";

// The product page's buttons and dialogs (393:7160, 402:12544, 402:12601, 755:15048, 755:15165), step 6.4.

interface ProductRef {
  id: string;
  slug: string;
  name: string;
  supplier: string;
  category: string;
}

/** Quantity, delivery state and required-by date, then Request quote (393:7160). The RFQ wizard is step 9.3. */
export function QuoteForm({ product, states }: { product: ProductRef; states: string[] }) {
  return (
    <form action="/rfq/new" method="get" className="flex flex-col gap-3">
      <input type="hidden" name="product" value={product.slug} />
      <Input
        name="qty"
        type="number"
        min={1}
        defaultValue={1}
        prefix="Quantity:"
        suffix="units"
        aria-label="Quantity"
      />
      <Select name="state" aria-label="Delivery state" defaultValue="">
        <option value="">Delivery state</option>
        {states.map((s) => (
          <option key={s} value={s}>
            Delivery state: {s}
          </option>
        ))}
      </Select>
      <Input name="by" type="date" aria-label="Required by" prefix="Required by:" />
      <Button type="submit" size="lg" className="w-full">
        Request quote
      </Button>
    </form>
  );
}

export function CompareSave({ product, signedIn }: { product: ProductRef; signedIn: boolean }) {
  const compare = useCompare();
  const [note, setNote] = useState<string | null>(null);
  const on = compare.has(product.id);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center justify-around">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => {
            setNote(compare.toggle({ id: product.id, name: product.name, category: product.category }));
          }}
          className="inline-flex items-center gap-2 rounded-control px-2 py-1 type-label text-primary hover:bg-subtle"
        >
          <Icon name="compare" size={18} />
          {on ? "In compare" : "Compare"}
        </button>
        <Link
          href={signedIn ? "/member/saved" : `/sign-in?next=${encodeURIComponent("/member/saved")}`}
          className="inline-flex items-center gap-2 rounded-control px-2 py-1 type-label text-primary hover:bg-subtle"
        >
          <Icon name="heart" size={18} />
          Save to list
        </Link>
      </div>
      {note ? (
        <p role="alert" className="type-caption text-error">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Summary({ product }: { product: ProductRef }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-subtle p-3">
      <span className="flex size-9 items-center justify-center rounded-control bg-tint text-icon-link">
        <Icon name="zap" size={18} />
      </span>
      <span className="flex flex-col">
        <span className="type-label text-primary">{product.name}</span>
        <span className="type-caption text-secondary">{product.supplier}</span>
      </span>
    </div>
  );
}

/** Ask a technical question (402:12544; sent 402:12601; phones 402:12630). Needs an account. */
export function AskQuestion({
  product,
  signedIn,
  company,
  className,
}: {
  product: ProductRef;
  signedIn: boolean;
  company: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [question, setQuestion] = useState("");
  const [share, setShare] = useState(Boolean(company));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const { trap, guard } = useFormGuard();
  if (!signedIn) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(`/marketplace/products/${product.slug}`)}`}
        className={cx(buttonClasses({ variant: "outline", size: "lg" }), className)}
      >
        Ask a technical question
      </Link>
    );
  }
  const submit = () => {
    start(async () => {
      const r = await askQuestionAction({ slug: product.slug, question, shareCompany: share, guard: guard() });
      if (r.ok) setSent(true);
      else setErrors(r.errors);
    });
  };
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className={className}
        onClick={() => {
          setOpen(true);
        }}
      >
        Ask a technical question
      </Button>
      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setSent(false);
            setQuestion("");
            setErrors({});
          }
        }}
        title={sent ? "Question sent" : "Ask a technical question"}
        footer={
          sent ? (
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending}>
                Send question
              </Button>
            </>
          )
        }
      >
        <Summary product={product} />
        {sent ? (
          <p role="status" className="type-body text-body">
            {product.supplier} gets your question through H2 India. You&apos;ll see the answer in Messages and
            we&apos;ll email you when it arrives.
          </p>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {trap}
            {errors._ ? (
              <p role="alert" className="type-body-sm text-error">
                {errors._}
              </p>
            ) : null}
            <FormField
              label="Your question"
              required
              error={errors.question}
              helper={`${String(question.length)} / ${QUESTION_MAX.toLocaleString("en-IN")}`}
            >
              <Textarea
                value={question}
                maxLength={QUESTION_MAX}
                rows={4}
                onChange={(e) => {
                  setQuestion(e.target.value);
                }}
              />
            </FormField>
            {company ? (
              <Switch label={`Share my company name (${company})`} checked={share} onCheckedChange={setShare} />
            ) : null}
            <p className="type-caption text-secondary">
              Your question goes to the supplier through H2 India. Your email and phone number stay private.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}

/** Report this listing (755:15048; sent 755:15165). Open to everyone; the supplier never sees who sent it. */
export function ReportListing({ product }: { product: ProductRef }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const { trap, guard } = useFormGuard();
  const submit = () => {
    start(async () => {
      const r = await reportListingAction({ slug: product.slug, problem, details, email, guard: guard() });
      if (r.ok) setSent(true);
      else setErrors(r.errors);
    });
  };
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 type-label-sm text-secondary underline underline-offset-4 hover:text-primary"
      >
        Report this listing
      </button>
      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSent(false);
        }}
        title={sent ? "Report sent" : "Report this listing"}
        footer={
          sent ? (
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending}>
                Send report
              </Button>
            </>
          )
        }
      >
        <Summary product={product} />
        {sent ? (
          <p role="status" className="type-body text-body">
            Thank you. Our compliance team reviews every report{email ? " and will email you what we found" : ""}. The
            supplier doesn&apos;t see who sent it.
          </p>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {trap}
            <p className="type-body-sm text-body">
              Tell us what&apos;s wrong. Our compliance team reviews every report, and the supplier doesn&apos;t see who
              sent it.
            </p>
            {errors._ ? (
              <p role="alert" className="type-body-sm text-error">
                {errors._}
              </p>
            ) : null}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 type-label text-primary">
                What&apos;s the problem? <span className="text-error">*</span>
              </legend>
              <div className="grid gap-2 md:grid-cols-2">
                {REPORT_PROBLEMS.map((p) => (
                  <label
                    key={p.value}
                    className={cx(
                      "flex cursor-pointer items-center gap-3 rounded-control border p-3 type-label",
                      problem === p.value ? "border-accent bg-mint" : "border-default",
                    )}
                  >
                    <input
                      type="radio"
                      name="problem"
                      value={p.value}
                      checked={problem === p.value}
                      onChange={() => {
                        setProblem(p.value);
                      }}
                      className="size-4 accent-ink-900"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              {errors.problem ? <p className="type-caption text-error">{errors.problem}</p> : null}
            </fieldset>
            <FormField
              label="Details"
              required
              error={errors.details}
              helper={`${String(details.length)} / ${QUESTION_MAX.toLocaleString("en-IN")}`}
            >
              <Textarea
                value={details}
                maxLength={QUESTION_MAX}
                rows={3}
                onChange={(e) => {
                  setDetails(e.target.value);
                }}
              />
            </FormField>
            <FormField label="Your email (optional)" error={errors.email}>
              <Input
                type="email"
                value={email}
                placeholder="So we can tell you what we found"
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </FormField>
          </form>
        )}
      </Modal>
    </>
  );
}
