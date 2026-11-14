"use client";

import { ALERT_TYPES, alertChips, deliveryWords, type AlertType } from "@h2india/core/alerts/rules";
import { Button, ConfirmDialog, EmptyState, Icon, IconButton, Switch, type IconName } from "@h2india/ui";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAlertAction, setAlertOnAction, type AlertForm } from "./alert-actions";
import { AlertModal, type ReachYou } from "./AlertModal";

// The member's alerts (534:8; phones 536:414): name, filter chips, how it is sent, last matched and this month's
// matches; a switch to pause, edit (the Create alert modal), delete. "Create alert" opens the modal.

export interface AlertCard {
  id: string;
  label: string;
  type: AlertType;
  query: string;
  filters: Record<string, string[]>;
  channels: string[];
  frequency: string;
  on: boolean;
  /** "Last matched 2 days ago · 5 matches this month" or "Paused by you on 1 Nov 2026" */
  status: string;
}

export function AlertsList({
  alerts,
  reach,
  start: initialForm,
  blank,
}: {
  alerts: AlertCard[];
  reach: ReachYou;
  /** A Create alert link's prefill: the modal opens with it. */
  start: AlertForm | null;
  blank: AlertForm;
}) {
  const router = useRouter();
  const path = usePathname();
  const [form, setForm] = useState<AlertForm>(initialForm ?? blank);
  const [open, setOpen] = useState(Boolean(initialForm));
  const [removing, setRemoving] = useState<AlertCard | null>(null);
  const [opened, setOpened] = useState(0);
  const [, start] = useTransition();
  const close = (v: boolean) => {
    setOpen(v);
    // The prefill came from the address: clear it so a refresh doesn't open the modal again.
    if (!v && initialForm) router.replace(path);
  };
  const edit = (a: AlertCard) => {
    setForm({
      id: a.id,
      label: a.label,
      type: a.type,
      query: a.query,
      filters: a.filters,
      channels: a.channels,
      frequency: a.frequency,
    });
    setOpen(true);
    setOpened((n) => n + 1);
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Alerts</h1>
          <p className="type-body text-secondary">
            We'll tell you when something new matches. {alerts.length} {alerts.length === 1 ? "alert" : "alerts"},{" "}
            {alerts.filter((a) => a.on).length} on.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(blank);
            setOpen(true);
            setOpened((n) => n + 1);
          }}
        >
          <Icon name="plus" size={18} />
          Create alert
        </Button>
      </div>
      {alerts.length ? (
        <ul className="flex flex-col gap-4">
          {alerts.map((a) => (
            <li key={a.id} className="flex gap-4 rounded-card border border-default bg-page p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-subtle text-icon-primary">
                <Icon name={ALERT_TYPES[a.type].icon as IconName} size={20} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h2 className={a.on ? "type-h4 text-primary" : "type-h4 text-secondary"}>{a.label}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {alertChips(a.type, a.filters).map((c) => (
                    <span
                      key={c}
                      className="inline-flex h-8 items-center rounded-pill border-[1.5px] border-control px-3 type-label"
                    >
                      {c}
                    </span>
                  ))}
                  <span className="inline-flex h-6 items-center gap-1.5 rounded-pill bg-subtle px-2.5 type-caption text-body">
                    <span aria-hidden="true">•</span>
                    {deliveryWords(a.frequency, a.channels)}
                  </span>
                </div>
                <p className="type-caption text-secondary">{a.status}</p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <Switch
                  label={<span className="sr-only">{a.on ? `Pause ${a.label}` : `Turn on ${a.label}`}</span>}
                  checked={a.on}
                  onCheckedChange={(v) => {
                    start(() => setAlertOnAction(a.id, v));
                  }}
                />
                <IconButton
                  icon="pencil"
                  look="outline"
                  size="sm"
                  label={`Edit ${a.label}`}
                  onClick={() => {
                    edit(a);
                  }}
                />
                <IconButton
                  icon="trash"
                  look="outline"
                  size="sm"
                  label={`Delete ${a.label}`}
                  onClick={() => {
                    setRemoving(a);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState title="No alerts yet">
            Create an alert for tenders, schemes, grants, jobs, news or events, and we'll tell you when something new
            matches.
          </EmptyState>
        </div>
      )}
      <AlertModal key={opened} open={open} onOpenChange={close} initial={form} reach={reach} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => {
          if (!v) setRemoving(null);
        }}
        title="Delete this alert?"
        description={removing ? `${removing.label} stops, and leaves your list. Your other alerts keep working.` : ""}
        confirmLabel="Delete alert"
        tone="destructive"
        onConfirm={() => {
          if (removing) start(() => deleteAlertAction(removing.id));
          setRemoving(null);
        }}
      />
    </>
  );
}
