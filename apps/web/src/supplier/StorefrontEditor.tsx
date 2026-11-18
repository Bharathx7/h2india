"use client";

import {
  STOREFRONT_STEPS,
  storefrontProblems,
  storefrontStepsDone,
  type StorefrontField,
  type StorefrontStep,
} from "@h2india/core/supplier/storefront-rules";
import type { StorefrontForm } from "@h2india/core/supplier";
import {
  Alert,
  Button,
  buttonClasses,
  cx,
  FileRow,
  FileUpload,
  FormField,
  Icon,
  Input,
  Select,
  Textarea,
  useToast,
  VerifiedBadge,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { saveStorefrontAction, withdrawStorefrontAction } from "./storefront-actions";

// Storefront editor (590:8; phones 594:8), step 8.7, rebuilt in founder QC (17 Nov 2026) as one clean flow: four steps
// with real done ticks, Back and Next, one save bar (Save draft · Send for review), and a full preview of the public
// profile (482:8) with the logo. Nothing changes for buyers until H2 Economy approves. No new Figma frame; built from
// the design system.

const INDUSTRIES = ["Refuelling", "Fertiliser", "Steel", "Refining", "Mobility", "Power", "Research"];
const LOCATION_KINDS = [
  "Head office",
  "Manufacturing",
  "Warehouse",
  "Sales office",
  "Research and development",
  "Service centre",
];

type Status = {
  live: boolean;
  draft: boolean;
  changes: number;
  inReview: boolean;
  note: string | null;
  lastPublished: string | null;
  profileHref: string | null;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function Chips({ values, onRemove, disabled }: { values: string[]; onRemove: (v: string) => void; disabled: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {values.map((v) => (
        <li
          key={v}
          className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-inverse pr-1.5 pl-3 type-label text-inverse"
        >
          {v}
          {disabled ? null : (
            <button
              type="button"
              aria-label={`Remove ${v}`}
              className="flex size-6 cursor-pointer items-center justify-center"
              onClick={() => {
                onRemove(v);
              }}
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function StorefrontEditor({
  start,
  organisationId,
  company,
  place,
  verified,
  canEdit,
  status,
}: {
  start: StorefrontForm;
  organisationId: string;
  company: string;
  place: string;
  verified: boolean;
  /** storefront.manage: roles without it see the storefront and the preview, read-only. */
  canEdit: boolean;
  status: Status;
}) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<StorefrontForm>(start);
  const [step, setStep] = useState<StorefrontStep>("brand");
  const [category, setCategory] = useState("");
  const [problems, setProblems] = useState<Partial<Record<StorefrontField, string>>>({});
  const [error, setError] = useState("");
  const [pending, run] = useTransition();
  const logo = useUploads("logo", { organisationId, max: 1 });
  const uploaded = logo.items.find((i) => i.state === "uploaded")?.fileId;
  const form: StorefrontForm = { ...f, logoFileId: uploaded ?? f.logoFileId };
  const locked = status.inReview || !canEdit;
  const dirty = !same(form, start);
  const done = storefrontStepsDone(form);
  const ready = STOREFRONT_STEPS.filter((s) => done[s.key]).length;
  const index = STOREFRONT_STEPS.findIndex((s) => s.key === step);
  // Something to send: unsaved edits, or a saved draft that differs from the live storefront.
  const canSend = dirty || (status.draft && status.changes > 0);

  const set = (p: Partial<StorefrontForm>) => {
    setF((x) => ({ ...x, ...p }));
    setProblems({});
  };

  // Leaving with unsaved edits asks first (the browser's own prompt).
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  const firstStepWith = (found: Partial<Record<StorefrontField, string>>): StorefrontStep =>
    found.about || found.foundedYear
      ? "brand"
      : found.locations
        ? "locations"
        : found.website || found.contactEmail || found.contactPhone
          ? "contact"
          : step;

  const save = (send: boolean) => {
    const found = storefrontProblems(form);
    if (Object.keys(found).length) {
      setProblems(found);
      setStep(firstStepWith(found));
      setError("Check the highlighted fields.");
      return;
    }
    run(async () => {
      const r = await saveStorefrontAction(form, send);
      if (!r.ok) {
        setProblems(r.problems ?? {});
        if (r.problems) setStep(firstStepWith(r.problems));
        setError(r.error);
        return;
      }
      setError("");
      toast({
        tone: "success",
        title: send ? "Sent to H2 Economy for review" : "Draft saved. Nothing changes for buyers yet.",
      });
      router.refresh();
    });
  };

  const withdraw = () => {
    run(async () => {
      const r = await withdrawStorefrontAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast({ tone: "success", title: "Taken back. You can edit again." });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-h2">Storefront</h1>
          <p className="type-body-sm text-secondary">
            What buyers see on {company}&apos;s profile. Changes go live after H2 Economy checks them.
          </p>
          <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            {status.live ? (
              <span className="rounded-pill bg-mint px-2 py-0.5 type-label-sm text-primary">Live</span>
            ) : (
              <span className="rounded-pill bg-subtle px-2 py-0.5 type-label-sm">Not live yet</span>
            )}
            {status.inReview ? (
              <span className="rounded-pill bg-subtle px-2 py-0.5 type-label-sm">In review</span>
            ) : null}
            {status.note ? (
              <span className="rounded-pill bg-warning px-2 py-0.5 type-label-sm text-primary">Needs changes</span>
            ) : null}
            {status.draft && status.changes ? (
              <span className="rounded-pill bg-warning px-2 py-0.5 type-label-sm text-primary">
                Draft · {status.changes} {status.changes === 1 ? "change" : "changes"} not sent
              </span>
            ) : null}
            {status.lastPublished ? <span>Last approved {status.lastPublished}</span> : null}
          </p>
        </div>
        {status.profileHref ? (
          <Link href={status.profileHref} className={buttonClasses({ variant: "outline" })} target="_blank">
            <Icon name="external-link" size={16} />
            View live profile
          </Link>
        ) : null}
      </div>

      {!canEdit ? (
        <Alert tone="info" title="You can view the storefront">
          Only a company admin or the catalogue team can change it.
        </Alert>
      ) : null}
      {status.note ? (
        <Alert tone="warning" title="H2 Economy asked for changes">
          {status.note}
        </Alert>
      ) : null}
      {status.inReview && canEdit ? (
        <Alert tone="info" title="With H2 Economy for review">
          We&apos;ll tell you when it&apos;s approved. Need to change something first? Take it back to edit.
        </Alert>
      ) : null}
      {error ? <Alert tone="error" title={error} live /> : null}

      <ol aria-label="Storefront steps" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {STOREFRONT_STEPS.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              aria-current={step === s.key ? "step" : undefined}
              onClick={() => {
                setStep(s.key);
              }}
              className={cx(
                "flex w-full cursor-pointer items-center gap-3 rounded-card border p-3 text-left transition-colors duration-(--motion-duration-fast) ease-standard",
                step === s.key ? "border-inverse bg-page" : "border-default bg-page hover:border-hover",
              )}
            >
              <span
                className={cx(
                  "flex size-7 shrink-0 items-center justify-center rounded-pill type-label",
                  done[s.key] ? "bg-accent text-primary" : step === s.key ? "bg-inverse text-inverse" : "bg-subtle",
                )}
              >
                {done[s.key] ? <Icon name="check" size={16} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate type-label text-primary">{s.label}</span>
                <span className="block type-caption text-secondary">{done[s.key] ? "Ready" : "To fill in"}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="-mt-3 type-caption text-secondary">
        {ready} of {STOREFRONT_STEPS.length} sections ready for buyers
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section
          aria-labelledby="step-title"
          className="flex min-w-0 flex-col gap-5 rounded-card border border-default bg-page p-5"
        >
          <h2 id="step-title" className="type-h3">
            {STOREFRONT_STEPS[index]?.label}
          </h2>

          {step === "brand" ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="type-label">Logo</span>
                {f.logoFileId && !logo.items.length ? (
                  <div className="flex items-center gap-3">
                    <LogoImage fileId={f.logoFileId} company={company} size="lg" />
                    <span className="type-caption text-secondary">
                      Your current logo. Upload a new one to replace it.
                    </span>
                  </div>
                ) : null}
                {locked ? null : (
                  <FileUpload
                    multiple={false}
                    label="Drop your logo here or browse"
                    hint={`${uploadHint("logo")}. Square logos work best.`}
                    check={(x) => checkFile("logo", x)}
                    onFiles={(files) => logo.add(files)}
                  />
                )}
                {logo.items.map((i) => (
                  <FileRow
                    key={i.localId}
                    name={i.name}
                    status={i.state}
                    progress={i.progress}
                    meta={i.meta}
                    error={i.problem}
                    onRemove={() => {
                      logo.remove(i.localId);
                    }}
                  />
                ))}
              </div>
              <FormField
                label={`About ${company}`}
                helper={`${String((f.about ?? "").length)} / 1000`}
                error={problems.about}
              >
                <Textarea
                  rows={5}
                  value={f.about ?? ""}
                  maxLength={1000}
                  disabled={locked}
                  placeholder="What you make, who for, and what makes you a good supplier."
                  onChange={(e) => {
                    set({ about: e.target.value });
                  }}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="City">
                  <Input
                    value={f.city ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ city: e.target.value });
                    }}
                  />
                </FormField>
                <FormField label="Founded" helper="Year" error={problems.foundedYear}>
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={f.foundedYear ? String(f.foundedYear) : ""}
                    disabled={locked}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      set({ foundedYear: digits ? Number(digits) : null });
                    }}
                  />
                </FormField>
              </div>
            </>
          ) : null}

          {step === "capabilities" ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="flex flex-wrap items-center gap-2 type-label">
                  What you make
                  <span className="rounded-pill bg-warning px-2 py-0.5 type-label-sm">Checked by H2 Economy</span>
                </span>
                <Chips
                  values={f.categories ?? []}
                  disabled={locked}
                  onRemove={(v) => {
                    set({ categories: (f.categories ?? []).filter((x) => x !== v) });
                  }}
                />
                {locked ? null : (
                  <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (category.trim())
                        set({ categories: [...new Set([...(f.categories ?? []), category.trim()])].slice(0, 20) });
                      setCategory("");
                    }}
                  >
                    <Input
                      aria-label="Add what you make"
                      placeholder="For example PEM electrolysers"
                      value={category}
                      maxLength={60}
                      onChange={(e) => {
                        setCategory(e.target.value);
                      }}
                      boxClassName="max-w-80"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      <Icon name="plus" size={16} />
                      Add
                    </Button>
                  </form>
                )}
                <span className="type-caption text-secondary">
                  For marketplace categories your products are listed in, use{" "}
                  <Link href="/supplier/products/categories" className="text-link underline">
                    Request a category
                  </Link>
                  .
                </span>
              </div>
              <FormField label="Manufacturing capabilities" helper={`${String((f.capabilities ?? "").length)} / 600`}>
                <Textarea
                  rows={4}
                  value={f.capabilities ?? ""}
                  maxLength={600}
                  disabled={locked}
                  onChange={(e) => {
                    set({ capabilities: e.target.value });
                  }}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Yearly capacity" helper="Optional">
                  <Input
                    value={f.capacity ?? ""}
                    placeholder="For example 200 MW a year"
                    disabled={locked}
                    onChange={(e) => {
                      set({ capacity: e.target.value });
                    }}
                  />
                </FormField>
                <FormField label="Typical lead time" helper="Optional">
                  <Input
                    value={f.leadTime ?? ""}
                    placeholder="For example 12 to 16 weeks"
                    disabled={locked}
                    onChange={(e) => {
                      set({ leadTime: e.target.value });
                    }}
                  />
                </FormField>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="pb-2 type-label">Industries you serve</legend>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map((x) => {
                    const on = (f.industries ?? []).includes(x);
                    return (
                      <button
                        key={x}
                        type="button"
                        aria-pressed={on}
                        disabled={locked}
                        onClick={() => {
                          set({
                            industries: on ? (f.industries ?? []).filter((y) => y !== x) : [...(f.industries ?? []), x],
                          });
                        }}
                        className={cx(
                          "inline-flex h-9 cursor-pointer items-center rounded-pill border-[1.5px] px-3 type-label disabled:cursor-default",
                          on ? "border-transparent bg-inverse text-inverse" : "border-control bg-page",
                        )}
                      >
                        {x}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          ) : null}

          {step === "locations" ? (
            <>
              <p className="type-body-sm text-secondary">
                Plants, offices and warehouses buyers can expect to deal with. Each needs a city.
              </p>
              {problems.locations ? <Alert tone="error" title={problems.locations} /> : null}
              {(f.locations ?? []).length ? (
                <ul className="flex flex-col gap-3">
                  {(f.locations ?? []).map((l, i) => {
                    const change = (p: Partial<typeof l>) => {
                      set({ locations: (f.locations ?? []).map((x, j) => (j === i ? { ...x, ...p } : x)) });
                    };
                    return (
                      <li key={String(i)} className="flex flex-col gap-3 rounded-card border border-default p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <FormField label="Name">
                            <Input
                              placeholder="Ambattur plant"
                              value={l.name}
                              disabled={locked}
                              onChange={(e) => {
                                change({ name: e.target.value });
                              }}
                            />
                          </FormField>
                          <FormField label="What it is">
                            <Select
                              value={l.kind}
                              disabled={locked}
                              onChange={(e) => {
                                change({ kind: e.target.value });
                              }}
                            >
                              {[...new Set([...LOCATION_KINDS, ...(l.kind ? [l.kind] : [])])].map((k) => (
                                <option key={k} value={k}>
                                  {k}
                                </option>
                              ))}
                            </Select>
                          </FormField>
                          <FormField label="City">
                            <Input
                              value={l.city}
                              disabled={locked}
                              onChange={(e) => {
                                change({ city: e.target.value });
                              }}
                            />
                          </FormField>
                          <FormField label="State">
                            <Input
                              value={l.state}
                              disabled={locked}
                              onChange={(e) => {
                                change({ state: e.target.value });
                              }}
                            />
                          </FormField>
                        </div>
                        {locked ? null : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="self-start"
                            onClick={() => {
                              set({ locations: (f.locations ?? []).filter((_, j) => j !== i) });
                            }}
                          >
                            <Icon name="trash" size={16} />
                            Remove location
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-card bg-subtle p-4 type-body-sm text-body">No locations yet.</p>
              )}
              {locked || (f.locations ?? []).length >= 10 ? null : (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    set({
                      locations: [...(f.locations ?? []), { name: "", city: "", state: "", kind: "Manufacturing" }],
                    });
                  }}
                >
                  <Icon name="plus" size={16} />
                  Add location
                </Button>
              )}
            </>
          ) : null}

          {step === "contact" ? (
            <>
              <FormField label="Website" error={problems.website}>
                <Input
                  value={f.website ?? ""}
                  placeholder="greenfieldh2.in"
                  disabled={locked}
                  onChange={(e) => {
                    set({ website: e.target.value });
                  }}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label="Sales email" error={problems.contactEmail}>
                  <Input
                    type="email"
                    value={f.contactEmail ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ contactEmail: e.target.value });
                    }}
                  />
                </FormField>
                <FormField label="Sales phone" error={problems.contactPhone}>
                  <Input
                    type="tel"
                    value={f.contactPhone ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ contactPhone: e.target.value });
                    }}
                  />
                </FormField>
              </div>
              <p className="type-caption text-secondary">Your email and phone show only to signed-in buyers.</p>
            </>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-default pt-4">
            <Button
              variant="ghost"
              disabled={index === 0}
              onClick={() => {
                const prev = STOREFRONT_STEPS[index - 1];
                if (prev) setStep(prev.key);
              }}
            >
              <Icon name="arrow-left" size={16} />
              Back
            </Button>
            {index < STOREFRONT_STEPS.length - 1 ? (
              <Button
                variant="outline"
                onClick={() => {
                  const next = STOREFRONT_STEPS[index + 1];
                  if (next) setStep(next.key);
                }}
              >
                Next: {STOREFRONT_STEPS[index + 1]?.label}
                <Icon name="arrow-right" size={16} />
              </Button>
            ) : (
              <span className="type-caption text-secondary">Last step. Check the preview, then send it.</span>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-2 self-start xl:sticky xl:top-24">
          <p className="type-label-sm text-secondary">Preview · how buyers see you</p>
          <Preview f={form} company={company} place={place} verified={verified} start={start} />
        </aside>
      </div>

      {canEdit ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-default bg-page md:left-18 lg:left-60">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
            <span className="type-body-sm text-secondary">
              {status.inReview
                ? "With H2 Economy for review."
                : dirty
                  ? "You have changes that aren't saved."
                  : status.draft && status.changes
                    ? "Draft saved. Send it for review to go live."
                    : "Nothing changes for buyers until H2 Economy approves."}
            </span>
            <div className="flex flex-wrap gap-2">
              {status.inReview ? (
                <Button variant="outline" disabled={pending} onClick={withdraw}>
                  Take back to edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={pending || !dirty}
                    onClick={() => {
                      save(false);
                    }}
                  >
                    Save draft
                  </Button>
                  <Button
                    disabled={pending || !canSend}
                    onClick={() => {
                      save(true);
                    }}
                  >
                    Send for review
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** The company's logo through the file link (5-minute signed address); initials until one is uploaded. */
function LogoImage({ fileId, company, size }: { fileId?: string; company: string; size: "lg" | "md" }) {
  const box = size === "lg" ? "size-16" : "size-14";
  if (!fileId)
    return (
      <span className={cx("flex shrink-0 items-center justify-center rounded-card bg-mint type-h4", box)}>
        {company.slice(0, 2).toUpperCase()}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a private, signed file link; next/image can't fetch it
    <img
      src={`/api/v1/files/${fileId}/link`}
      alt={`${company} logo`}
      className={cx("shrink-0 rounded-card border border-default bg-page object-contain", box)}
    />
  );
}

/** The public profile's header and overview (482:8), from the editor's current values. */
function Preview({
  f,
  company,
  place,
  verified,
  start,
}: {
  f: StorefrontForm;
  company: string;
  place: string;
  verified: boolean;
  start: StorefrontForm;
}) {
  const locations = (f.locations ?? []).filter((l) => l.name.trim());
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-card border border-default bg-page p-5">
      <div className="flex items-center gap-3">
        <LogoImage fileId={f.logoFileId} company={company} size="md" />
        <span className="min-w-0">
          <span className="block truncate type-h4">{company}</span>
          <span className="block type-caption text-secondary">
            {[f.city || place, f.foundedYear ? `Since ${String(f.foundedYear)}` : null].filter(Boolean).join(" · ")}
          </span>
        </span>
      </div>
      {verified ? <VerifiedBadge kind="supplier" /> : null}
      {f.about ? (
        <p className="type-body-sm text-body">{f.about}</p>
      ) : (
        <p className="type-body-sm text-secondary">Add a few lines about the company.</p>
      )}
      {(f.categories ?? []).length ? (
        <div className="flex flex-col gap-1.5">
          <p className="type-label-sm text-secondary">Makes or offers</p>
          <ul className="flex flex-wrap gap-2">
            {(f.categories ?? []).map((c) => (
              <li key={c} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm">
                {c}
                {(start.categories ?? []).includes(c) ? "" : " · new"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {f.capabilities || f.capacity || f.leadTime ? (
        <div className="flex flex-col gap-1">
          <p className="type-label-sm text-secondary">Capabilities</p>
          {f.capabilities ? <p className="type-body-sm text-body">{f.capabilities}</p> : null}
          {f.capacity || f.leadTime ? (
            <p className="type-caption text-secondary">{[f.capacity, f.leadTime].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
      ) : null}
      {(f.industries ?? []).length ? (
        <p className="type-caption text-secondary">Serves {(f.industries ?? []).join(", ")}</p>
      ) : null}
      {locations.length ? (
        <div className="flex flex-col gap-1">
          <p className="type-label-sm text-secondary">Locations</p>
          <ul className="flex flex-col gap-1">
            {locations.map((l, i) => (
              <li key={String(i)} className="flex items-start gap-2 type-body-sm">
                <Icon name="map-pin" size={14} className="mt-1 shrink-0 text-icon-secondary" />
                <span>
                  {l.name} · {[l.city, l.state].filter(Boolean).join(", ")}
                  <span className="block type-caption text-secondary">{l.kind}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {f.website || f.contactEmail || f.contactPhone ? (
        <div className="flex flex-col gap-1 border-t border-default pt-3">
          <p className="type-label-sm text-secondary">Contact</p>
          {f.website ? <p className="type-body-sm text-link">{f.website}</p> : null}
          {f.contactEmail ? <p className="type-body-sm">{f.contactEmail}</p> : null}
          {f.contactPhone ? <p className="type-body-sm">{f.contactPhone}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
