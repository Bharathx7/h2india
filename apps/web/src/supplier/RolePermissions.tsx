"use client";

import type { RoleGridRow } from "@h2india/core/authz";
import { Alert, Checkbox, useToast } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setRolePermissionAction } from "./team-actions";

// Roles and permissions (founder QC, 17 Nov 2026): a role × permission grid on Team, for suppliers and buyers. A
// company admin ticks what each role may do; Admin is fixed, and the boxes only Admins may hold aren't offered.
// Each tick saves at once (setRolePermission, audited) and applies on the person's next page.

export function RolePermissions({
  permissions,
  roles,
  canEdit,
}: {
  permissions: { key: string; label: string }[];
  roles: RoleGridRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  // Shown at once; the server's answer replaces it on refresh (or puts it back on error).
  const [ticks, setTicks] = useState(() => new Set(roles.flatMap((r) => r.permissions.map((p) => `${r.name}|${p}`))));

  const toggle = (role: string, permission: string, on: boolean) => {
    const key = `${role}|${permission}`;
    setTicks((t) => {
      const next = new Set(t);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
    start(async () => {
      const r = await setRolePermissionAction(role, permission, on);
      if (!r.ok) {
        setError(r.error);
        setTicks((t) => {
          const back = new Set(t);
          if (on) back.delete(key);
          else back.add(key);
          return back;
        });
        return;
      }
      setError("");
      toast({ tone: "success", title: `${role}: ${on ? "can" : "can't"} ${permissionShort(permission)}` });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert tone="error" title={error} live /> : null}
      <div
        tabIndex={0}
        role="region"
        aria-label="Roles and permissions"
        className="relative overflow-x-auto rounded-card border border-default bg-page"
      >
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-subtle text-left type-caption text-secondary">
              <th scope="col" className="px-4 py-3">
                Permission
              </th>
              {roles.map((r) => (
                <th key={r.name} scope="col" className="px-2 py-3 text-center">
                  {r.name}
                  {r.editable ? null : <span className="block type-caption normal-case">fixed</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.key} className="border-t border-default">
                <th scope="row" className="px-4 py-2.5 text-left type-body-sm font-normal text-body">
                  {p.label}
                </th>
                {roles.map((r) => {
                  const on = r.editable ? ticks.has(`${r.name}|${p.key}`) : r.permissions.includes(p.key);
                  const changed = r.changed.includes(p.key);
                  return (
                    <td key={r.name} className="px-2 py-2.5 text-center">
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <Checkbox
                          checked={on}
                          disabled={!r.editable || !canEdit || pending}
                          onCheckedChange={(v) => {
                            toggle(r.name, p.key, v === true);
                          }}
                          label={<span className="sr-only">{`${r.name}: ${p.label}`}</span>}
                        />
                        {changed ? <span className="type-caption text-secondary">changed</span> : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="type-caption text-secondary">
        {canEdit
          ? "Admins can always do everything, and only Admins change company details, the team and the payout bank account. A change applies straight away."
          : "Only a company admin can change what each role can do."}
      </p>
    </div>
  );
}

function permissionShort(key: string): string {
  return key.replace(".", " ").replace("_", " ");
}
