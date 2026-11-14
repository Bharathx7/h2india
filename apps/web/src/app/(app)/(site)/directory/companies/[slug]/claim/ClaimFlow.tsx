"use client";

import { Alert, Button, FileRow, FileUpload, FormField, Input, OtpInput } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { confirmClaimCodeAction, sendClaimCodeAction, submitGstinClaimAction } from "./actions";

// Choose a method (493:8; phones 495:8), company email code (493:387), GSTIN and authorisation letter (493:784).

export function ClaimFlow({
  slug,
  domain,
  startedClaim,
}: {
  slug: string;
  domain: string | null;
  /** A claim whose code was sent and not yet entered. */
  startedClaim: { id: string; email: string } | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "email" | "code" | "gstin">(startedClaim ? "code" : "choose");
  const [method, setMethod] = useState<"email" | "gstin">(domain ? "email" : "gstin");
  const [email, setEmail] = useState(startedClaim?.email ?? "");
  const [claimId, setClaimId] = useState(startedClaim?.id ?? "");
  const [code, setCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const uploads = useUploads("claim_letter", { max: 1 });
  const letter = uploads.items.find((i) => i.state === "uploaded");

  const act = (
    work: () => Promise<{ ok: boolean; claimId?: string; errors?: Record<string, string> }>,
    next?: () => void,
  ) => {
    setErrors({});
    start(async () => {
      const r = await work();
      if (!r.ok) {
        setErrors(r.errors ?? {});
        return;
      }
      if (r.claimId) setClaimId(r.claimId);
      if (next) next();
      else router.refresh();
    });
  };

  const top = errors._ ? (
    <Alert tone="error" title="That didn't work">
      {errors._}
    </Alert>
  ) : null;

  if (step === "choose") {
    return (
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3 rounded-card border border-default p-5">
          <legend className="sr-only">How do you want to verify?</legend>
          <h2 className="type-h4 text-primary">How do you want to verify?</h2>
          <p className="type-body-sm text-secondary">Pick one. You can switch later.</p>
          {[
            {
              value: "email" as const,
              title: "Verify with your company email",
              text: domain
                ? `We send a 6-digit code to your email on ${domain}. Our team then confirms the claim.`
                : "This profile has no website to check an email against.",
              disabled: !domain,
            },
            {
              value: "gstin" as const,
              title: "Verify with GSTIN and an authorisation letter",
              text: "For teams without an email on the company's domain. Upload a letter signed by a director. We review it within 2 working days.",
              disabled: false,
            },
          ].map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer gap-3 rounded-card border-[1.5px] p-4 ${method === o.value ? "border-accent bg-mint" : "border-default"} ${o.disabled ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="method"
                value={o.value}
                checked={method === o.value}
                disabled={o.disabled}
                onChange={() => {
                  setMethod(o.value);
                }}
                className="mt-1 size-4 accent-ink-900"
              />
              <span className="flex flex-col gap-1">
                <span className="type-label text-primary">{o.title}</span>
                <span className="type-body-sm text-body">{o.text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div>
          <Button
            onClick={() => {
              setStep(method);
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  if (step === "email") {
    return (
      <form
        className="flex max-w-120 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          act(
            () => sendClaimCodeAction(slug, email),
            () => {
              setStep("code");
            },
          );
        }}
      >
        {top}
        <FormField label={`Your email on ${domain ?? "the company's domain"}`} required error={errors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            placeholder={`you@${domain ?? "company.in"}`}
            autoComplete="email"
          />
        </FormField>
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            Send code
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep("choose");
            }}
          >
            Back
          </Button>
        </div>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form
        className="flex max-w-120 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => confirmClaimCodeAction(slug, claimId, code));
        }}
      >
        {top}
        <p className="type-body text-body">We sent a 6-digit code to {email}. It works for 10 minutes.</p>
        <FormField label="Code" error={errors.code}>
          <OtpInput value={code} onChange={setCode} />
        </FormField>
        <div className="flex gap-3">
          <Button type="submit" disabled={pending || code.length < 6}>
            Verify
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              act(
                () => sendClaimCodeAction(slug, email),
                () => undefined,
              );
            }}
          >
            Send a new code
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="flex max-w-150 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        act(() => submitGstinClaimAction(slug, gstin, letter?.fileId ?? ""));
      }}
    >
      {top}
      <FormField label="Company GSTIN" required error={errors.gstin}>
        <Input
          value={gstin}
          onChange={(e) => {
            setGstin(e.target.value.toUpperCase());
          }}
          placeholder="27AABCH1234M1Z5"
          maxLength={15}
        />
      </FormField>
      <div className="flex flex-col gap-2">
        <p className="type-label text-primary">Authorisation letter</p>
        <FileUpload
          accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
          label="Drop the signed letter here or browse"
          hint={uploadHint("claim_letter")}
          check={(file) => checkFile("claim_letter", file)}
          error={errors.letter}
          onFiles={(files) => {
            uploads.add(files);
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
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          Send for review
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setStep("choose");
          }}
        >
          Back
        </Button>
      </div>
    </form>
  );
}
