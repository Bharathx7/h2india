"use client";

import {
  Alert,
  Button,
  buttonClasses,
  Checkbox,
  cx,
  FileRow,
  FileUpload,
  Icon,
  Input,
  Select,
  StatusBadge,
  Switch,
  Textarea,
  VerifiedBadge,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { deleteDraftAction, saveRfqDraft, sendRfq, specFieldsAction, suppliersAction } from "./actions";
import {
  DELIVERY_TERMS,
  LOCAL_DRAFT_KEY,
  PAYMENT_TERMS,
  stepOneErrors,
  stepThreeErrors,
  UNITS,
  type WizardState,
} from "./wizard-state";

// The RFQ wizard (step 9.3): What you need 398:9323, Choose suppliers 398:9635, Delivery and deadlines 398:10059,
// Review and send 398:10304, Sent 398:10514; states 399:10343. Signed-in buyers' drafts save on the server as they go;
// signed-out visitors' drafts stay in this browser and are attached to their company after sign-in (399:11005).

export interface WizardSetup {
  signedIn: boolean;
  buyer: { name: string; canSend: boolean } | null;
  categories: { id: string; slug: string; label: string }[];
  states: string[];
  sites: { id: string; label: string; state: string; gstinId: string; isDefault: boolean }[];
  gstins: { id: string; label: string; isDefault: boolean }[];
  returned: { on: string; reasons: string[]; note: string | null } | null;
  draftStatus: string | null;
  today: string;
}

type Spec = Awaited<ReturnType<typeof specFieldsAction>>[number];
type Match = Awaited<ReturnType<typeof suppliersAction>>[number];

const STEPS = ["What you need", "Choose suppliers", "Delivery & deadlines", "Review & send"];

const readLocal = (): WizardState | null => {
  try {
    const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WizardState) : null;
  } catch {
    return null;
  }
};
const writeLocal = (s: WizardState | null) => {
  try {
    if (s) window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch {
    /* private mode: the draft lives only in this page */
  }
};
const dateLabel = (d: string) =>
  d
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(`${d}T12:00:00+05:30`),
      )
    : "";

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="type-label">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="flex items-center gap-1 type-caption text-error">
          <Icon name="alert-circle" size={14} />
          {error}
        </span>
      ) : hint ? (
        <span className="type-caption text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}

export function RfqWizard({ setup, start }: { setup: WizardSetup; start: WizardState }) {
  const router = useRouter();
  const [s, setS] = useState<WizardState>(start);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState<"" | "saving" | "saved">("");
  const [resumed, setResumed] = useState(false);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [sent, setSent] = useState<{ id: string; status: string } | null>(null);
  const [pending, start_] = useTransition();
  const uploads = useUploads("quote_attachment", { max: 10 });
  const set = (p: Partial<WizardState>) => {
    setS((x) => ({ ...x, ...p }));
  };

  // A signed-out visitor's draft from this browser: picked up on arrival, and attached after sign-in.
  useEffect(() => {
    const local = readLocal();
    if (!local || start.draftId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a draft from the browser once
    setS({
      ...local,
      siteId: start.siteId || local.siteId,
      gstinId: start.gstinId || local.gstinId,
      draftId: undefined,
    });
    if (setup.buyer) setResumed(true);
  }, [setup.buyer, start.draftId, start.siteId, start.gstinId]);

  // The category's key specifications.
  useEffect(() => {
    let live = true;
    void specFieldsAction(s.categoryId).then((d) => {
      if (live) setSpecs(d);
    });
    return () => {
      live = false;
    };
  }, [s.categoryId]);

  // Matching verified suppliers for step 2.
  useEffect(() => {
    if (step !== 2) return;
    let live = true;
    void suppliersAction(s.categoryId, s.deliveryState).then((m) => {
      if (live) setMatches(m);
    });
    return () => {
      live = false;
    };
  }, [step, s.categoryId, s.deliveryState]);

  // Files finished uploading join the request.
  useEffect(() => {
    const done = uploads.items.filter((i) => i.state === "uploaded" && i.fileId);
    if (!done.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirroring finished uploads into the form
    setS((x) => {
      const have = new Set(x.attachments.map((a) => a.fileId));
      const add = done
        .filter((i) => i.fileId && !have.has(i.fileId))
        .map((i) => ({ fileId: i.fileId ?? "", name: i.name, meta: i.meta }));
      return add.length ? { ...x, attachments: [...x.attachments, ...add] } : x;
    });
  }, [uploads.items]);

  // Drafts save automatically: on the server for a buyer, in this browser otherwise.
  const latest = useRef(s);
  useEffect(() => {
    latest.current = s;
  }, [s]);
  const save = useCallback(async (): Promise<boolean> => {
    const now = latest.current;
    if (!setup.buyer) {
      writeLocal(now);
      setSaved("saved");
      return true;
    }
    if (!now.title.trim() && !now.categoryId) return true;
    setSaved("saving");
    const r = await saveRfqDraft(now);
    if (!r.ok) {
      setProblem(r.error);
      setSaved("");
      return false;
    }
    if (!now.draftId) {
      setS((x) => ({ ...x, draftId: r.id }));
      writeLocal(null);
      router.replace(`/rfq/new?draft=${r.id}`, { scroll: false });
    }
    setSaved("saved");
    return true;
  }, [setup.buyer, router]);
  useEffect(() => {
    const t = setTimeout(() => void save(), 1500);
    return () => {
      clearTimeout(t);
    };
  }, [s, save]);

  const next = () => {
    const e =
      step === 1 ? stepOneErrors(s, specs) : step === 3 ? stepThreeErrors(s, Boolean(setup.buyer), setup.today) : {};
    if (step === 2 && !s.supplierIds.length && !s.suggest)
      e.suppliers = "Choose at least one supplier, or let H2 India suggest them";
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setErrors({});
    setStep(step - 1);
  };
  const send = () => {
    start_(async () => {
      if (!setup.signedIn) {
        writeLocal(s);
        router.push(`/sign-in?next=${encodeURIComponent("/rfq/new")}`);
        return;
      }
      const r = await sendRfq(s);
      if (!r.ok) {
        setProblem(r.error);
        setErrors(r.errors ?? {});
        return;
      }
      writeLocal(null);
      setSent({ id: r.id, status: r.status });
      window.scrollTo({ top: 0 });
    });
  };
  const discard = () => {
    start_(async () => {
      if (s.draftId) await deleteDraftAction(s.draftId);
      writeLocal(null);
      router.push("/rfq/new");
      setS({ ...start, draftId: undefined });
      setStep(1);
    });
  };

  const count = s.supplierIds.length;
  const site = setup.sites.find((x) => x.id === s.siteId);
  const errorList = Object.values(errors);

  if (sent) {
    const moderated = sent.status === "In moderation";
    return (
      <main className="flex justify-center bg-subtle px-4 py-12">
        <section className="flex w-full max-w-130 flex-col items-center gap-4 rounded-card border border-default bg-page p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-pill bg-mint">
            <Icon name="check-circle" size={24} />
          </span>
          <h1 className="type-h2">{moderated ? "Your request is in moderation" : "Your request is on its way"}</h1>
          <p className="type-body text-body">
            {moderated
              ? `H2 India checks every request within 1 working day. We'll email you when it goes to the ${String(count)} suppliers you chose.`
              : "The supplier can quote now. We'll email you when a quote arrives."}
          </p>
          <ol className="flex flex-col items-start gap-2 type-body-sm">
            {moderated ? <li>1 · In moderation · today</li> : null}
            <li>
              {moderated ? "2" : "1"} · Sent to {count} {count === 1 ? "supplier" : "suppliers"}
            </li>
            <li>
              {moderated ? "3" : "2"} · Quotes due · {dateLabel(s.offerDeadline)}
            </li>
          </ol>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/marketplace" className={buttonClasses({ variant: "outline" })}>
              Back to marketplace
            </Link>
            <Link href={`/buyer/rfqs/${sent.id}`} className={buttonClasses({})}>
              View request
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-310 flex-col gap-6 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="type-h1">Request a quote</h1>
        {setup.returned ? <StatusBadge status="Needs changes" tone="warning" /> : null}
        <p className="type-body text-body">
          One request, up to 5 verified suppliers. H2 India checks every request within 1 working day.
        </p>
      </div>
      {setup.returned ? (
        <Alert tone="warning" title={`H2 India returned this request on ${setup.returned.on}`}>
          {[setup.returned.reasons.join(". "), setup.returned.note].filter(Boolean).join(" · Moderator's note: ")}{" "}
          Requests are reviewed again when you resubmit.
        </Alert>
      ) : null}
      {resumed ? (
        <Alert tone="success" title="Welcome back, your request is ready to send">
          We kept your draft while you signed in and attached it to {setup.buyer?.name}.
        </Alert>
      ) : null}
      {setup.signedIn && !setup.buyer ? (
        <Alert tone="info" title="Request quotes from a buyer account">
          Your account isn&apos;t part of a buyer company yet.{" "}
          <Link href="/join" className="underline">
            Add your company
          </Link>{" "}
          to send requests.
        </Alert>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[180px_minmax(0,1fr)_300px]">
        {/* Scrolls sideways on phones, so it takes focus and has a name (axe scrollable-region-focusable). */}
        <div tabIndex={0} role="region" aria-label="Steps" className="overflow-x-auto lg:overflow-visible">
          <ol className="flex gap-3 lg:flex-col">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < step;
              return (
                <li
                  key={label}
                  className="flex items-center gap-2 whitespace-nowrap"
                  aria-current={n === step ? "step" : undefined}
                >
                  <span
                    className={cx(
                      "flex size-6 items-center justify-center rounded-pill type-caption",
                      done
                        ? "bg-accent"
                        : n === step
                          ? "bg-inverse text-inverse"
                          : "border border-control text-secondary",
                    )}
                  >
                    {done ? <Icon name="check" size={14} /> : n}
                  </span>
                  <span className={cx("type-body-sm", n === step ? "type-label" : "text-body")}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <section className="flex flex-col gap-5 rounded-card border border-default bg-page p-5 md:p-6">
          <h2 className="type-h3">
            {step} · {STEPS[step - 1]?.replace("&", "and").replace(" and send", " & send")}
          </h2>
          {problem ? <Alert tone="error" title={problem} live /> : null}
          {errorList.length ? (
            <Alert
              tone="error"
              title={`Fix ${String(errorList.length)} ${errorList.length === 1 ? "field" : "fields"} to continue`}
              live
            >
              {errorList.join(". ")}.
            </Alert>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="Category" required error={errors.categoryId}>
                <Select
                  value={s.categoryId}
                  invalid={Boolean(errors.categoryId)}
                  onChange={(e) => {
                    set({
                      categoryId: e.target.value,
                      categoryLabel: setup.categories.find((c) => c.id === e.target.value)?.label ?? "",
                      specs: {},
                    });
                  }}
                >
                  <option value="">Choose a category</option>
                  {setup.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Title" required error={errors.title}>
                <Input
                  value={s.title}
                  maxLength={160}
                  invalid={Boolean(errors.title)}
                  onChange={(e) => {
                    set({ title: e.target.value });
                  }}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Quantity" required error={errors.quantity}>
                  <Input
                    inputMode="numeric"
                    placeholder="e.g. 2"
                    value={s.quantity}
                    invalid={Boolean(errors.quantity)}
                    onChange={(e) => {
                      set({ quantity: e.target.value });
                    }}
                  />
                </Field>
                <Field label="Unit">
                  <Select
                    value={s.unit}
                    onChange={(e) => {
                      set({ unit: e.target.value });
                    }}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {specs.length ? (
                <>
                  <p className="type-eyebrow text-secondary">Key specifications · from the category schema</p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {specs.map((d) => (
                      <Field
                        key={d.key}
                        label={d.unit ? `${d.label} (${d.unit})` : d.label}
                        error={errors[`spec.${d.key}`]}
                        hint={
                          d.min !== null && d.max !== null
                            ? `${d.min.toLocaleString("en-IN")}–${d.max.toLocaleString("en-IN")}${d.unit ? ` ${d.unit}` : ""}`
                            : undefined
                        }
                      >
                        {d.type === "choice" ? (
                          <Select
                            value={s.specs[d.key] ?? ""}
                            onChange={(e) => {
                              set({ specs: { ...s.specs, [d.key]: e.target.value } });
                            }}
                          >
                            <option value="">Any</option>
                            {d.options.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            value={s.specs[d.key] ?? ""}
                            invalid={Boolean(errors[`spec.${d.key}`])}
                            inputMode={d.type === "number" ? "decimal" : undefined}
                            onChange={(e) => {
                              set({ specs: { ...s.specs, [d.key]: e.target.value } });
                            }}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                </>
              ) : null}
              <Field label="Requirements" error={errors.requirements}>
                <Textarea
                  rows={4}
                  maxLength={1000}
                  value={s.requirements}
                  onChange={(e) => {
                    set({ requirements: e.target.value });
                  }}
                />
                <span className="self-end type-caption text-secondary">{s.requirements.length} / 1,000</span>
              </Field>
              <div className="flex flex-col gap-2">
                <p className="type-label">Attachments (drawings, specs)</p>
                {setup.buyer ? (
                  <>
                    <FileUpload
                      multiple
                      label="Drop files here or browse"
                      hint={uploadHint("quote_attachment")}
                      check={(file) => checkFile("quote_attachment", file)}
                      onFiles={(files) => {
                        uploads.add(files);
                      }}
                    />
                    {uploads.items
                      .filter((i) => i.state !== "uploaded")
                      .map((i) => (
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
                    {s.attachments.map((a) => (
                      <FileRow
                        key={a.fileId}
                        name={a.name}
                        status="uploaded"
                        progress={100}
                        meta={a.meta}
                        onRemove={() => {
                          set({ attachments: s.attachments.filter((x) => x.fileId !== a.fileId) });
                        }}
                      />
                    ))}
                  </>
                ) : (
                  <p className="type-body-sm text-secondary">Sign in to attach drawings and specs.</p>
                )}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="type-body-sm text-body">
                {matches === null
                  ? "Finding verified suppliers…"
                  : matches.length
                    ? `We matched ${String(matches.length)} verified ${matches.length === 1 ? "supplier" : "suppliers"} to your specs. Pick up to 5, or let H2 India suggest them.`
                    : "No verified supplier lists this category yet. Try a broader category."}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={`${String(count)} of 5 selected`} tone="success" />
                <Switch
                  label="Let H2 India suggest suppliers"
                  checked={s.suggest}
                  onCheckedChange={(on) => {
                    set({ suggest: on });
                  }}
                />
              </div>
              {s.suggest ? (
                <p className="rounded-card bg-mint p-3 type-body-sm">
                  H2 India will add verified suppliers that fit, up to 5 in all, when it checks your request
                  {count
                    ? `. Your ${count === 1 ? "choice stays" : `${String(count)} choices stay`} on the list.`
                    : "."}
                </p>
              ) : null}
              {errors.suppliers ? <p className="type-caption text-error">{errors.suppliers}</p> : null}
              <ul className="flex flex-col gap-3">
                {(matches ?? []).map((m) => {
                  const on = s.supplierIds.includes(m.organisationId);
                  return (
                    <li
                      key={m.organisationId}
                      className={cx("rounded-card border p-4", on ? "border-focus bg-mint" : "border-default")}
                    >
                      <Checkbox
                        checked={on}
                        disabled={!on && count >= 5}
                        onCheckedChange={(v) => {
                          set(
                            v === true
                              ? {
                                  supplierIds: [...s.supplierIds, m.organisationId],
                                  supplierNames: { ...s.supplierNames, [m.organisationId]: m.name },
                                }
                              : { supplierIds: s.supplierIds.filter((x) => x !== m.organisationId) },
                          );
                        }}
                        label={
                          <span className="flex flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="type-label">{m.name}</span>
                              <VerifiedBadge kind="supplier" />
                            </span>
                            {m.place ? <span className="type-caption text-secondary">{m.place}</span> : null}
                            <span className="flex flex-wrap gap-2">
                              {m.reasons.map((r) => (
                                <span
                                  key={r}
                                  className="inline-flex items-center gap-1 rounded-pill bg-subtle px-2 py-0.5 type-caption"
                                >
                                  <Icon name="check" size={12} />
                                  {r}
                                </span>
                              ))}
                            </span>
                          </span>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Delivery state" required error={errors.deliveryState}>
                  <Select
                    value={s.deliveryState}
                    invalid={Boolean(errors.deliveryState)}
                    onChange={(e) => {
                      set({ deliveryState: e.target.value });
                    }}
                  >
                    <option value="">Choose</option>
                    {setup.states.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                {setup.buyer ? (
                  <Field label="Delivery site" required error={errors.siteId}>
                    <Select
                      value={s.siteId}
                      invalid={Boolean(errors.siteId)}
                      onChange={(e) => {
                        const x = setup.sites.find((y) => y.id === e.target.value);
                        set({
                          siteId: e.target.value,
                          deliveryState: x?.state || s.deliveryState,
                          gstinId: x?.gstinId || s.gstinId,
                        });
                      }}
                    >
                      <option value="">Choose</option>
                      {setup.sites.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </Select>
                    {!setup.sites.length ? (
                      <Link href="/buyer/company?section=sites" className="type-caption underline">
                        Add a delivery site
                      </Link>
                    ) : null}
                  </Field>
                ) : (
                  <Field label="Delivery site" hint="Choose after sign-in from your company's sites.">
                    <Input disabled value="" placeholder="Choose after sign-in" />
                  </Field>
                )}
                <Field label="Required on site by" required error={errors.requiredBy}>
                  <Input
                    type="date"
                    min={setup.today}
                    value={s.requiredBy}
                    invalid={Boolean(errors.requiredBy)}
                    onChange={(e) => {
                      set({ requiredBy: e.target.value });
                    }}
                  />
                </Field>
                <Field
                  label="Offer deadline"
                  required
                  error={errors.offerDeadline}
                  hint="Suppliers must quote by this date"
                >
                  <Input
                    type="date"
                    min={setup.today}
                    value={s.offerDeadline}
                    invalid={Boolean(errors.offerDeadline)}
                    onChange={(e) => {
                      set({ offerDeadline: e.target.value });
                    }}
                  />
                </Field>
                <Field label="Delivery terms preference">
                  <Select
                    value={s.deliveryTerms}
                    onChange={(e) => {
                      set({ deliveryTerms: e.target.value });
                    }}
                  >
                    <option value="">No preference</option>
                    {DELIVERY_TERMS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Payment terms preference">
                  <Select
                    value={s.paymentTerms}
                    onChange={(e) => {
                      set({ paymentTerms: e.target.value });
                    }}
                  >
                    <option value="">No preference</option>
                    {PAYMENT_TERMS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              {setup.buyer ? (
                <Field label="Billing GSTIN" required error={errors.gstinId}>
                  <Select
                    value={s.gstinId}
                    invalid={Boolean(errors.gstinId)}
                    onChange={(e) => {
                      set({ gstinId: e.target.value });
                    }}
                  >
                    <option value="">Choose</option>
                    {setup.gstins.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              {[
                {
                  title: "What you need",
                  to: 1,
                  rows: [
                    ["Category", s.categoryLabel],
                    ["Request", `${s.quantity} × ${s.title}`],
                    [
                      "Key specs",
                      specs
                        .filter((d) => s.specs[d.key])
                        .map((d) => `${d.label} ${s.specs[d.key] ?? ""}${d.unit ? ` ${d.unit}` : ""}`)
                        .join(" · "),
                    ],
                    ["Attachments", s.attachments.map((a) => a.name).join(", ")],
                  ],
                },
                {
                  title: "Suppliers",
                  to: 2,
                  rows: [
                    [`Selected (${String(count)})`, s.supplierIds.map((id) => s.supplierNames[id] ?? "").join(" · ")],
                    ...(s.suggest
                      ? [["Suggested by H2 India", "Added when your request is checked"] as [string, string]]
                      : []),
                  ],
                },
                {
                  title: "Delivery and deadlines",
                  to: 3,
                  rows: [
                    ["Site", site?.label ?? (setup.buyer ? "" : `Choose after sign-in · ${s.deliveryState}`)],
                    ["Required by", dateLabel(s.requiredBy)],
                    ["Offers due", dateLabel(s.offerDeadline)],
                    ["Terms", [s.deliveryTerms, s.paymentTerms].filter(Boolean).join(" · ")],
                    [
                      "Billing GSTIN",
                      setup.gstins.find((g) => g.id === s.gstinId)?.label ??
                        (setup.buyer ? "" : "Choose after sign-in"),
                    ],
                  ],
                },
              ].map((b) => (
                <section key={b.title} className="flex flex-col gap-2 rounded-card border border-default p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="type-h4">{b.title}</h3>
                    <button
                      type="button"
                      className="type-label text-link"
                      onClick={() => {
                        setStep(b.to);
                      }}
                    >
                      Edit<span className="sr-only"> {b.title}</span>
                    </button>
                  </div>
                  <dl className="grid grid-cols-1 gap-2 md:grid-cols-[150px_minmax(0,1fr)]">
                    {b.rows
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="type-body-sm text-secondary">{k}</dt>
                          <dd className="type-body-sm">{v}</dd>
                        </div>
                      ))}
                  </dl>
                </section>
              ))}
              <Checkbox
                checked={s.consent}
                onCheckedChange={(v) => {
                  set({ consent: v === true });
                }}
                label="Your contact details are shared only with suppliers who quote."
              />
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-default pt-4">
            {step > 1 ? (
              <Button variant="ghost" onClick={back}>
                Back
              </Button>
            ) : s.draftId ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={discard}>
                Delete draft
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button variant="outline" disabled={pending} onClick={() => void save()}>
              Save draft
            </Button>
            {step < 4 ? (
              <Button onClick={next}>{setup.returned && step === 1 ? "Continue to review" : "Continue"}</Button>
            ) : (
              <Button disabled={pending || !s.consent || (setup.buyer !== null && !setup.buyer.canSend)} onClick={send}>
                {setup.signedIn
                  ? `Send RFQ to ${String(count)} ${count === 1 ? "supplier" : "suppliers"}`
                  : "Sign in to send"}
              </Button>
            )}
          </div>
          {!setup.signedIn && step === 4 ? (
            <p className="type-caption text-secondary">
              New to H2 India?{" "}
              <Link
                href="/join"
                className="underline"
                onClick={() => {
                  writeLocal(s);
                }}
              >
                Join free
              </Link>
              . Your request waits in this browser until you&apos;re signed in.
            </p>
          ) : null}
        </section>

        <aside className="flex flex-col gap-3 self-start rounded-card bg-subtle p-5">
          <p className="type-eyebrow text-secondary">Your request</p>
          {[
            ["Category", s.categoryLabel || "Not chosen yet"],
            ["Request", s.title ? `${s.quantity || "?"} × ${s.title}` : "Not written yet"],
            [
              "Suppliers",
              count
                ? `${String(count)} of 5 selected${s.suggest ? " · H2 India suggests more" : ""}`
                : s.suggest
                  ? "H2 India suggests them"
                  : "Not chosen yet",
            ],
            [
              "Delivery",
              s.deliveryState
                ? `${s.deliveryState}${s.requiredBy ? ` · by ${dateLabel(s.requiredBy)}` : ""}`
                : "Not set yet",
            ],
            ["Offers due", s.offerDeadline ? dateLabel(s.offerDeadline) : "Not set yet"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="type-caption text-secondary">{k}</p>
              <p className="type-label">{v}</p>
            </div>
          ))}
          {saved ? (
            <p className="flex items-center gap-1 type-caption text-secondary" aria-live="polite">
              <Icon name={saved === "saved" ? "check" : "loader"} size={14} />
              {saved === "saved" ? (setup.buyer ? "Draft saved · just now" : "Draft kept in this browser") : "Saving…"}
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
