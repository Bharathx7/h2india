"use client";

import {
  Alert,
  Button,
  buttonClasses,
  Checkbox,
  cx,
  FormField,
  Icon,
  Input,
  Radio,
  RadioGroup,
  StatusBadge,
  Stepper,
  Textarea,
  type StepItem,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmItsYou } from "@/components/ConfirmItsYou";
import { looksLikeEmail, OPERATOR_ACTIONS, OPERATOR_AREAS } from "@h2india/core/authz/rules";
import { AREA_LABEL, EXTRA_LABEL, isSensitive, roleIsSensitive, roleWords } from "./role-words";
import {
  addTeamMemberAction,
  deleteRoleAction,
  removeFromRoleAction,
  saveRoleAction,
  setSectionsAction,
  type TeamResult,
} from "./team-actions";

// Team and roles (founder, 20 Nov 2026): Add a team member in four short steps, the role editor and a person's access.
// Plain words throughout; anything that touches money, people's data or who can do what asks to Confirm it's you.

export interface RoleChoice {
  name: string;
  description: string;
  permissions: string[];
  custom: boolean;
}

export interface SectionChoice {
  id: string;
  label: string;
  description: string;
}

function RoleCard({ role }: { role: RoleChoice }) {
  const words = roleWords(role.permissions);
  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="type-label">{role.name}</span>
        {role.custom ? <StatusBadge status="Custom" tone="neutral" /> : null}
        {roleIsSensitive(role.permissions) ? <StatusBadge status="Sensitive" tone="warning" /> : null}
      </span>
      {role.description ? <span className="type-body-sm text-body">{role.description}</span> : null}
      <span className="type-caption text-secondary">Can: {words.can.join(" · ") || "nothing yet"}</span>
    </span>
  );
}

