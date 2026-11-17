"use client";

import type { CheckoutView, PaymentMethod } from "@h2india/core/orders";
import { Alert, Button, cx, FileRow, FileUpload, FormField, Icon, Input, Radio, RadioGroup, Select } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkFile, useUploads } from "@/lib/uploads";
import { placeOrderAction, saveStepAction, type CheckoutResult } from "./actions";

// Checkout steps (step 10.2): Delivery (80:6431), Billing (768:47189), Payment (80:6464, A178), Review (80:6687, A178).

export type Step = "delivery" | "billing" | "payment" | "review";

function useStep() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState<{ title: string; fields: Record<string, string> } | null>(null);
  const go = (work: () => Promise<CheckoutResult>, next: (r: CheckoutResult & { ok: true }) => string) => {
    start(async () => {
      const r = await work();
      if (r.ok) router.push(next(r));
      else setProblem({ title: r.error, fields: r.errors ?? {} });
    });
  };
  return { pending, problem, go };
}

function Actions({
  back,
  backLabel,
  next,
  onNext,
  pending,
}: {
  back: string;
  backLabel: string;
  next: string;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link
        href={back}
        className="inline-flex h-10 items-center gap-2 rounded-pill border border-control px-4.5 type-label"
      >
        <Icon name="arrow-left" size={16} />
        {backLabel}
      </Link>
      <Button disabled={pending} onClick={onNext}>
        {next}
        <Icon name="arrow-right" size={16} />
      </Button>
    </div>
  );
}

const card = "flex flex-col gap-4 rounded-card border border-default bg-page p-5 md:p-6";

