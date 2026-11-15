"use client";

import { directoryConsentWording } from "@h2india/core/consent/wording";
import { graduationYears, HEADLINE_MAX, PERSONAS, TOPICS, type ProfileFields } from "@h2india/core/members/rules";
import { Alert, Button, Icon, IconButton, Input, Radio, RadioGroup, Select, Switch } from "@h2india/ui";
import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { checkFile, useUploads } from "@/lib/uploads";
import { saveProfileAction } from "./account-actions";

// Profile (545:8 researcher; 546:8 student, professional or expert, enthusiast; phones 546:198), step 7.4.

export interface ProfileStart {
  name: string;
  initials: string;
  persona: string | null;
  interests: string[];
  listed: boolean;
  fields: ProfileFields;
  photoUrl: string | null;
}

const PERSONA_LABEL: Record<string, string> = {
  enthusiast: "Enthusiast",
  student: "Student",
  researcher: "Researcher",
  professional: "Professional or expert",
};

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5 md:p-6">
      <div>
        <h2 className="type-h3 text-primary">{title}</h2>
        {sub ? <p className="type-body-sm text-secondary">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

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
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="type-label text-primary">
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </span>
      {children}
      {error ? (
        <span className="type-caption text-error">{error}</span>
      ) : hint ? (
        <span className="type-caption text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}

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
            className="flex size-6 items-center justify-center rounded-pill"
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

function AddWord({ label, onAdd }: { label: string; onAdd: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        aria-label={label}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        placeholder={label}
        className="max-w-72"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          if (value.trim()) onAdd(value.trim());
          setValue("");
        }}
      >
        <Icon name="plus" size={16} />
        {label}
      </Button>
    </div>
  );
}

export function ProfileForm({ start, savedOn }: { start: ProfileStart; savedOn: string | null }) {
  const [name, setName] = useState(start.name);
  const [persona, setPersona] = useState(start.persona ?? "enthusiast");
  const [interests, setInterests] = useState(start.interests);
  const [listed, setListed] = useState(start.listed);
  const [f, setF] = useState<ProfileFields>(start.fields);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pending, startSave] = useTransition();
  const photo = useUploads("profile_photo", { max: 1 });
  const fileInput = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<ProfileFields>) => {
    setF({ ...f, ...patch });
  };
  const uploaded = photo.items.find((i) => i.state === "uploaded");
  const photoProblem = photo.items.find((i) => i.state === "error")?.problem;
  const showPhoto = !photoRemoved && !photo.items.length ? start.photoUrl : null;

  const save = () => {
    startSave(async () => {
      const r = await saveProfileAction({
        name,
        persona,
        interests,
        listed,
        fields: f,
        photo: uploaded?.fileId ? { fileId: uploaded.fileId } : photoRemoved ? null : undefined,
      });
      setSaved(r.ok);
      setProblems(r.ok ? {} : r.problems);
    });
  };

  const remaining = TOPICS.filter((t) => !interests.includes(t.value));
  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="type-h2">Profile</h1>
          <p className="type-body-sm text-secondary">
            How you appear to other members.{savedOn ? ` Last saved ${savedOn}.` : ""}
          </p>
        </div>
        {problems._ ? <Alert tone="error" title={problems._} live /> : null}
        {saved ? <Alert tone="success" title="Profile saved" live /> : null}
        <Card title="Profile type" sub="This decides which extra fields you see. You picked it when you joined.">
          <RadioGroup
            value={persona}
            onValueChange={setPersona}
            className="flex-row flex-wrap gap-6"
            aria-label="Profile type"
          >
            {PERSONAS.map((p) => (
              <Radio key={p.value} value={p.value} label={PERSONA_LABEL[p.value] ?? p.label} />
            ))}
          </RadioGroup>
        </Card>

        <Card title="About you">
          <div className="flex items-center gap-4">
            <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-mint type-h3 text-primary">
              {showPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element -- a 5-minute private storage link
                <img src={showPhoto} alt="" className="size-full object-cover" />
              ) : (
                start.initials
              )}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  aria-label="Upload photo"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const problem = checkFile("profile_photo", file);
                    if (problem) setProblems({ ...problems, photo: problem });
                    else {
                      setPhotoRemoved(false);
                      photo.add([file]);
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                  <Icon name="upload" size={16} />
                  Upload photo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoRemoved(true);
                    for (const i of photo.items) photo.remove(i.localId);
                  }}
                >
                  Remove
                </Button>
              </div>
              <span
                className={problems.photo || photoProblem ? "type-caption text-error" : "type-caption text-secondary"}
              >
                {problems.photo ??
                  photoProblem ??
                  (photo.items[0]
                    ? `${photo.items[0].name} · ${photo.items[0].state === "uploaded" ? "ready to save" : "uploading"}`
                    : "JPG or PNG, square, up to 2 MB.")}
              </span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" required error={problems.name}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                autoComplete="name"
              />
            </Field>
            <Field label="Location">
              <Input
                value={f.location ?? ""}
                onChange={(e) => {
                  set({ location: e.target.value });
                }}
              />
            </Field>
          </div>
          <Field label="Headline" error={problems.headline} hint="Up to 80 characters. Shows under your name.">
            <Input
              value={f.headline ?? ""}
              maxLength={HEADLINE_MAX}
              onChange={(e) => {
                set({ headline: e.target.value });
              }}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="type-label">Interests</span>
            <Chips
              values={interests.map((v) => TOPICS.find((t) => t.value === v)?.label ?? v)}
              onRemove={(label) => {
                setInterests(interests.filter((v) => (TOPICS.find((t) => t.value === v)?.label ?? v) !== label));
              }}
            />
            {remaining.length ? (
              <Select
                aria-label="Add interest"
                value=""
                className="max-w-72"
                onChange={(e) => {
                  if (e.target.value) setInterests([...interests, e.target.value]);
                }}
              >
                <option value="">+ Add interest</option>
                {remaining.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </Card>

        {persona === "researcher" ? (
          <Card title="Research" sub="Shown because your profile type is Researcher.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Affiliation" required error={problems.affiliation}>
                <Input
                  value={f.affiliation ?? ""}
                  onChange={(e) => {
                    set({ affiliation: e.target.value });
                  }}
                />
              </Field>
              <Field label="Lab or group">
                <Input
                  value={f.lab ?? ""}
                  onChange={(e) => {
                    set({ lab: e.target.value });
                  }}
                />
              </Field>
            </div>
            <div className="flex flex-col gap-2">
              <span className="type-label">Expertise</span>
              <Chips
                values={f.expertise ?? []}
                onRemove={(v) => {
                  set({ expertise: (f.expertise ?? []).filter((x) => x !== v) });
                }}
              />
              <AddWord
                label="Add expertise"
                onAdd={(v) => {
                  set({ expertise: [...new Set([...(f.expertise ?? []), v])] });
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="type-label">Publications and links</span>
              {problems.links ? <span className="type-caption text-error">{problems.links}</span> : null}
              <ul className="flex flex-col gap-2">
                {(f.links ?? []).map((l) => (
                  <li key={l.url} className="flex items-center gap-3 rounded-control border border-default p-3">
                    <span className="min-w-0 flex-1">
                      <span className="block type-label text-primary">{l.title || l.url}</span>
                      <span className="block truncate type-caption text-secondary">
                        {l.url.replace(/^https?:\/\//, "")}
                      </span>
                    </span>
                    <IconButton
                      icon="trash"
                      look="outline"
                      size="sm"
                      label={`Remove ${l.title || l.url}`}
                      onClick={() => {
                        set({ links: (f.links ?? []).filter((x) => x.url !== l.url) });
                      }}
                    />
                  </li>
                ))}
              </ul>
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <Input
                  aria-label="Link title"
                  placeholder="Title"
                  value={linkTitle}
                  onChange={(e) => {
                    setLinkTitle(e.target.value);
                  }}
                />
                <Input
                  aria-label="Link address"
                  placeholder="https://"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!linkUrl.trim()) return;
                    set({ links: [...(f.links ?? []), { title: linkTitle.trim(), url: linkUrl.trim() }] });
                    setLinkTitle("");
                    setLinkUrl("");
                  }}
                >
                  <Icon name="plus" size={16} />
                  Add a link
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Switch
                label="Open to collaboration"
                checked={Boolean(f.openToCollaboration)}
                onCheckedChange={(v) => {
                  set({ openToCollaboration: v });
                }}
              />
              <span className="type-caption text-secondary">
                Adds an "Open to collaboration" label to your profile so companies and other researchers know they can
                reach out.
              </span>
            </div>
          </Card>
        ) : null}

        {persona === "student" ? (
          <Card title="Student" sub="Shown when profile type is Student.">
            <Field label="Institution" required error={problems.institution}>
              <Input
                value={f.institution ?? ""}
                onChange={(e) => {
                  set({ institution: e.target.value });
                }}
              />
            </Field>
            <Field label="Programme">
              <Input
                value={f.programme ?? ""}
                onChange={(e) => {
                  set({ programme: e.target.value });
                }}
              />
            </Field>
            <Field label="Graduation year">
              <Select
                value={f.graduationYear ? String(f.graduationYear) : ""}
                onChange={(e) => {
                  set({ graduationYear: e.target.value ? Number(e.target.value) : undefined });
                }}
              >
                <option value="">Choose</option>
                {graduationYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-col gap-1">
              <Switch
                label="Looking for internships"
                checked={Boolean(f.internships)}
                onCheckedChange={(v) => {
                  set({ internships: v });
                }}
              />
              <span className="type-caption text-secondary">
                Adds a "Looking for internships" label to your profile.
              </span>
            </div>
          </Card>
        ) : null}

        {persona === "professional" ? (
          <Card title="Professional or expert" sub="Shown when profile type is Professional or expert.">
            <Field label="Organisation" required error={problems.organisation}>
              <Input
                value={f.organisation ?? ""}
                onChange={(e) => {
                  set({ organisation: e.target.value });
                }}
              />
            </Field>
            <Field label="Role">
              <Input
                value={f.role ?? ""}
                onChange={(e) => {
                  set({ role: e.target.value });
                }}
              />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="type-label">Expertise</span>
              <Chips
                values={f.expertise ?? []}
                onRemove={(v) => {
                  set({ expertise: (f.expertise ?? []).filter((x) => x !== v) });
                }}
              />
              <AddWord
                label="Add expertise"
                onAdd={(v) => {
                  set({ expertise: [...new Set([...(f.expertise ?? []), v])] });
                }}
              />
            </div>
            <Switch
              label="Available for speaking"
              checked={Boolean(f.speaking)}
              onCheckedChange={(v) => {
                set({ speaking: v });
              }}
            />
            <Switch
              label="Available for consulting"
              checked={Boolean(f.consulting)}
              onCheckedChange={(v) => {
                set({ consulting: v });
              }}
            />
          </Card>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <Link href="/member" className="type-label text-primary">
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={pending || photo.items.some((i) => i.state === "uploading" || i.state === "checking")}
          >
            Save changes
          </Button>
        </div>
      </div>

      <aside className="flex flex-col gap-3 self-start rounded-card border border-default bg-page p-5">
        <h2 className="type-h4">Who can see this</h2>
        <Switch label="Public profile" checked={listed} onCheckedChange={setListed} />
        {/* The recorded consent words (step 12.2): what is shown is what is kept. */}
        <p className="type-body-sm text-body">{directoryConsentWording(persona)}</p>
        <p className="type-body-sm text-body">
          Private: only you can see this page. You can still follow, save and get alerts.
        </p>
      </aside>
    </form>
  );
}
