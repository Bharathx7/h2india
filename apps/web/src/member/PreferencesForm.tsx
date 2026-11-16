"use client";

import type { MemberPreferences } from "@h2india/core/members";
import { Alert, Button, Checkbox, ConfirmDialog, Select, Switch } from "@h2india/ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { savePreferencesAction, unsubscribeAllAction } from "./account-actions";

// Newsletters and notifications (548:8; phones 549:15), step 7.4. What notify() checks before every send.

type Channel = "email" | "whatsapp" | "in_app";
const CHANNELS: { key: Channel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "in_app", label: "In-app" },
];

export interface PreferenceRow {
  topic: string;
  label: string;
  hint: string;
  /** Channels that can't be turned off (account email). */
  locked: Channel[];
}

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 ? "30" : "00";
  const value = `${String(h).padStart(2, "0")}:${m}`;
  return { value, label: `${String(h % 12 || 12)}:${m} ${h < 12 ? "AM" : "PM"}` };
});

export function PreferencesForm({
  start,
  rows,
  whatsappReady,
}: {
  start: MemberPreferences;
  rows: PreferenceRow[];
  /** A confirmed mobile number is on the account. */
  whatsappReady: boolean;
}) {
  const [newsletter, setNewsletter] = useState(start.newsletter);
  const [choices, setChoices] = useState(start.choices);
  const [quiet, setQuiet] = useState(start.quiet);
  const [saved, setSaved] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [pending, run] = useTransition();
  const toggle = (topic: string, channel: Channel, on: boolean) => {
    const current = choices[topic] ?? { email: false, whatsapp: false, in_app: false };
    setChoices({ ...choices, [topic]: { ...current, [channel]: on } });
  };
  const save = () => {
    run(async () => {
      await savePreferencesAction({
        newsletter,
        choices: rows.flatMap((r) =>
          CHANNELS.map((c) => ({
            topic: r.topic as never,
            channel: c.key,
            enabled: Boolean(choices[r.topic]?.[c.key]),
          })),
        ),
        quiet: { quietHours: quiet.quietHours, quietFrom: quiet.quietFrom, quietTo: quiet.quietTo },
      });
      setSaved(true);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {start.quiet.unsubscribedAll ? (
        <Alert tone="info" title="You've unsubscribed from everything">
          We only send sign-in and security emails.{" "}
          <button
            type="button"
            className="type-label text-link underline"
            onClick={() => {
              run(() => unsubscribeAllAction(false));
            }}
          >
            Turn messages back on
          </button>
        </Alert>
      ) : null}
      {saved ? <Alert tone="success" title="Changes saved" live /> : null}

      <section className="flex flex-col rounded-card border border-default bg-page p-5 md:p-6">
        <h2 className="type-h3 pb-4">Newsletters</h2>
        <div className="flex flex-wrap items-center gap-4 border-t border-default py-4">
          <div className="min-w-0 flex-1">
            <h3 className="type-label text-primary">
              India H<sub>2</sub> Weekly
            </h3>
            <p className="type-caption text-secondary">The week's hydrogen news, tenders and schemes in one email.</p>
          </div>
          <Select
            aria-label="How often for H2 Economy Weekly"
            className="w-48"
            value="weekly"
            onChange={() => undefined}
          >
            <option value="weekly">Weekly · Monday</option>
          </Select>
          <Switch
            label={<span className="sr-only">H2 Economy Weekly</span>}
            checked={newsletter.weekly}
            onCheckedChange={(v) => {
              setNewsletter({ weekly: v, tenderDigest: v && newsletter.tenderDigest });
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-default pt-4">
          <div className="min-w-0 flex-1">
            <h3 className="type-label text-primary">Tender Alert digest</h3>
            <p className="type-caption text-secondary">New tenders that match your alerts, in one email.</p>
          </div>
          <Select
            aria-label="How often for Tender Alert digest"
            className="w-48"
            value="daily"
            onChange={() => undefined}
          >
            <option value="daily">Daily · 8:00 AM</option>
          </Select>
          <Switch
            label={<span className="sr-only">Tender Alert digest</span>}
            checked={newsletter.tenderDigest}
            disabled={!newsletter.weekly}
            onCheckedChange={(v) => {
              setNewsletter({ ...newsletter, tenderDigest: v });
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5 md:p-6">
        <div>
          <h2 className="type-h3">Notifications</h2>
          <p className="type-body-sm text-secondary">Pick where each kind of notification reaches you.</p>
        </div>
        <div tabIndex={0} role="region" aria-label="Notification choices" className="relative overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-default">
                <th scope="col" className="py-3 text-left type-eyebrow text-secondary">
                  Notification
                </th>
                {CHANNELS.map((c) => (
                  <th key={c.key} scope="col" className="w-24 py-3 type-eyebrow text-secondary">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.topic} className="border-b border-default last:border-0">
                  <th scope="row" className="py-4 pr-4 text-left font-normal">
                    <span className="block type-label text-primary">{r.label}</span>
                    <span className="block type-caption text-secondary">{r.hint}</span>
                  </th>
                  {CHANNELS.map((c) => (
                    <td key={c.key} className="text-center">
                      <Checkbox
                        label={<span className="sr-only">{`${r.label} by ${c.label}`}</span>}
                        checked={r.locked.includes(c.key) || Boolean(choices[r.topic]?.[c.key])}
                        disabled={r.locked.includes(c.key) || (c.key === "whatsapp" && !whatsappReady)}
                        onCheckedChange={(v) => {
                          toggle(r.topic, c.key, v === true);
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5 md:p-6">
        <h2 className="type-h3">Quiet hours</h2>
        <Switch
          label="Pause WhatsApp and in-app notifications at night"
          checked={quiet.quietHours}
          onCheckedChange={(v) => {
            setQuiet({ ...quiet, quietHours: v });
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <span className="type-body">From</span>
          <Select
            aria-label="Quiet from"
            className="w-36"
            value={quiet.quietFrom}
            onChange={(e) => {
              setQuiet({ ...quiet, quietFrom: e.target.value });
            }}
          >
            {TIMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <span className="type-body">to</span>
          <Select
            aria-label="Quiet to"
            className="w-36"
            value={quiet.quietTo}
            onChange={(e) => {
              setQuiet({ ...quiet, quietTo: e.target.value });
            }}
          >
            {TIMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <span className="type-body text-secondary">IST</span>
        </div>
        <p className="type-caption text-secondary">
          Notifications wait until the morning. Emails and sign-in codes are not affected.
        </p>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link href="/member" className="type-label text-primary">
          Cancel
        </Link>
        <Button onClick={save} disabled={pending}>
          Save changes
        </Button>
      </div>

      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5 md:p-6">
        <h2 className="type-h3">Your data</h2>
        <p className="type-body-sm text-body">
          Download a copy of your profile, follows, saved items, alerts, event registrations and these choices.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/member/export" className="type-label text-link underline">
            Download my data (JSON)
          </a>
          <a href="/api/member/export?format=csv" className="type-label text-link underline">
            Download my data (CSV)
          </a>
        </div>
      </section>

      {start.quiet.unsubscribedAll ? null : (
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5 md:p-6">
          <h2 className="type-h3">Unsubscribe from everything</h2>
          <p className="type-body-sm text-body">
            Stops all newsletters, alert emails and WhatsApp messages. You'll still get sign-in and security emails.
          </p>
          <div>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmAll(true);
              }}
            >
              Unsubscribe from all
            </Button>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        tone="destructive"
        title="Unsubscribe from everything?"
        description="Newsletters, alert emails and WhatsApp messages stop. You'll still get sign-in and security emails."
        confirmLabel="Unsubscribe from all"
        onConfirm={() => {
          setConfirmAll(false);
          run(() => unsubscribeAllAction(true));
        }}
      />
    </div>
  );
}