export function DeliveryStep({ v }: { v: CheckoutView }) {
  const [siteId, setSiteId] = useState(v.choices.deliverySiteId ?? "");
  const site = v.sites.find((s) => s.id === siteId);
  const contactKey = (c: { name: string; mobile: string }) => `${c.name}|${c.mobile}`;
  const [contact, setContact] = useState(
    v.choices.receiverName && v.choices.receiverMobile ? `${v.choices.receiverName}|${v.choices.receiverMobile}` : "",
  );
  const s = useStep();
  const [name, mobile] = contact.split("|");
  return (
    <>
      <section className={card}>
        <h2 className="type-h4">Deliver to</h2>
        {s.problem ? <Alert tone="error" title={s.problem.title} live /> : null}
        {v.sites.length ? (
          <RadioGroup
            value={siteId}
            onValueChange={(id) => {
              setSiteId(id);
              const first = v.sites.find((x) => x.id === id)?.contacts[0];
              setContact(first ? contactKey(first) : "");
            }}
            aria-label="Delivery site"
            className="flex flex-col gap-3"
          >
            {v.sites.map((x) => (
              <div
                key={x.id}
                className={cx(
                  "rounded-card border p-4",
                  x.id === siteId ? "border-2 border-selected bg-mint" : "border-default",
                )}
              >
                <Radio value={x.id} label={x.name} />
                <p className="pl-7.5 type-body-sm text-secondary">
                  {[x.address, x.gstin ? `Bills to GSTIN ${x.gstin}` : null, x.hours].filter(Boolean).join(" · ")}
                </p>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <p className="type-body-sm text-body">Add a delivery site to continue.</p>
        )}
        {site ? (
          <FormField
            label="Receiving contact"
            required
            helper="Gets the 6-digit delivery code by SMS and confirms what arrived. No H2 Economy account needed."
            error={s.problem?.fields.receiverMobile}
          >
            <Select
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
              }}
            >
              <option value="">Choose who receives it</option>
              {site.contacts.map((c) => (
                <option key={contactKey(c)} value={contactKey(c)}>
                  {[c.name, c.role, `+91 ${c.mobile}`].filter(Boolean).join(" · ")}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
        <Link href="/buyer/company?section=sites" className="self-start type-label text-link hover:underline">
          Add a delivery site
        </Link>
      </section>
      <Actions
        back="/cart"
        backLabel="Back to cart"
        next="Continue to billing"
        pending={s.pending || !siteId || !contact}
        onNext={() => {
          s.go(
            () =>
              saveStepAction({
                deliverySiteId: siteId,
                receiverName: name ?? null,
                receiverMobile: mobile ?? null,
                billingGstinId: site?.gstin ? (v.gstins.find((g) => g.gstin === site.gstin)?.id ?? null) : undefined,
              }),
            () => "/checkout?step=billing",
          );
        }}
      />
    </>
  );
}

export function BillingStep({ v, organisationId }: { v: CheckoutView; organisationId: string }) {
  // The company's GSTIN (A189), when it is verified: the only one an order can be billed to.
  const gstinId = v.choices.billingGstinId ?? (v.gstins[0]?.active ? v.gstins[0].id : "");
  const [po, setPo] = useState(v.choices.poNumber ?? "");
  const uploads = useUploads("order_document", { organisationId, max: 1 });
  const file = uploads.items[0];
  const s = useStep();
  return (
    <>
      <section className={card}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="type-h4">Bill to</h2>
          <span className="type-caption text-secondary">From your GST registration</span>
        </div>
        {s.problem ? <Alert tone="error" title={s.problem.title} live /> : null}
        <p className="type-body text-body">
          {v.company.legalName}
          {v.company.address ? (
            <>
              <br />
              {v.company.address}
            </>
          ) : null}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="GSTIN on this invoice"
            required
            helper="Your company's GSTIN. To change it, contact H2 Economy."
            error={s.problem?.fields.billingGstinId}
          >
            {/* One GSTIN per company (founder QC, 17 Nov 2026, A189): the company's, shown, not chosen. */}
            <p className="flex min-h-11.5 items-center rounded-control bg-subtle px-4 type-body text-primary">
              {v.gstins[0]
                ? `${v.gstins[0].gstin} · ${v.gstins[0].state}${v.gstins[0].active ? "" : " (not verified yet: orders wait until it is)"}`
                : "Add your company GSTIN in Company settings first"}
            </p>
          </FormField>
          <FormField label="Purchase order number" helper="Optional. Printed on the GST invoice.">
            <Input
              value={po}
              onChange={(e) => {
                setPo(e.target.value);
              }}
            />
          </FormField>
        </div>
        <FileUpload
          multiple={false}
          label="Attach your purchase order (PDF)"
          hint={`Optional · PDF up to 10 MB · shared with ${v.cart.supplier?.name ?? "the supplier"} with the order`}
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
      </section>
      <Actions
        back="/checkout?step=delivery"
        backLabel="Back to delivery"
        next="Continue to payment"
        pending={s.pending || !gstinId || (Boolean(file) && !uploads.ready)}
        onNext={() => {
          s.go(
            () =>
              saveStepAction({
                billingGstinId: gstinId,
                poNumber: po || null,
                poFileId: file?.fileId ?? v.choices.poFileId,
              }),
            () => "/checkout?step=payment",
          );
        }}
      />
    </>
  );
}

const METHODS: { value: PaymentMethod; label: string; detail: string }[] = [
  {
    value: "bank_transfer",
    label: "Bank transfer (NEFT or RTGS)",
    detail:
      "Pay into this order's own account at our payment partner. You get the account details once the supplier confirms.",
  },
  { value: "online", label: "Pay online", detail: "UPI, cards or net banking, on our payment partner's secure page." },
  { value: "pay_later", label: "Pay later", detail: "Credit from our lending partner, subject to approval." },
  { value: "letter_of_credit", label: "Letter of credit", detail: "For large orders, through your bank." },
];

export function PaymentStep({
  v,
  payLater,
  letterOfCredit,
}: {
  v: CheckoutView;
  payLater: boolean;
  letterOfCredit: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod | "">(v.choices.paymentMethod ?? "");
  const s = useStep();
  const shown = METHODS.filter(
    (m) => (m.value !== "pay_later" || payLater) && (m.value !== "letter_of_credit" || letterOfCredit),
  );
  return (
    <>
      <section className={card}>
        <h2 className="type-h4">How you&apos;ll pay</h2>
        {s.problem ? <Alert tone="error" title={s.problem.title} live /> : null}
        <Alert tone="info" title="Nothing is charged now">
          {v.cart.supplier?.name ?? "The supplier"} confirms the order first. Then you pay into escrow, and the money is
          held until you accept the delivery.
        </Alert>
        <RadioGroup
          value={method}
          onValueChange={(m) => {
            setMethod(m as PaymentMethod);
          }}
          aria-label="Payment method"
          className="flex flex-col gap-3"
        >
          {shown.map((m) => (
            <div
              key={m.value}
              className={cx(
                "rounded-card border p-4",
                m.value === method ? "border-2 border-selected bg-mint" : "border-default",
              )}
            >
              <Radio value={m.value} label={m.label} />
              <p className="pl-7.5 type-body-sm text-secondary">{m.detail}</p>
            </div>
          ))}
        </RadioGroup>
      </section>
      <Actions
        back="/checkout?step=billing"
        backLabel="Back to billing"
        next="Review order"
        pending={s.pending || !method}
        onNext={() => {
          if (method)
            s.go(
              () => saveStepAction({ paymentMethod: method }),
              () => "/checkout?step=review",
            );
        }}
      />
    </>
  );
}

export function ReviewStep({ v }: { v: CheckoutView }) {
  const s = useStep();
  const site = v.sites.find((x) => x.id === v.choices.deliverySiteId);
  const gstin = v.gstins.find((g) => g.id === v.choices.billingGstinId);
  const method = METHODS.find((m) => m.value === v.choices.paymentMethod);
  const rows: [string, string, string][] = [
    ["Deliver to", site ? `${site.name} · ${site.address}` : "Not chosen", "delivery"],
    [
      "Receiving contact",
      v.choices.receiverName ? `${v.choices.receiverName} · +91 ${v.choices.receiverMobile ?? ""}` : "Not chosen",
      "delivery",
    ],
    ["Bill to", gstin ? `${v.company.legalName} · GSTIN ${gstin.gstin}` : "Not chosen", "billing"],
    ["Purchase order", v.choices.poNumber ?? "None", "billing"],
    ["Payment", method?.label ?? "Not chosen", "payment"],
  ];
  return (
    <>
      <section className={card}>
        <h2 className="type-h4">Check and place your order</h2>
        {s.problem ? (
          <Alert tone="error" title={s.problem.title} live>
            {Object.values(s.problem.fields).join(" ")}
          </Alert>
        ) : null}
        <dl className="flex flex-col">
          {rows.map(([k, val, step]) => (
            <div key={k} className="flex gap-4 border-t border-default py-3 max-md:flex-col max-md:gap-1">
              <dt className="w-40 shrink-0 type-caption text-secondary">{k}</dt>
              <dd className="flex-1 type-body-sm">{val}</dd>
              <Link href={`/checkout?step=${step}`} className="type-label-sm text-link hover:underline">
                Change<span className="sr-only"> {k.toLowerCase()}</span>
              </Link>
            </div>
          ))}
        </dl>
        <p className="type-body-sm text-body">
          Nothing is charged now. {v.cart.supplier?.name ?? "The supplier"} has 48 hours to confirm; then you pay into
          this order&apos;s escrow account, and the money is held until you accept the delivery.
        </p>
      </section>
      <Actions
        back="/checkout?step=payment"
        backLabel="Back to payment"
        next={v.approval ? "Send for approval" : "Place order"}
        pending={s.pending}
        onNext={() => {
          s.go(placeOrderAction, (r) => `/checkout/placed?order=${r.orderId ?? ""}`);
        }}
      />
    </>
  );
}