function SectionsPicker({
  sections,
  value,
  onChange,
}: {
  sections: SectionChoice[];
  value: string[] | null;
  onChange: (v: string[] | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <RadioGroup
        aria-label="Which content can they change?"
        value={value === null ? "all" : "some"}
        onValueChange={(v) => {
          onChange(v === "all" ? null : (value ?? []));
        }}
      >
        <Radio value="all" label="All content sections" />
        <Radio value="some" label="Only the sections I choose (they can still read everything)" />
      </RadioGroup>
      {value !== null ? (
        <ul aria-label="Sections" className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id} className="rounded-card border border-default bg-page p-3">
              <Checkbox
                checked={value.includes(s.id)}
                onCheckedChange={(on) => {
                  onChange(on ? [...value, s.id] : value.filter((x) => x !== s.id));
                }}
                label={
                  <span className="flex flex-col">
                    <span className="type-label">{s.label}</span>
                    <span className="type-caption text-secondary">{s.description}</span>
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const STEPS = ["Who", "Role", "Sections", "Check and add"] as const;

export function AddTeamMember({ roles, sections }: { roles: RoleChoice[]; sections: SectionChoice[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleName, setRoleName] = useState("");
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const role = roles.find((r) => r.name === roleName);
  const usesContent = Boolean(role?.permissions.includes("content.edit")) && roleName !== "Super admin";
  const sensitive = role ? roleIsSensitive(role.permissions) : false;
  const items: StepItem[] = STEPS.map((label, i) => ({
    label,
    status: i < step ? "complete" : i === step ? "current" : "upcoming",
    detail: i === 2 && role && !usesContent ? "Not needed for this role" : undefined,
  }));
  const sectionLabel = (ids: string[] | null) =>
    ids === null ? "All content sections" : ids.map((id) => sections.find((s) => s.id === id)?.label ?? id).join(", ");

  const next = () => {
    setError("");
    if (step === 0) {
      if (name.trim().length < 2) {
        setError("Enter their name.");
        return;
      }
      if (!looksLikeEmail(email)) {
        setError("Enter their work email.");
        return;
      }
    }
    if (step === 1 && !role) {
      setError("Choose a role.");
      return;
    }
    if (step === 2 && chosen !== null && !chosen.length) {
      setError("Tick at least one section, or choose all.");
      return;
    }
    setStep((s) => (s === 1 && !usesContent ? 3 : s + 1));
  };
  const back = () => {
    setError("");
    setStep((s) => (s === 3 && !usesContent ? 1 : s - 1));
  };
  const submit = async (): Promise<TeamResult> => {
    const r = await addTeamMemberAction({
      email,
      name,
      role: roleName,
      sections: usesContent ? chosen : null,
      reason,
    });
    if (r.ok) {
      setDone(true);
      router.refresh();
    } else if (r.confirm) setConfirm(true);
    else setError(r.error);
    return r;
  };

  if (done) {
    return (
      <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-6">
        <Alert tone="success" title={`${name.trim()} is on the team as ${roleName}`} live>
          We emailed {email.trim().toLowerCase()} a link to set their back-office password. They sign in at the staff
          sign-in.
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users/roles" className={buttonClasses({})}>
            Back to the team
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setDone(false);
              setStep(0);
              setName("");
              setEmail("");
              setRoleName("");
              setChosen(null);
              setReason("");
            }}
          >
            Add someone else
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={items} className="rounded-card border border-default bg-page px-5 py-4" />
      <section
        aria-labelledby="add-step"
        className="flex flex-col gap-5 rounded-card border border-default bg-page p-6"
      >
        <h2 id="add-step" className="type-h4">
          {["Who are you adding?", "What will they do?", "Which content can they change?", "Check and add"][step]}
        </h2>
        {error ? <Alert tone="error" title={error} live /> : null}

        {step === 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Name" required>
              <Input
                value={name}
                autoComplete="off"
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </FormField>
            <FormField label="Work email" required helper="They get a link here to set their password.">
              <Input
                type="email"
                value={email}
                autoComplete="off"
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </FormField>
          </div>
        ) : null}

        {step === 1 ? (
          <RadioGroup aria-label="Role" value={roleName} onValueChange={setRoleName}>
            {roles.map((r) => (
              <div
                key={r.name}
                className={cx(
                  "rounded-card border p-4",
                  r.name === roleName ? "border-focus bg-mint" : "border-default bg-page",
                )}
              >
                <Radio value={r.name} label={<RoleCard role={r} />} />
              </div>
            ))}
          </RadioGroup>
        ) : null}

        {step === 2 ? <SectionsPicker sections={sections} value={chosen} onChange={setChosen} /> : null}

        {step === 3 && role ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-3 rounded-card bg-subtle p-4 md:grid-cols-[10rem_1fr]">
              <dt className="type-label text-secondary">Person</dt>
              <dd className="type-body-sm">
                {name.trim()} · {email.trim().toLowerCase()}
              </dd>
              <dt className="type-label text-secondary">Role</dt>
              <dd className="type-body-sm">{role.name}</dd>
              {usesContent ? (
                <>
                  <dt className="type-label text-secondary">Content</dt>
                  <dd className="type-body-sm">{sectionLabel(chosen)}</dd>
                </>
              ) : null}
              <dt className="type-label text-secondary">They can</dt>
              <dd className="type-body-sm">{roleWords(role.permissions).can.join(" · ")}</dd>
            </dl>
            <FormField label="Reason" helper="Kept in the audit log, for example “New tracker editor”.">
              <Input
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                }}
              />
            </FormField>
            {sensitive || confirm ? (
              <Alert tone="warning" title="This role reaches sensitive areas">
                It can move money, see bank or personal data, or change who can do what. Confirm it&apos;s you to add
                them.
              </Alert>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
          {step > 0 ? (
            <Button variant="ghost" onClick={back} disabled={pending}>
              <Icon name="arrow-left" size={16} />
              Back
            </Button>
          ) : (
            <Link href="/admin/users/roles" className={buttonClasses({ variant: "ghost" })}>
              Cancel
            </Link>
          )}
          {step < 3 ? (
            <Button onClick={next}>
              Next
              <Icon name="arrow-right" size={16} />
            </Button>
          ) : sensitive || confirm ? (
            <div className="w-full max-w-sm">
              <ConfirmItsYou actionLabel="Confirm and add to the team" onConfirmed={submit} />
            </div>
          ) : (
            <Button
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await submit();
                });
              }}
            >
              {pending ? "Adding…" : "Add to the team"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = { view: "See", edit: "Change", delete: "Delete", export: "Export" };

export function RoleEditor({
  initial,
  grantable,
  holders,
  lockedBuiltIn,
}: {
  initial: { roleId?: string; name: string; description: string; permissions: string[] };
  grantable: string[];
  holders: number;
  /** A built-in role, shown for reading: copy it to change it. */
  lockedBuiltIn: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [perms, setPerms] = useState<string[]>(initial.permissions);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const allowed = new Set(grantable);
  const on = new Set(perms);
  const added = perms.filter((k) => !initial.permissions.includes(k));
  const needsConfirm = confirm || added.some(isSensitive);
  const words = roleWords(perms);

  const toggle = (key: string, value: boolean) => {
    setPerms((p) => (value ? [...new Set([...p, key])] : p.filter((x) => x !== key)));
  };
  const save = async (): Promise<TeamResult> => {
    setError("");
    const r = await saveRoleAction({ roleId: initial.roleId, name, description, permissions: perms, reason });
    if (r.ok) router.push(`/admin/users/roles?role=${encodeURIComponent(name.trim())}`);
    else if (r.confirm) setConfirm(true);
    else setError(r.error);
    return r;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-6">
        {lockedBuiltIn ? (
          <Alert tone="info" title="Built-in role">
            Built-in roles stay as they are. Copy this role to make your own version.
          </Alert>
        ) : null}
        {error ? <Alert tone="error" title={error} live /> : null}
        <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Role name" required>
              <Input
                value={name}
                disabled={lockedBuiltIn}
                maxLength={60}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </FormField>
            <FormField label="What it's for">
              <Input
                value={description}
                disabled={lockedBuiltIn}
                maxLength={200}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
              />
            </FormField>
          </div>
        </section>
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Permissions by area</h2>
          <p className="flex flex-wrap items-center gap-2 type-caption text-secondary">
            <StatusBadge status="Sensitive" tone="warning" />
            Moves money, shows bank or personal data, or changes who can do what. Adding it asks you to confirm
            it&apos;s you.
          </p>
          <div tabIndex={0} role="region" aria-label="Permissions" className="relative overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="bg-subtle text-left type-caption text-secondary">
                  <th scope="col" className="px-3 py-2">
                    Area
                  </th>
                  {OPERATOR_ACTIONS.map((a) => (
                    <th key={a} scope="col" className="px-3 py-2">
                      {ACTION_LABEL[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OPERATOR_AREAS.map((area) => (
                  <tr key={area} className="border-t border-default">
                    <th scope="row" className="px-3 py-2 text-left type-label">
                      {AREA_LABEL[area] ?? area}
                    </th>
                    {OPERATOR_ACTIONS.map((a) => {
                      const key = `${area}.${a}`;
                      return (
                        <td key={a} className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            <Checkbox
                              checked={on.has(key)}
                              disabled={lockedBuiltIn || !allowed.has(key)}
                              onCheckedChange={(v) => {
                                toggle(key, v === true);
                              }}
                              label={
                                <span className="sr-only">
                                  {AREA_LABEL[area] ?? area} {ACTION_LABEL[a]}
                                </span>
                              }
                            />
                            {isSensitive(key) && allowed.has(key) ? (
                              <Icon name="alert-triangle" size={14} className="text-warning" aria-label="Sensitive" />
                            ) : null}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allowed.has("content.publish") || on.has("content.publish") ? (
            <Checkbox
              checked={on.has("content.publish")}
              disabled={lockedBuiltIn || !allowed.has("content.publish")}
              onCheckedChange={(v) => {
                toggle("content.publish", v === true);
              }}
              label={EXTRA_LABEL["content.publish"]}
            />
          ) : null}
          <p className="type-caption text-secondary">
            Managing the team and deleting content permanently stay with the Super admin. Ticking more than See in an
            area also gives See.
          </p>
        </section>
        {!lockedBuiltIn ? (
          <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
            <FormField label="Reason" helper="Kept in the audit log.">
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                }}
              />
            </FormField>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {initial.roleId ? (
                <Button
                  variant="ghost"
                  disabled={pending || holders > 0}
                  onClick={() => {
                    setError("");
                    start(async () => {
                      const r = await deleteRoleAction(initial.roleId ?? "", reason);
                      if (r.ok) router.push("/admin/users/roles");
                      else setError(r.error);
                    });
                  }}
                >
                  <Icon name="trash" size={16} />
                  {holders > 0 ? `Delete (move ${String(holders)} off it first)` : "Delete role"}
                </Button>
              ) : (
                <span />
              )}
              {needsConfirm ? (
                <div className="w-full max-w-sm">
                  <ConfirmItsYou actionLabel="Confirm and save role" onConfirmed={save} />
                </div>
              ) : (
                <Button
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      await save();
                    });
                  }}
                >
                  {pending ? "Saving…" : initial.roleId ? "Save role" : "Create role"}
                </Button>
              )}
            </div>
          </section>
        ) : null}
      </div>
      <aside className="flex flex-col gap-3 self-start rounded-card border border-default bg-mint p-5 lg:sticky lg:top-4">
        <h2 className="type-h4">In plain words</h2>
        <p className="type-label">They can</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 type-body-sm">
          {words.can.length ? words.can.map((c) => <li key={c}>{c}</li>) : <li>Nothing yet: tick an area.</li>}
        </ul>
        <p className="type-label">They can&apos;t open</p>
        <p className="type-body-sm text-body">{words.cannot.join(", ") || "Every area is open to them."}</p>
      </aside>
    </div>
  );
}

export function PersonAccess({
  userId,
  roles,
  usesContent,
  sections,
  current,
  canManage,
}: {
  userId: string;
  roles: string[];
  usesContent: boolean;
  sections: SectionChoice[];
  current: string[] | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[] | null>(current);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (work: () => Promise<TeamResult>, ok: string) => {
    setMsg(null);
    start(async () => {
      const r = await work();
      setMsg(r.ok ? { tone: "success", text: ok } : { tone: "error", text: r.error });
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-6">
      {msg ? <Alert tone={msg.tone} title={msg.text} live /> : null}
      {usesContent ? (
        <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">Content sections</h2>
          {canManage ? (
            <SectionsPicker sections={sections} value={chosen} onChange={setChosen} />
          ) : (
            <p className="type-body-sm">
              {current === null
                ? "All content sections"
                : current.map((id) => sections.find((s) => s.id === id)?.label ?? id).join(", ")}
            </p>
          )}
        </section>
      ) : null}
      {canManage ? (
        <section className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
          <FormField label="Reason" required helper="Kept in the audit log.">
            <Input
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
              }}
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            {usesContent ? (
              <Button
                disabled={pending || !reason.trim()}
                onClick={() => {
                  run(() => setSectionsAction(userId, chosen, reason), "Sections saved.");
                }}
              >
                Save sections
              </Button>
            ) : null}
            {roles.map((role) => (
              <Button
                key={role}
                variant="outline"
                disabled={pending || !reason.trim()}
                onClick={() => {
                  run(() => removeFromRoleAction(userId, role, reason), `Removed from ${role}.`);
                }}
              >
                Remove from {role}
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
