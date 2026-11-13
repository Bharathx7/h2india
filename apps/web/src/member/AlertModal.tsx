"use client";

import {
  ALERT_STATES,
  ALERT_TYPE_IDS,
  ALERT_TYPES,
  countWords,
  defaultAlertLabel,
  FREQUENCIES,
  type AlertType,
} from "@h2india/core/alerts/rules";
import { Alert, Button, Checkbox, cx, Icon, Input, Modal, Radio, RadioGroup } from "@h2india/ui";
import { useEffect, useState, useTransition } from "react";
import { previewAlertAction, saveAlertAction, type AlertForm } from "./alert-actions";

// Create alert modal (534:587): 1 Type, 2 Filters, 3 Channel and frequency with what it matches today. The same modal
// edits an alert (pencil on 534:8). Opening from a page's "Create alert" link pre-fills type and filters.

export interface ReachYou {
  email: string;
  /** "+91 ••••• 32109" when a verified mobile is on the account, else null (WhatsApp can't be chosen). */
  mobile: string | null;
}

const STEPS = ["Type", "Filters", "Channel and frequency"] as const;

export function AlertModal({
  open,
  onOpenChange,
  initial,
  reach,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: AlertForm;
  reach: ReachYou;
}) {
  // The parent gives the modal a new key each time it opens, so state starts from `initial` without an effect.
  const [form, setForm] = useState<AlertForm>(initial);
  const [step, setStep] = useState(initial.id ? 2 : initial.type ? 1 : 0);
  const [preview, setPreview] = useState<{ key: string; value: Awaited<ReturnType<typeof previewAlertAction>> }>();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const type = (ALERT_TYPE_IDS as string[]).includes(form.type) ? (form.type as AlertType) : null;
  const previewKey = JSON.stringify([type, form.query, form.filters]);
  useEffect(() => {
    if (step !== 2 || !type) return;
    let live = true;
    void previewAlertAction(type, form.query, form.filters).then((value) => {
      if (live) setPreview({ key: previewKey, value });
    });
    return () => {
      live = false;
    };
  }, [step, type, form.query, form.filters, previewKey]);
  const shownPreview = preview?.key === previewKey ? preview.value : undefined;

  const stateField = type ? ALERT_TYPES[type].stateField : null;
  const states = stateField ? (form.filters[stateField] ?? []) : [];
  const toggleState = (s: string) => {
    if (!stateField) return;
    const next = states.includes(s) ? states.filter((x) => x !== s) : [...states, s];
    setForm({ ...form, filters: { ...form.filters, [stateField]: next } });
  };
  const toggleChannel = (c: string, on: boolean) => {
    setForm({ ...form, channels: on ? [...new Set([...form.channels, c])] : form.channels.filter((x) => x !== c) });
  };
  const chips = type
    ? [
        ALERT_TYPES[type].label,
        ...form.query.split(/\s+/).filter(Boolean),
        ...(states.length ? states : stateField ? ["All of India"] : []),
      ]
    : [];

  const save = () => {
    if (!type) return;
    start(async () => {
      const r = await saveAlertAction({ ...form, label: form.label.trim() || defaultAlertLabel(type, form.query) });
      if (r.ok) onOpenChange(false);
      else setError(r.error);
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Edit alert" : "Create alert"}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setStep(step - 1);
              }}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button
              disabled={!type}
              onClick={() => {
                setStep(step + 1);
              }}
            >
              Continue
            </Button>
          ) : (
            <Button disabled={pending || !form.channels.length} onClick={save}>
              Save alert
            </Button>
          )}
        </div>
      }
    >
      <ol className="flex flex-wrap items-center gap-4" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span
              className={cx(
                "flex size-7 items-center justify-center rounded-pill type-label",
                i < step
                  ? "bg-accent text-primary"
                  : i === step
                    ? "bg-inverse text-inverse"
                    : "border border-control text-secondary",
              )}
            >
              {i < step ? <Icon name="check" size={16} /> : i + 1}
            </span>
            <span className="type-label text-primary">{label}</span>
          </li>
        ))}
      </ol>

      {error ? <Alert tone="error" title={error} live /> : null}

      {step === 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 type-h4">What should we watch?</legend>
          <RadioGroup
            value={form.type}
            onValueChange={(v) => {
              setForm({ ...form, type: v, filters: {} });
            }}
          >
            {ALERT_TYPE_IDS.filter((t) => t !== "products").map((t) => (
              <Radio key={t} value={t} label={ALERT_TYPES[t].label} />
            ))}
          </RadioGroup>
        </fieldset>
      ) : null}

      {step === 1 && type ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Words to match</span>
            <Input
              value={form.query}
              onChange={(e) => {
                setForm({ ...form, query: e.target.value });
              }}
              placeholder="For example electrolyser EPC"
            />
            <span className="type-caption text-secondary">Every word must appear. Leave empty for everything new.</span>
          </label>
          {stateField ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 type-label">States</legend>
              <div className="flex flex-wrap gap-2">
                {ALERT_STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={states.includes(s)}
                    onClick={() => {
                      toggleState(s);
                    }}
                    className={cx(
                      "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
                      states.includes(s)
                        ? "border-transparent bg-inverse text-inverse"
                        : "border-control bg-page text-primary",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="type-caption text-secondary">None picked means all of India.</span>
            </fieldset>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Name (optional)</span>
            <Input
              value={form.label}
              onChange={(e) => {
                setForm({ ...form, label: e.target.value });
              }}
              placeholder={defaultAlertLabel(type, form.query)}
            />
          </label>
        </div>
      ) : null}

      {step === 2 && type ? (
        <div className="flex flex-col gap-5">
          <p className="flex flex-wrap items-center gap-2">
            <span className="type-caption text-secondary">Alert for</span>
            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex h-8 items-center rounded-pill bg-inverse px-3 type-label text-inverse"
              >
                {c}
              </span>
            ))}
            <button
              type="button"
              className="type-label text-link underline"
              onClick={() => {
                setStep(1);
              }}
            >
              Edit
            </button>
          </p>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 type-h4">Send to</legend>
            <Checkbox
              label={`Email · ${reach.email}`}
              checked={form.channels.includes("email")}
              onCheckedChange={(v) => {
                toggleChannel("email", v === true);
              }}
            />
            <Checkbox
              label={
                reach.mobile
                  ? `WhatsApp · ${reach.mobile}`
                  : "WhatsApp · add and confirm a mobile number in Profile first"
              }
              disabled={!reach.mobile}
              checked={form.channels.includes("whatsapp")}
              onCheckedChange={(v) => {
                toggleChannel("whatsapp", v === true);
              }}
            />
            <Checkbox
              label="In-app notifications"
              checked={form.channels.includes("inapp")}
              onCheckedChange={(v) => {
                toggleChannel("inapp", v === true);
              }}
            />
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 type-h4">How often</legend>
            <RadioGroup
              value={form.frequency}
              onValueChange={(v) => {
                setForm({ ...form, frequency: v });
              }}
              className="flex-row flex-wrap gap-6"
            >
              {FREQUENCIES.map((f) => (
                <Radio key={f.value} value={f.value} label={f.label} />
              ))}
            </RadioGroup>
          </fieldset>
          <section aria-live="polite" className="flex flex-col gap-3 rounded-card bg-subtle p-4">
            {shownPreview === undefined ? (
              <p className="type-body-sm text-secondary">Checking what this matches…</p>
            ) : shownPreview === null ? (
              <p className="type-body-sm text-secondary">We can't show matches right now. The alert still works.</p>
            ) : (
              <>
                <h3 className="type-h4">
                  {countWords(type, shownPreview.total)} {shownPreview.total === 1 ? "matches" : "match"} today
                </h3>
                {shownPreview.hits.map((h) => (
                  <div key={h.id}>
                    <p className="type-label text-primary">{h.title}</p>
                    <p className="type-caption text-secondary">{h.meta}</p>
                  </div>
                ))}
                <p className="type-caption text-secondary">You'll only get new and updated ones from now on.</p>
              </>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
