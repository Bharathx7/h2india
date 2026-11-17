import { accessPresets, grantablePermissions } from "@h2india/core/authz";
import type { teamView } from "@h2india/core/supplier";
import { formatIstDayMonth } from "@h2india/core/time";
import { EmptyState, Icon, StatusBadge } from "@h2india/ui";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";
import { JoinRequest, RevokeInvite } from "@/supplier/TeamControls";
import { AddMember, EditAccess, RemoveMember } from "./Access";

// Team (592:371), rebuilt in founder QC (17 Nov 2026) for supplier Team and buyer Company · Team: who is in the
// company and what each person can do, with Add member, Edit access and Remove on each row, waiting invitations and
// join requests, a search and pages. Access is ticked per person (AccessPicker); presets tick boxes for you.

type View = Awaited<ReturnType<typeof teamView>>;

const initials = (n: string) =>
  n
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** "Full access", a preset's name, or "Custom: 4 of 10". */
function accessWords(x: { admin: boolean; role: string; access: string[] }, total: number) {
  if (x.admin) return { text: "Full access", tone: "success" as const };
  if (x.role === "Custom")
    return { text: `Custom: ${String(x.access.length)} of ${String(total)}`, tone: "progress" as const };
  return { text: x.role, tone: "neutral" as const };
}

export function TeamPanel({
  view,
  company,
  selfId,
  manage,
  sp,
  basePath,
  keep = {},
}: {
  view: View;
  company: string;
  selfId: string;
  manage: boolean;
  sp: { q?: string; page?: string; perPage?: string };
  /** The page's address, for the search form. */
  basePath: string;
  /** Other address parameters the page keeps (the buyer Company page's tab). */
  keep?: Record<string, string>;
}) {
  const options = grantablePermissions(view.kind).map((o) => ({ key: o.key, label: o.label }));
  const presets = accessPresets(view.kind).map((p) => ({ ...p, permissions: [...p.permissions] }));
  const label = new Map(options.map((o) => [o.key, o.label]));
  const q = (sp.q ?? "").trim().toLowerCase();
  const members = view.members.filter((x) => !q || `${x.name} ${x.email}`.toLowerCase().includes(q));
  const paged = pageOf(members, pageRequest(sp));
  const today = new Date().toDateString();
  const active = (d: Date | null) =>
    !d ? "Not yet" : new Date(d).toDateString() === today ? "Today" : formatIstDayMonth(new Date(d));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-sm text-secondary">
          {view.members.length} {view.members.length === 1 ? "member" : "members"}
          {view.invitations.length ? ` · ${String(view.invitations.length)} waiting to accept` : ""}
        </p>
        {manage ? <AddMember options={options} presets={presets} /> : null}
      </div>

      {view.requests.length && manage ? (
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 className="type-h4">
            {view.requests.length} {view.requests.length === 1 ? "person" : "people"} asked to join {company}
          </h2>
          {view.requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-t border-default pt-3">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-pill bg-mint type-label"
              >
                {initials(r.name || r.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block type-label">{r.name || r.email}</span>
                <span className="block type-caption text-secondary">
                  {r.email} · asked {formatIstDayMonth(r.createdAt)}
                </span>
              </span>
              <JoinRequest id={r.id} name={r.name || r.email} />
            </div>
          ))}
        </section>
      ) : null}

      <form method="get" action={basePath} className="flex flex-wrap gap-3">
        {Object.entries(keep).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="relative min-w-60 flex-1 md:max-w-sm">
          <span className="sr-only">Search members by name or email</span>
          <Icon name="search" size={18} className="absolute top-3 left-3 text-icon-secondary" />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Search members by name or email"
            className="h-11 w-full rounded-control border-[1.5px] border-control bg-page pr-3 pl-10 type-body"
          />
        </label>
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      {paged.rows.length ? (
        <ul
          className="flex flex-col divide-y divide-default rounded-card border border-default bg-page"
          aria-label="Team members"
        >
          {paged.rows.map((x) => {
            const words = accessWords(x, options.length);
            const shown = x.admin ? [] : x.access.slice(0, 4).map((k) => label.get(k) ?? k);
            const name = x.name || x.email;
            return (
              <li key={x.userId} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-mint type-label"
                  >
                    {initials(name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block type-label">
                      {name}
                      {x.userId === selfId ? " (you)" : ""}
                    </span>
                    <span className="block truncate type-caption text-secondary">
                      {x.email} · last active {active(x.lastActive)}
                    </span>
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-1 md:w-80">
                  <StatusBadge status={words.text} tone={words.tone} />
                  <span className="type-caption text-secondary">
                    {x.admin
                      ? "Everything, including company settings, the team and payouts"
                      : `${shown.join(", ")}${x.access.length > shown.length ? ` and ${String(x.access.length - shown.length)} more` : ""}`}
                  </span>
                </span>
                {manage ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <EditAccess
                      userId={x.userId}
                      name={name}
                      start={{ admin: x.admin, permissions: x.admin ? [] : x.access }}
                      options={options}
                      presets={presets}
                    />
                    {x.userId === selfId ? null : <RemoveMember userId={x.userId} name={name} company={company} />}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-card border border-default bg-page">
          <EmptyState kind="no-results" icon="search" title={`No member matches "${sp.q ?? ""}"`}>
            Search by name or email.
          </EmptyState>
        </div>
      )}
      <ListPager paged={paged} query={{ ...keep, ...pagingQuery(sp) }} />

      {view.invitations.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="type-h4">Waiting to accept</h2>
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default bg-page">
            {view.invitations.map((i) => {
              const words = accessWords(i, options.length);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block type-label">{i.email}</span>
                    <span className="block type-caption text-secondary">
                      Invitation expires {formatIstDayMonth(i.expiresAt)}
                    </span>
                  </span>
                  <StatusBadge status={words.text} tone={words.tone} />
                  {manage ? <RevokeInvite id={i.id} email={i.email} /> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
