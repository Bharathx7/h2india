"use client";

import { looksLikeEmail } from "@h2india/core/sign-in";
import {
  Alert,
  Button,
  Checkbox,
  ConfirmDialog,
  Drawer,
  FormField,
  Icon,
  Input,
  Switch,
  cx,
  useToast,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { inviteWithAccessAction, removeMemberAction, setMemberAccessAction } from "@/supplier/team-actions";

// Team access (founder QC, 17 Nov 2026): when a company admin adds or edits a member, they tick what that person may
// do. Presets tick the boxes in one click and can then be changed. Full access (Admin) adds company settings, the
// team and the payout bank account, which no other member can have. Shared by supplier Team and buyer Company.

export interface AccessOption {
  key: string;
  label: string;
}
export interface PresetOption {
  name: string;
  description: string;
  permissions: string[];
}
export interface Access {
  admin: boolean;
  permissions: string[];
}

type Result = { ok: true } | { ok: false; error: string };

/** Which group a permission sits in on the form, by its key. */
const GROUPS: { title: string; match: (key: string) => boolean }[] = [
  { title: "Company", match: (k) => k.startsWith("company.") || k.startsWith("verification.") },
  { title: "Catalogue", match: (k) => k.startsWith("product.") || k.startsWith("storefront.") },
  { title: "RFQs and quotes", match: (k) => k.startsWith("rfq.") || k.startsWith("quote.") },
  { title: "Orders", match: (k) => k.startsWith("order.") || k.startsWith("approval_rules.") },
  { title: "Messages and money", match: (k) => k.startsWith("messages.") || k.startsWith("money.") },
];

export function AccessPicker({
  value,
  onChange,
  options,
  presets,
}: {
  value: Access;
  onChange: (next: Access) => void;
  options: AccessOption[];
  presets: PresetOption[];
}) {
  const id = useId();
  const ticked = new Set(value.permissions);
  const matching = presets.find(
    (p) => !value.admin && p.permissions.length === ticked.size && p.permissions.every((k) => ticked.has(k)),
  );
  const groups = GROUPS.map((g) => ({ ...g, items: options.filter((o) => g.match(o.key)) })).filter(
    (g) => g.items.length,
  );
  const rest = options.filter((o) => !GROUPS.some((g) => g.match(o.key)));
  if (rest.length) groups.push({ title: "Other", match: () => false, items: rest });
  return (
    <div className="flex flex-col gap-4">
      {/* The whole row is the switch's label, so clicking the words toggles it (founder, 19 Nov 2026). */}
      <Switch
        className="w-full cursor-pointer flex-row-reverse justify-between gap-4 rounded-card border border-default p-4"
        checked={value.admin}
        onCheckedChange={(on) => {
          onChange({ admin: on, permissions: value.permissions });
        }}
        aria-describedby={`${id}-admin-help`}
        label={<span className="block type-label">Full access (Admin)</span>}
      />
      <p id={`${id}-admin-help`} className="-mt-3 px-4 type-caption text-secondary">
        Everything below, plus company settings, the team and the payout bank account.
      </p>
      {value.admin ? null : (
        <>
          <div className="flex flex-col gap-2">
            <span className="type-label">Start from</span>
            <span className="type-caption text-secondary">A preset ticks the boxes; change any of them below.</span>
            {/* Each preset's description is on screen, not in a tooltip (founder, 19 Nov 2026). */}
            <ul className="flex flex-col gap-2" role="group" aria-label="Presets">
              {presets.map((p, i) => (
                <li key={p.name} className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-pressed={matching?.name === p.name}
                    aria-describedby={`${id}-preset-${String(i)}`}
                    onClick={() => {
                      onChange({ admin: false, permissions: [...p.permissions] });
                    }}
                    className={cx(
                      "inline-flex h-8 shrink-0 items-center rounded-pill border-[1.5px] px-3 type-label-sm active:scale-[0.97]",
                      matching?.name === p.name
                        ? "border-transparent bg-inverse text-inverse"
                        : "border-control bg-page",
                    )}
                  >
                    {p.name}
                  </button>
                  <span id={`${id}-preset-${String(i)}`} className="pt-1.5 type-caption text-secondary">
                    {p.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <fieldset key={g.title} className="flex flex-col gap-2">
                <legend className="mb-1 type-label-sm text-secondary">{g.title}</legend>
                {g.items.map((o) => (
                  <Checkbox
                    key={o.key}
                    checked={ticked.has(o.key)}
                    onCheckedChange={(on) => {
                      const next = new Set(ticked);
                      if (on === true) next.add(o.key);
                      else next.delete(o.key);
                      onChange({ admin: false, permissions: options.map((x) => x.key).filter((k) => next.has(k)) });
                    }}
                    label={o.label}
                  />
                ))}
              </fieldset>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function useRun() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const go = (work: () => Promise<Result>, done: () => void) => {
    start(async () => {
      const r = await work();
      setError(r.ok ? "" : r.error);
      if (r.ok) {
        done();
        router.refresh();
      }
    });
  };
  return { error, setError, pending, go };
}

/** Add member: an email and the ticked access, sent as an invitation. */
export function AddMember({ options, presets }: { options: AccessOption[]; presets: PresetOption[] }) {
  const r = useRun();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [checked, setChecked] = useState(false);
  const startAccess = (): Access => ({
    admin: false,
    permissions: presets.find((p) => p.name === "Viewer")?.permissions ?? [],
  });
  const [access, setAccess] = useState<Access>(startAccess);
  // A quick check in the browser (founder, 19 Nov 2026); core checks again before it sends.
  const emailProblem = checked && email.trim() && !looksLikeEmail(email) ? "Enter a full email address" : undefined;
  const send = () => {
    setChecked(true);
    if (!looksLikeEmail(email)) return;
    const to = email.trim();
    r.go(
      () => inviteWithAccessAction(to, access),
      () => {
        setOpen(false);
        setEmail("");
        setChecked(false);
        setAccess(startAccess());
        toast({
          tone: "success",
          title: "Invitation sent",
          body: `We emailed ${to}. It shows under Waiting to accept.`,
        });
      },
    );
  };
  return (
    <>
      <Button
        onClick={() => {
          r.setError("");
          setOpen(true);
        }}
      >
        <Icon name="plus" size={18} />
        Add member
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Add a team member"
        description="We email them an invitation. It works for 14 days."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={r.pending || !email.trim() || (!access.admin && !access.permissions.length)}
              onClick={send}
            >
              {r.pending ? "Sending…" : "Send invitation"}
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-5 p-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {/* Drawer keeps its description for screen readers only; here it's on screen too. */}
          <p className="type-body-sm text-secondary">We email them an invitation. It works for 14 days.</p>
          {r.error ? <Alert tone="error" title={r.error} live /> : null}
          <FormField label="Work email" required error={emailProblem}>
            <Input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              onBlur={() => {
                setChecked(true);
              }}
            />
          </FormField>
          <AccessPicker value={access} onChange={setAccess} options={options} presets={presets} />
        </form>
      </Drawer>
    </>
  );
}

/** Edit access for one member, from their row. */
export function EditAccess({
  userId,
  name,
  start,
  options,
  presets,
}: {
  userId: string;
  name: string;
  start: Access;
  options: AccessOption[];
  presets: PresetOption[];
}) {
  const r = useRun();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<Access>(start);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setAccess(start);
          r.setError("");
          setOpen(true);
        }}
      >
        Edit access<span className="sr-only"> for {name}</span>
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={`What ${name} can do`}
        description="Changes apply the next time they open a page."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={r.pending || (!access.admin && !access.permissions.length)}
              onClick={() => {
                r.go(
                  () => setMemberAccessAction(userId, access),
                  () => {
                    setOpen(false);
                    toast({ tone: "success", title: "Access saved", body: `${name}'s access has changed.` });
                  },
                );
              }}
            >
              Save access
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5 p-6">
          <p className="type-body-sm text-secondary">Changes apply the next time they open a page.</p>
          {r.error ? <Alert tone="error" title={r.error} live /> : null}
          <AccessPicker value={access} onChange={setAccess} options={options} presets={presets} />
        </div>
      </Drawer>
    </>
  );
}

/** Remove a member (685:318), with a confirmation. Their work stays with the company. */
export function RemoveMember({ userId, name, company }: { userId: string; name: string; company: string }) {
  const r = useRun();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          r.setError("");
          setOpen(true);
        }}
      >
        Remove<span className="sr-only"> {name}</span>
      </Button>
      {/* The error shows in the dialog, not in the row, so the row keeps its shape (founder, 19 Nov 2026). */}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title={`Remove ${name} from ${company}?`}
        description="They lose access straight away. Quotes, listings and messages they made stay with the company."
        confirmLabel="Remove member"
        confirmDisabled={r.pending}
        onConfirm={() => {
          r.go(
            () => removeMemberAction(userId),
            () => {
              setOpen(false);
              toast({ tone: "success", title: `${name} removed`, body: `They no longer have access to ${company}.` });
            },
          );
        }}
      >
        {r.error ? <Alert tone="error" title={r.error} live /> : null}
      </ConfirmDialog>
    </>
  );
}
