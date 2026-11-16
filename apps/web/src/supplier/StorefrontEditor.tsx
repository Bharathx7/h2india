"use client";

import type { StorefrontForm } from "@h2india/core/supplier";
import { Alert, Button, cx, FileRow, FileUpload, Icon, Input, Textarea, VerifiedBadge } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { saveStorefrontAction } from "./team-actions";

// Storefront editor (590:8; phones 594:8), step 8.7: sections on the left, the form, and a live preview of how buyers
// see the company. Save keeps a draft; Publish changes sends it to H2 Economy for review.

const SECTIONS = [
  { key: "banner", label: "Banner and logo" },
  { key: "about", label: "About" },
  { key: "capabilities", label: "Capabilities" },
  { key: "locations", label: "Locations" },
  { key: "contact", label: "Contact" },
] as const;

const INDUSTRIES = ["Refuelling", "Fertiliser", "Steel", "Refining", "Mobility", "Power", "Research"];

function Chips({ values, onRemove }: { values: string[]; onRemove: (v: string) => void }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {values.map((v) => (
        <li
          key={v}
          className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-inverse pr-1.5 pl-3 type-label text-inverse"
        >
          {v}
          <button
            type="button"
            aria-label={`Remove ${v}`}
            className="flex size-6 items-center justify-center"
            onClick={() => {
              onRemove(v);
            }}
          >
            <Icon name="x" size={14} />
          </button>
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
  status,
}: {
  start: StorefrontForm;
  organisationId: string;
  company: string;
  place: string;
  verified: boolean;
  status: { live: boolean; changes: number; inReview: boolean; note: string | null; lastPublished: string | null };
}) {
  const router = useRouter();
  const [f, setF] = useState<StorefrontForm>(start);
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("capabilities");
  const [category, setCategory] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, run] = useTransition();
  const logo = useUploads("logo", { organisationId, max: 1 });
  const set = (p: Partial<StorefrontForm>) => {
    setF({ ...f, ...p });
  };
  const save = (publish: boolean) => {
    const uploaded = logo.items.find((i) => i.state === "uploaded")?.fileId;
    run(async () => {
      const r = await saveStorefrontAction({ ...f, logoFileId: uploaded ?? f.logoFileId }, publish);
      setMsg(
        r.ok
          ? {
              tone: "success",
              text: publish
                ? "Sent to H2 Economy. Your storefront updates once they approve."
                : "Saved as a draft. Nothing changes for buyers until you publish.",
            }
          : { tone: "error", text: r.error },
      );
      if (r.ok) router.refresh();
    });
  };
  const locked = status.inReview;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Storefront</h1>
          <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            {status.live ? (
              <span className="rounded-pill bg-mint px-2 py-0.5 type-label-sm text-primary">Live</span>
            ) : null}
            {status.changes ? (
              <span className="rounded-pill bg-warning px-2 py-0.5 type-label-sm text-primary">
                {status.changes} unpublished changes
              </span>
            ) : null}
            {status.inReview ? (
              <span className="rounded-pill bg-subtle px-2 py-0.5 type-label-sm">In review</span>
            ) : null}
            {status.lastPublished ? `Last published ${status.lastPublished}` : null}
          </p>
        </div>
        <Button
          disabled={pending || locked}
          onClick={() => {
            save(true);
          }}
        >
          Publish changes
        </Button>
      </div>
      {status.note ? (
        <Alert tone="warning" title="H2 Economy asked for changes">
          {status.note}
        </Alert>
      ) : null}
      {locked ? (
        <Alert tone="info" title="With H2 Economy for review">
          You can edit again once they reply.
        </Alert>
      ) : null}
      {msg ? <Alert tone={msg.tone} title={msg.text} live /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
        <nav
          aria-label="Storefront sections"
          className="flex flex-col gap-1 self-start rounded-card border border-default bg-page p-2"
        >
          {SECTIONS.map((x) => (
            <button
              key={x.key}
              type="button"
              aria-current={section === x.key ? "true" : undefined}
              onClick={() => {
                setSection(x.key);
              }}
              className={cx(
                "flex items-center justify-between rounded-control px-3 py-2 text-left type-body-sm",
                section === x.key ? "bg-mint type-label" : "hover:bg-subtle",
              )}
            >
              {x.label}
              {section === x.key ? <Icon name="check" size={16} /> : null}
            </button>
          ))}
        </nav>
        <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
          {section === "banner" ? (
            <>
              <h2 className="type-h3">Banner and logo</h2>
              <FileUpload
                multiple={false}
                label="Drop your logo here or browse"
                hint={`${uploadHint("logo")}. Square logos work best.`}
                check={(x) => checkFile("logo", x)}
                onFiles={(files) => logo.add(files)}
                disabled={locked}
              />
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
              {f.logoFileId && !logo.items.length ? <p className="type-caption text-secondary">Logo saved.</p> : null}
            </>
          ) : null}
          {section === "about" ? (
            <>
              <h2 className="type-h3">About</h2>
              <label className="flex flex-col gap-1.5">
                <span className="type-label">About {company}</span>
                <Textarea
                  value={f.about ?? ""}
                  maxLength={1000}
                  disabled={locked}
                  onChange={(e) => {
                    set({ about: e.target.value });
                  }}
                />
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="type-label">City</span>
                  <Input
                    value={f.city ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ city: e.target.value });
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="type-label">Founded</span>
                  <Input
                    inputMode="numeric"
                    value={f.foundedYear ? String(f.foundedYear) : ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ foundedYear: e.target.value ? Number(e.target.value) : null });
                    }}
                  />
                </label>
              </div>
            </>
          ) : null}
          {section === "capabilities" ? (
            <>
              <div>
                <h2 className="type-h3">Capabilities</h2>
                <p className="type-body-sm text-secondary">What you make and how much. Buyers filter by these.</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-2 type-label">
                  Product categories{" "}
                  <span className="rounded-pill bg-warning px-2 py-0.5 type-label-sm">Goes to review</span>
                </span>
                <Chips
                  values={f.categories ?? []}
                  onRemove={(v) => {
                    set({ categories: (f.categories ?? []).filter((x) => x !== v) });
                  }}
                />
                {!locked ? (
                  <span className="flex gap-2">
                    <Input
                      aria-label="Add category"
                      placeholder="Add category"
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                      }}
                      className="max-w-72"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (category.trim())
                          set({ categories: [...new Set([...(f.categories ?? []), category.trim()])] });
                        setCategory("");
                      }}
                    >
                      <Icon name="plus" size={16} />
                      Add category
                    </Button>
                  </span>
                ) : null}
                <span className="type-caption text-secondary">
                  New categories are checked by H2 Economy before they show.
                </span>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="type-label">Manufacturing capabilities</span>
                <Textarea
                  value={f.capabilities ?? ""}
                  maxLength={600}
                  disabled={locked}
                  onChange={(e) => {
                    set({ capabilities: e.target.value });
                  }}
                />
                <span className="self-end type-caption text-secondary">{(f.capabilities ?? "").length} / 600</span>
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="type-label">Yearly capacity</span>
                  <Input
                    value={f.capacity ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ capacity: e.target.value });
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="type-label">Typical lead time</span>
                  <Input
                    value={f.leadTime ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ leadTime: e.target.value });
                    }}
                  />
                </label>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="type-label">Industries you serve</legend>
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
                          "inline-flex h-9 items-center rounded-pill border-[1.5px] px-3 type-label",
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
          {section === "locations" ? (
            <>
              <h2 className="type-h3">Locations</h2>
              {(f.locations ?? []).map((l, i) => (
                <div key={String(i)} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <Input
                    aria-label="Name"
                    placeholder="Ambattur plant"
                    value={l.name}
                    disabled={locked}
                    onChange={(e) => {
                      set({
                        locations: (f.locations ?? []).map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      });
                    }}
                  />
                  <Input
                    aria-label="City"
                    placeholder="City"
                    value={l.city}
                    disabled={locked}
                    onChange={(e) => {
                      set({
                        locations: (f.locations ?? []).map((x, j) => (j === i ? { ...x, city: e.target.value } : x)),
                      });
                    }}
                  />
                  <Input
                    aria-label="State"
                    placeholder="State"
                    value={l.state}
                    disabled={locked}
                    onChange={(e) => {
                      set({
                        locations: (f.locations ?? []).map((x, j) => (j === i ? { ...x, state: e.target.value } : x)),
                      });
                    }}
                  />
                  <Input
                    aria-label="Kind"
                    placeholder="Manufacturing"
                    value={l.kind}
                    disabled={locked}
                    onChange={(e) => {
                      set({
                        locations: (f.locations ?? []).map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)),
                      });
                    }}
                  />
                </div>
              ))}
              {!locked ? (
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
              ) : null}
            </>
          ) : null}
          {section === "contact" ? (
            <>
              <h2 className="type-h3">Contact</h2>
              <label className="flex flex-col gap-1.5">
                <span className="type-label">Website</span>
                <Input
                  value={f.website ?? ""}
                  disabled={locked}
                  onChange={(e) => {
                    set({ website: e.target.value });
                  }}
                />
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="type-label">Sales email</span>
                  <Input
                    type="email"
                    value={f.contactEmail ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ contactEmail: e.target.value });
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="type-label">Sales phone</span>
                  <Input
                    value={f.contactPhone ?? ""}
                    disabled={locked}
                    onChange={(e) => {
                      set({ contactPhone: e.target.value });
                    }}
                  />
                </label>
              </div>
              <p className="type-caption text-secondary">Shown only to signed-in buyers.</p>
            </>
          ) : null}
          {!locked ? (
            <div className="flex items-center justify-between gap-3 border-t border-default pt-4">
              <span className="type-caption text-secondary">Nothing changes for buyers until you publish.</span>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  save(false);
                }}
              >
                Save draft
              </Button>
            </div>
          ) : null}
        </section>
        <aside className="flex flex-col gap-2 self-start">
          <p className="type-eyebrow text-secondary">Live preview · how buyers see you</p>
          <div className="flex flex-col gap-3 overflow-hidden rounded-card border border-default bg-page">
            <div className="h-20 bg-mint" />
            <div className="flex flex-col gap-3 px-5 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex size-14 items-center justify-center rounded-pill bg-mint type-h4">
                  {company.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <span className="block type-label">{company}</span>
                  <span className="block type-caption text-secondary">
                    {[f.city ?? place, f.foundedYear ? `since ${String(f.foundedYear)}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </div>
              {verified ? <VerifiedBadge kind="supplier" /> : null}
              {f.about ? <p className="type-body-sm text-body">{f.about.slice(0, 160)}</p> : null}
              <ul className="flex flex-wrap gap-2">
                {(f.categories ?? []).map((c) => (
                  <li key={c} className="rounded-pill border-[1.5px] border-control px-3 py-1 type-label-sm">
                    {c}
                    {!(start.categories ?? []).includes(c) ? " · in review" : ""}
                  </li>
                ))}
              </ul>
              {f.capacity || f.leadTime ? (
                <p className="type-caption text-secondary">{[f.capacity, f.leadTime].filter(Boolean).join(" · ")}</p>
              ) : null}
            </div>
          </div>
          <p className="type-caption text-secondary">
            Items marked &quot;in review&quot; appear for buyers after H2 Economy approves them.
          </p>
        </aside>
      </div>
    </div>
  );
}
