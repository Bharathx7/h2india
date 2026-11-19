"use client";

import { Button, FormField, Icon, IconButton, Input, Select, Textarea } from "@h2india/ui";
import type { LiveForm } from "./articles";

// The live explainer panel of the article editor (801:7492, A61), moved here from the old advanced editor: status,
// summary, pinned key numbers, what it means (when ended) and the updates, newest first. "Publish live update" sends
// this part live through the workflow (cms/workflow.ts, action "live-update", audited); the rest still needs review.

type Update = LiveForm["updates"][number];

const newUpdate = (): Update => ({
  at: new Date().toISOString(),
  title: "",
  text: "",
  document: { title: "", url: "", note: "" },
});

/** ISO time to a datetime-local value in IST, and back. */
const toLocal = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16);
const fromLocal = (v: string) => new Date(`${v}:00+05:30`).toISOString();

function Points({
  label,
  helper,
  items,
  onChange,
}: {
  label: string;
  helper?: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <FormField label={label} helper={helper ?? "One point per line."}>
      <Textarea
        rows={Math.max(3, items.length + 1)}
        value={items.join("\n")}
        onChange={(e) => {
          onChange(e.target.value.split("\n"));
        }}
      />
    </FormField>
  );
}

export function LiveExplainer({
  live,
  onChange,
  canSendLive,
  pending,
  onPublishUpdate,
}: {
  live: LiveForm;
  onChange: (v: LiveForm) => void;
  /** The article is published and the editor may edit: the live part can go out on its own. */
  canSendLive: boolean;
  pending: boolean;
  onPublishUpdate: () => void;
}) {
  const set = <K extends keyof LiveForm>(k: K, v: LiveForm[K]) => {
    onChange({ ...live, [k]: v });
  };
  const setUpdate = (i: number, u: Update | null) => {
    set("updates", u ? live.updates.map((x, j) => (j === i ? u : x)) : live.updates.filter((_, j) => j !== i));
  };
  const on = live.status !== "off";
  // Newest first, as readers see them; the index points back into the stored list.
  const order = live.updates.map((u, i) => ({ u, i })).sort((a, b) => b.u.at.localeCompare(a.u.at));

  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5" aria-label="Live explainer">
      <h2 className="type-h5">Live explainer</h2>
      <FormField
        label="Live status"
        helper="For an event that unfolds through the day (an auction, a results day). Updates show newest first."
      >
        <Select
          value={live.status}
          onChange={(e) => {
            set("status", e.target.value as LiveForm["status"]);
          }}
        >
          <option value="off">Not a live explainer</option>
          <option value="live">Live</option>
          <option value="ended">Ended</option>
        </Select>
      </FormField>

      {on ? (
        <>
          <Points
            label="Summary"
            items={live.summary}
            onChange={(v) => {
              onChange({ ...live, summary: v, summaryAt: new Date().toISOString() });
            }}
          />
          {live.summaryAt ? (
            <p className="-mt-2 type-caption text-secondary">
              Summary updated{" "}
              {new Date(live.summaryAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              IST
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="type-label">Pinned key numbers</span>
            {live.keyNumbers.map((k, i) => (
              <span key={i} className="flex gap-2">
                <Input
                  aria-label={`Pinned figure ${String(i + 1)}`}
                  placeholder="₹49.20"
                  boxClassName="w-28"
                  value={k.value}
                  onChange={(e) => {
                    set(
                      "keyNumbers",
                      live.keyNumbers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                    );
                  }}
                />
                <Input
                  aria-label={`What pinned figure ${String(i + 1)} measures`}
                  placeholder="What it measures"
                  boxClassName="flex-1"
                  value={k.label}
                  onChange={(e) => {
                    set(
                      "keyNumbers",
                      live.keyNumbers.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    );
                  }}
                />
                <IconButton
                  icon="x"
                  label={`Remove pinned figure ${String(i + 1)}`}
                  onClick={() => {
                    set(
                      "keyNumbers",
                      live.keyNumbers.filter((_, j) => j !== i),
                    );
                  }}
                />
              </span>
            ))}
            {live.keyNumbers.length < 3 ? (
              <span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    set("keyNumbers", [...live.keyNumbers, { value: "", label: "" }]);
                  }}
                >
                  <Icon name="plus" size={14} />
                  Add a figure
                </Button>
              </span>
            ) : null}
            <Input
              aria-label="Source of the pinned figures"
              placeholder="Source of the figures"
              value={live.keyNumbersSource}
              onChange={(e) => {
                set("keyNumbersSource", e.target.value);
              }}
            />
          </div>

          {live.status === "ended" ? (
            <Points
              label="What it means"
              items={live.meaning}
              onChange={(v) => {
                set("meaning", v);
              }}
            />
          ) : null}

          <div className="flex flex-col gap-3">
            <span className="flex items-center justify-between gap-2">
              <span className="type-label">Updates</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  set("updates", [...live.updates, newUpdate()]);
                }}
              >
                <Icon name="plus" size={14} />
                New update
              </Button>
            </span>
            {order.length ? (
              <ol className="flex flex-col gap-3">
                {order.map(({ u, i }) => (
                  <li key={i} className="flex flex-col gap-2 rounded-input border border-default p-3">
                    <span className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        aria-label={`Time of update ${String(i + 1)} (IST)`}
                        boxClassName="flex-1"
                        value={toLocal(u.at)}
                        onChange={(e) => {
                          if (e.target.value) setUpdate(i, { ...u, at: fromLocal(e.target.value) });
                        }}
                      />
                      <IconButton
                        icon="trash"
                        label={`Remove update ${String(i + 1)}`}
                        size="sm"
                        onClick={() => {
                          setUpdate(i, null);
                        }}
                      />
                    </span>
                    <Input
                      aria-label={`Update ${String(i + 1)} title`}
                      placeholder="What happened"
                      value={u.title}
                      onChange={(e) => {
                        setUpdate(i, { ...u, title: e.target.value });
                      }}
                    />
                    <Textarea
                      aria-label={`Update ${String(i + 1)} text`}
                      placeholder="More detail (optional)"
                      rows={2}
                      value={u.text}
                      onChange={(e) => {
                        setUpdate(i, { ...u, text: e.target.value });
                      }}
                    />
                    <details className="type-body-sm">
                      <summary className="cursor-pointer type-caption text-secondary">Attach a document link</summary>
                      <span className="mt-2 flex flex-col gap-2">
                        <Input
                          aria-label={`Update ${String(i + 1)} document title`}
                          placeholder="Document title"
                          value={u.document.title}
                          onChange={(e) => {
                            setUpdate(i, { ...u, document: { ...u.document, title: e.target.value } });
                          }}
                        />
                        <Input
                          type="url"
                          aria-label={`Update ${String(i + 1)} document link`}
                          placeholder="https://"
                          value={u.document.url}
                          onChange={(e) => {
                            setUpdate(i, { ...u, document: { ...u.document, url: e.target.value } });
                          }}
                        />
                        <Input
                          aria-label={`Update ${String(i + 1)} document note`}
                          placeholder="For example PDF · 3 pages · seci.co.in"
                          value={u.document.note}
                          onChange={(e) => {
                            setUpdate(i, { ...u, document: { ...u.document, note: e.target.value } });
                          }}
                        />
                      </span>
                    </details>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="type-caption text-secondary">No updates yet.</p>
            )}
          </div>

          {canSendLive ? (
            <div className="flex flex-col gap-2 border-t border-default pt-4">
              <span>
                <Button disabled={pending} onClick={onPublishUpdate}>
                  <Icon name="upload" size={16} />
                  Publish live update
                </Button>
              </span>
              <p className="type-caption text-secondary">
                Saves and puts the live explainer on the site straight away, without review.
              </p>
            </div>
          ) : (
            <p className="type-caption text-secondary">
              Once the article is published, live updates go out from here with Publish live update.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
