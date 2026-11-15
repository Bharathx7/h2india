"use client";

import {
  Alert,
  Button,
  Checkbox,
  ConfirmDialog,
  Icon,
  IconButton,
  Input,
  Modal,
  Select,
  Switch,
  Textarea,
} from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addGstinAction,
  defaultGstinAction,
  delegationAction,
  endDelegationAction,
  limitAction,
  passkeyRolesAction,
  profileAction,
  removeGstinAction,
  removeSiteAction,
  rulesAction,
  saveSiteAction,
  signOutAction,
} from "./actions";

// Company settings controls (574:8 to 577:729 and dialogs 578:9 to 581:353), step 9.1.

type R = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };

function useRun() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const go = (work: () => Promise<R>, done?: () => void) => {
    start(async () => {
      const r = await work();
      setError(r.ok ? "" : r.error);
      setErrors(r.ok ? {} : (r.errors ?? {}));
      if (r.ok) {
        done?.();
        router.refresh();
      }
    });
  };
  return { error, errors, pending, go };
}

export interface ProfileStart {
  legalName: string;
  tradeName: string;
  type: string;
  size: string;
  office: string;
  about: string;
}

// Type words match the directory's type filter (DIRECTORY_TYPES), so the profile lands under the right filter.
const COMPANY_TYPES = [
  "Project developer",
  "Producer",
  "EPC contractor",
  "Industrial user",
  "Research institution",
  "Government or PSU",
];
// Stored as the directory stores employees ("51–200"); shown with "people".
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"];

export function ProfileForm({ start, canEdit }: { start: ProfileStart; canEdit: boolean }) {
  const r = useRun();
  const [f, setF] = useState(start);
  const initials = f.tradeName
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex flex-col gap-4">
      {r.error ? <Alert tone="error" title={r.error} live /> : null}
      <div className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
        <div className="flex items-center gap-4">
          <span className="flex size-17 items-center justify-center rounded-pill bg-mint type-h4" aria-hidden>
            {initials}
          </span>
          <p className="type-caption text-secondary">
            Your logo comes from your directory profile. Square PNG or SVG, up to 1 MB.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Legal name</span>
            <Input value={f.legalName} disabled />
            <span className="type-caption text-secondary">
              From your GST registration. Contact support to change it.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="type-label">
              Trade name <span className="text-error">*</span>
            </span>
            <Input
              value={f.tradeName}
              disabled={!canEdit}
              required
              onChange={(e) => {
                setF({ ...f, tradeName: e.target.value });
              }}
            />
            <span className="type-caption text-secondary">Shown to suppliers.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Company type</span>
            <Select
              value={f.type}
              disabled={!canEdit}
              onChange={(e) => {
                setF({ ...f, type: e.target.value });
              }}
            >
              <option value="">Choose</option>
              {[...new Set([...COMPANY_TYPES, ...(f.type ? [f.type] : [])])].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Company size</span>
            <Select
              value={f.size}
              disabled={!canEdit}
              onChange={(e) => {
                setF({ ...f, size: e.target.value });
              }}
            >
              <option value="">Choose</option>
              {[...new Set([...COMPANY_SIZES, ...(f.size ? [f.size] : [])])].map((t) => (
                <option key={t} value={t}>
                  {t} people
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Registered office</span>
          <Input value={f.office} disabled />
          <span className="type-caption text-secondary">From your default GSTIN.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">About the company</span>
          <Textarea
            value={f.about}
            maxLength={500}
            rows={4}
            disabled={!canEdit}
            onChange={(e) => {
              setF({ ...f, about: e.target.value });
            }}
          />
          <span className="self-end type-caption text-secondary">{f.about.length} / 500</span>
        </label>
      </div>
      {canEdit ? (
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              setF(start);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={r.pending}
            onClick={() => {
              r.go(() => profileAction({ tradeName: f.tradeName, type: f.type, size: f.size, about: f.about }));
            }}
          >
            Save changes
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AddGstin() {
  const r = useRun();
  const [open, setOpen] = useState(false);
  const [gstin, setGstin] = useState("");
  const [place, setPlace] = useState("");
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="plus" size={18} />
        Add a GSTIN
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Add a GSTIN"
        description="We check it with GST records in the background. You can request quotes while we check."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={r.pending}
              onClick={() => {
                r.go(
                  () => addGstinAction(gstin, place),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Add GSTIN
            </Button>
          </div>
        }
      >
        {r.error ? <Alert tone="error" title={r.error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">GSTIN</span>
          <Input
            value={gstin}
            onChange={(e) => {
              setGstin(e.target.value.toUpperCase());
            }}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Place of business</span>
          <Input
            value={place}
            placeholder="Kandla, Kutch"
            onChange={(e) => {
              setPlace(e.target.value);
            }}
          />
        </label>
      </Modal>
    </>
  );
}

export function GstinActions({
  id,
  isDefault,
  active,
  gstin,
}: {
  id: string;
  isDefault: boolean;
  active: boolean;
  gstin: string;
}) {
  const r = useRun();
  return (
    <span className="flex items-center justify-end gap-2">
      {!isDefault && active ? (
        <Button
          variant="outline"
          size="sm"
          disabled={r.pending}
          onClick={() => {
            r.go(() => defaultGstinAction(id));
          }}
        >
          Set as default
        </Button>
      ) : null}
      {!isDefault ? (
        <IconButton
          icon="trash"
          look="outline"
          size="sm"
          label={`Remove ${gstin}`}
          onClick={() => {
            r.go(() => removeGstinAction(id));
          }}
        />
      ) : null}
      {r.error ? <span className="type-caption text-error">{r.error}</span> : null}
    </span>
  );
}

export interface SiteForm {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstinId: string;
  hours: string;
  contacts: { name: string; role: string; mobile: string }[];
  isDefault: boolean;
}

const BLANK: SiteForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstinId: "",
  hours: "",
  contacts: [{ name: "", role: "", mobile: "" }],
  isDefault: false,
};

export function SiteDialog({
  start,
  gstins,
  label,
}: {
  start?: SiteForm;
  gstins: { id: string; label: string }[];
  label: string;
}) {
  const r = useRun();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<SiteForm>(start ?? BLANK);
  const set = (p: Partial<SiteForm>) => {
    setF({ ...f, ...p });
  };
  return (
    <>
      <Button
        variant={start ? "outline" : "primary"}
        size={start ? "sm" : "md"}
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name={start ? "pencil" : "plus"} size={16} />
        {label}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={start ? "Edit delivery site" : "Add a delivery site"}
        description="Where suppliers deliver. Receiving contacts get the delivery code by SMS."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={r.pending}
              onClick={() => {
                r.go(
                  () => saveSiteAction({ ...f, gstinId: f.gstinId || null }),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Save site
            </Button>
          </div>
        }
      >
        {r.error ? <Alert tone="error" title={r.error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Site name</span>
          <Input
            value={f.name}
            placeholder="Talegaon plant"
            onChange={(e) => {
              set({ name: e.target.value });
            }}
          />
          {r.errors.name ? <span className="type-caption text-error">{r.errors.name}</span> : null}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Address</span>
          <Input
            value={f.address}
            onChange={(e) => {
              set({ address: e.target.value });
            }}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            aria-label="City"
            placeholder="City"
            value={f.city}
            onChange={(e) => {
              set({ city: e.target.value });
            }}
          />
          <Input
            aria-label="State"
            placeholder="State"
            value={f.state}
            onChange={(e) => {
              set({ state: e.target.value });
            }}
          />
          <Input
            aria-label="PIN code"
            placeholder="PIN code"
            inputMode="numeric"
            value={f.pincode}
            onChange={(e) => {
              set({ pincode: e.target.value });
            }}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Bills to GSTIN</span>
          <Select
            value={f.gstinId}
            onChange={(e) => {
              set({ gstinId: e.target.value });
            }}
          >
            <option value="">Default GSTIN</option>
            {gstins.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Receiving hours</span>
          <Input
            value={f.hours}
            placeholder="Mon to Sat, 9:00 AM to 5:00 PM"
            onChange={(e) => {
              set({ hours: e.target.value });
            }}
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="type-label">Receiving contacts</legend>
          {f.contacts.map((c, i) => (
            <div key={String(i)} className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                aria-label="Contact name"
                placeholder="Name"
                value={c.name}
                onChange={(e) => {
                  set({ contacts: f.contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) });
                }}
              />
              <Input
                aria-label="Contact role"
                placeholder="Role"
                value={c.role}
                onChange={(e) => {
                  set({ contacts: f.contacts.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) });
                }}
              />
              <Input
                aria-label="Contact mobile"
                placeholder="Mobile"
                value={c.mobile}
                onChange={(e) => {
                  set({ contacts: f.contacts.map((x, j) => (j === i ? { ...x, mobile: e.target.value } : x)) });
                }}
              />
            </div>
          ))}
          {r.errors.contacts ? <span className="type-caption text-error">{r.errors.contacts}</span> : null}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              set({ contacts: [...f.contacts, { name: "", role: "", mobile: "" }] });
            }}
          >
            <Icon name="plus" size={16} />
            Add a receiving contact
          </Button>
        </fieldset>
        <Checkbox
          label="Default site"
          checked={f.isDefault}
          onCheckedChange={(v) => {
            set({ isDefault: v === true });
          }}
        />
      </Modal>
    </>
  );
}

export function RemoveSite({ id, name }: { id: string; name: string }) {
  const r = useRun();
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        icon="trash"
        look="outline"
        size="sm"
        label={`Remove ${name}`}
        onClick={() => {
          setOpen(true);
        }}
      />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title={`Remove ${name}?`}
        description="It won't be offered in new RFQs or orders. Past orders keep their address."
        confirmLabel="Remove site"
        onConfirm={() => {
          setOpen(false);
          r.go(() => removeSiteAction(id));
        }}
      />
      {r.error ? <span className="type-caption text-error">{r.error}</span> : null}
    </>
  );
}

export function LimitDialog({
  userId,
  name,
  role,
  limit,
}: {
  userId: string;
  name: string;
  role: string;
  limit: string;
}) {
  const r = useRun();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(limit);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Change limit<span className="sr-only"> for {name}</span>
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Change ${name}'s limit`}
        description="Orders above a person's limit go to an approver. Limits apply when ordering opens."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={r.pending}
              onClick={() => {
                r.go(
                  () => limitAction(userId, role, v),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Save limit
            </Button>
          </div>
        }
      >
        {r.error ? <Alert tone="error" title={r.error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">Limit (₹)</span>
          <Input
            inputMode="decimal"
            value={v}
            onChange={(e) => {
              setV(e.target.value);
            }}
          />
        </label>
      </Modal>
    </>
  );
}

export function RulesForm({
  start,
  approvers,
  canEdit,
}: {
  start: { above: string; approverId: string; second: boolean; secondAbove: string; secondApproverId: string };
  approvers: { id: string; label: string }[];
  canEdit: boolean;
}) {
  const r = useRun();
  const [f, setF] = useState(start);
  return (
    <div className="flex flex-col gap-4">
      {r.error ? <Alert tone="error" title={r.error} live /> : null}
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h3 className="type-h4">Orders above the limit need approval</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Approval needed above (₹)</span>
            <Input
              inputMode="decimal"
              disabled={!canEdit}
              value={f.above}
              onChange={(e) => {
                setF({ ...f, above: e.target.value });
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="type-label">Approver</span>
            <Select
              disabled={!canEdit}
              value={f.approverId}
              onChange={(e) => {
                setF({ ...f, approverId: e.target.value });
              }}
            >
              <option value="">Choose</option>
              {approvers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </section>
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h3 className="type-h4">Second approver for large orders</h3>
        <Switch
          label="Large orders also need a second approver"
          checked={f.second}
          disabled={!canEdit}
          onCheckedChange={(v) => {
            setF({ ...f, second: v });
          }}
        />
        {f.second ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="type-label">Second approver above (₹)</span>
              <Input
                inputMode="decimal"
                disabled={!canEdit}
                value={f.secondAbove}
                onChange={(e) => {
                  setF({ ...f, secondAbove: e.target.value });
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="type-label">Second approver</span>
              <Select
                disabled={!canEdit}
                value={f.secondApproverId}
                onChange={(e) => {
                  setF({ ...f, secondApproverId: e.target.value });
                }}
              >
                <option value="">Choose</option>
                {approvers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        ) : null}
        <p className="type-caption text-secondary">
          Nobody can approve an order they raised. If they did, another Admin is asked instead.
        </p>
      </section>
      {canEdit ? (
        <Button
          className="self-end"
          disabled={r.pending}
          onClick={() => {
            r.go(() => rulesAction(f));
          }}
        >
          Save rules
        </Button>
      ) : null}
    </div>
  );
}

export function Delegation({ people }: { people: { id: string; label: string }[] }) {
  const r = useRun();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ from: people[0]?.id ?? "", to: people[1]?.id ?? "", start: "", end: "" });
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="plus" size={16} />
        Add a delegation
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Add a delegation"
        description="Hand approvals to someone else while an approver is away. It ends on the date you set."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={r.pending}
              onClick={() => {
                r.go(
                  () => delegationAction(f.from, f.to, f.start, f.end),
                  () => {
                    setOpen(false);
                  },
                );
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        {r.error ? <Alert tone="error" title={r.error} live /> : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select
            aria-label="From"
            value={f.from}
            onChange={(e) => {
              setF({ ...f, from: e.target.value });
            }}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="To"
            value={f.to}
            onChange={(e) => {
              setF({ ...f, to: e.target.value });
            }}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          <Input
            aria-label="From date"
            type="date"
            value={f.start}
            onChange={(e) => {
              setF({ ...f, start: e.target.value });
            }}
          />
          <Input
            aria-label="To date"
            type="date"
            value={f.end}
            onChange={(e) => {
              setF({ ...f, end: e.target.value });
            }}
          />
        </div>
      </Modal>
    </>
  );
}

export function EndDelegation({ id }: { id: string }) {
  const r = useRun();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={r.pending}
      onClick={() => {
        r.go(() => endDelegationAction(id));
      }}
    >
      End now
    </Button>
  );
}

export function PasskeyPolicy({
  roles,
  counts,
  canEdit,
}: {
  roles: string[];
  counts: Record<string, string>;
  canEdit: boolean;
}) {
  const r = useRun();
  const [on, setOn] = useState(roles);
  const toggle = (role: string, v: boolean) => {
    const next = v ? [...on, role] : on.filter((x) => x !== role);
    setOn(next);
    r.go(() => passkeyRolesAction(next));
  };
  return (
    <ul className="flex flex-col divide-y divide-default">
      {["Admin", "Approver", "Requester"].map((role) => (
        <li key={role} className="flex items-center justify-between py-3">
          <Switch
            label={`Require for ${role}s`}
            checked={on.includes(role)}
            disabled={!canEdit}
            onCheckedChange={(v) => {
              toggle(role, v);
            }}
          />
          <span className="type-caption text-secondary">{counts[role]}</span>
        </li>
      ))}
    </ul>
  );
}

export function SignOut({ id, name }: { id: string | null; name?: string }) {
  const r = useRun();
  return id === null ? (
    <Button
      variant="destructive"
      className="self-start"
      disabled={r.pending}
      onClick={() => {
        r.go(() => signOutAction(null));
      }}
    >
      Sign out everyone except you
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      disabled={r.pending}
      onClick={() => {
        r.go(() => signOutAction(id));
      }}
    >
      Sign out<span className="sr-only"> {name}</span>
    </Button>
  );
}
