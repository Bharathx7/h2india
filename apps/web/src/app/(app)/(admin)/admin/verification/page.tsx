import { getDb, getSetting } from "@h2india/core";
import { can, loadActor, type Actor } from "@h2india/core/authz";
import { pendingClaims } from "@h2india/core/companies";
import { formatIstDateTime } from "@h2india/core/companies/client";
import { listNotifications, unreadCount } from "@h2india/core/notify";
import {
  BADGE_KINDS,
  deskCompany,
  deskCounts,
  documentStatusWord,
  documentTitle,
  EXPIRY_NOTICE,
  isBadgeKind,
  verificationDesk,
  type DeskTab,
} from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import { cx, EmptyState, Icon, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceFrame } from "@/components/WorkspaceFrame";
import { getSession } from "@/server/auth";
import { shellFor } from "@/server/workspace";
import { toRows } from "../../../(workspace)/notifications/rows";
import { ClaimDecision } from "./ClaimDecision";
import { DocumentDecision, GrantBadge, ReviewDecision, RevokeBadge, RunChecks } from "./DeskControls";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Verification desk (635:9; Revoke badge 636:436), step 8.2: documents, automated checks and expiry dates in one
// place, and badges granted only from recorded evidence. Profile claims (step 6.7) follow below. Operators with
// verification.view see everything; verification.edit decides.
export const metadata: Metadata = { title: "Verification · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS: { key: DeskTab; label: string }[] = [
  { key: "action", label: "Needs action" },
  { key: "expiring", label: "Expiring in 60 days" },
  { key: "verified", label: "Verified" },
  { key: "revoked", label: "Revoked" },
];

async function Company({ actor, id, canDecide }: { actor: Actor; id: string; canDecide: boolean }) {
  const db = getDb();
  const [c, notice] = await Promise.all([deskCompany(db, actor, id), getSetting(db, EXPIRY_NOTICE)]);
  if (!c) return null;
  const now = new Date();
  const name = c.profile?.tradeName ?? c.org.legalName;
  const active = c.badges.filter((b) => b.status === "Active");
  const verifiedSince = active.find((b) => b.kind === "verified_supplier")?.grantedAt;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-default bg-page p-5">
        <div className="flex flex-col gap-2">
          <h2 className="type-h3">{c.org.legalName}</h2>
          <p className="type-caption text-secondary">
            {[c.gstin?.gstin, c.profile?.city, verifiedSince ? `verified since ${formatIstDate(verifiedSince)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flex flex-wrap gap-2">
            {active.map((b) =>
              b.kind === "verified_supplier" ? (
                <VerifiedBadge key={b.id} kind="supplier" />
              ) : (
                <StatusBadge
                  key={b.id}
                  status={isBadgeKind(b.kind) ? BADGE_KINDS[b.kind].label : b.kind}
                  tone="success"
                />
              ),
            )}
            {c.org.verification === "GST verified" || c.org.verification === "Verified" ? (
              <VerifiedBadge kind="gst" />
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {c.profile?.slug ? (
            <Link
              href={`/directory/companies/${c.profile.slug}`}
              className="inline-flex items-center gap-1.5 type-label text-primary"
            >
              <Icon name="building" size={16} />
              Open company
            </Link>
          ) : null}
          {canDecide
            ? active.map((b) => (
                <RevokeBadge
                  key={b.id}
                  badgeId={b.id}
                  company={name}
                  label={isBadgeKind(b.kind) ? BADGE_KINDS[b.kind].label : b.kind}
                />
              ))
            : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h3 className="type-h4">Automated checks</h3>
        {c.checks.length ? (
          <ul className="flex flex-col gap-2">
            {c.checks.map((k) => (
              <li key={k.check} className="flex gap-2">
                <Icon
                  name={k.result === "pass" ? "check-circle" : "alert-circle"}
                  size={18}
                  className={k.result === "pass" ? "text-icon-primary" : "text-error"}
                />
                <span>
                  <span className="block type-label">{k.detail}</span>
                  <span className="block type-caption text-secondary">
                    Last checked {formatIstDateTime(k.checkedAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-sm text-body">Not run yet.</p>
        )}
        {canDecide ? <RunChecks organisationId={id} /> : null}
      </section>

      {c.review?.status === "Submitted" ? (
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h3 className="type-h4">Verification checklist</h3>
          <p className="type-caption text-secondary">Submitted for review {formatIstDateTime(c.review.submittedAt)}</p>
          {canDecide ? <ReviewDecision id={c.review.id} initial={c.review.checks} /> : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h3 className="type-h4">Documents and expiry</h3>
        {c.documents.length ? (
          <ul className="flex flex-col divide-y divide-default">
            {c.documents.map((d) => {
              const st = documentStatusWord(d, now, notice.days);
              return (
                <li
                  key={d.id}
                  className="grid grid-cols-1 items-start gap-3 py-3 md:grid-cols-[minmax(0,1fr)_120px_150px_auto]"
                >
                  <span className="flex gap-2">
                    <Icon name="file-text" size={18} />
                    <span>
                      <span className="block type-label">
                        {[documentTitle(d), d.scope].filter(Boolean).join(" · ")}
                      </span>
                      {d.number ? <span className="block type-spec text-secondary">{d.number}</span> : null}
                    </span>
                  </span>
                  <span className="type-body-sm">{d.expiresOn ? formatIstDate(d.expiresOn) : "No expiry"}</span>
                  <StatusBadge status={st.word} tone={st.tone} />
                  <span className="flex flex-col items-end gap-2">
                    {d.fileId ? (
                      <a
                        href={`/api/v1/files/${d.fileId}/link`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 type-label text-primary"
                      >
                        <Icon name="eye" size={16} />
                        Open
                      </a>
                    ) : null}
                    {canDecide && d.status === "Submitted" ? (
                      <DocumentDecision id={d.id} title={documentTitle(d)} />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="type-body-sm text-body">No documents yet.</p>
        )}
        <p className="type-caption text-secondary">{name} sees these expiry dates on their dashboard.</p>
      </section>

      {canDecide ? (
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h3 className="type-h4">Grant a badge</h3>
          <p className="type-caption text-secondary">
            Only from recorded evidence: every document the badge needs must be verified and current.
          </p>
          <GrantBadge organisationId={id} />
        </section>
      ) : null}
    </div>
  );
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; company?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/admin/verification");
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  if (!can(actor, "verification.view")) notFound();
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "action";
  const [shell, unread, bell, claims, list, counts] = await Promise.all([
    shellFor(session.user.id),
    unreadCount(db, session.user.id),
    listNotifications(db, session.user.id, { limit: 5 }),
    pendingClaims(db, actor),
    verificationDesk(db, actor, tab),
    deskCounts(db, actor),
  ]);
  const canDecide = can(actor, "verification.edit");
  const paged = pageOf(list, pageRequest(sp));
  const selected = sp.company && /^[0-9a-f-]{36}$/i.test(sp.company) ? sp.company : paged.rows[0]?.organisationId;
  // Opening a company keeps the desk list on the same page.
  const companyHref = (id: string) =>
    `/admin/verification?${new URLSearchParams({
      tab,
      company: id,
      ...(sp.page ? { page: String(paged.page) } : {}),
      ...(sp.perPage ? { perPage: String(paged.perPage) } : {}),
    }).toString()}`;
  return (
    <WorkspaceFrame
      area="admin"
      groups={shell.groups}
      current="/admin/verification"
      user={shell.user}
      home="/admin"
      bell={{ unread, items: toRows(bell) }}
    >
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div>
          <h1 className="type-h2">Verification</h1>
          <p className="type-body text-secondary">
            Keeps supplier badges true: documents, automated checks and expiry dates in one place.
          </p>
        </div>
        <nav aria-label="Verification" className="flex gap-6 overflow-x-auto border-b border-default">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/verification?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={cx(
                "-mb-px border-b-2 py-3 type-label whitespace-nowrap",
                tab === t.key ? "border-inverse text-primary" : "border-transparent text-secondary",
              )}
            >
              {t.label} <span className="text-secondary">{counts[t.key]}</span>
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {list.length ? (
            <div className="flex flex-col gap-4 self-start">
              <ul className="flex flex-col gap-3">
                {paged.rows.map((r) => (
                  <li key={r.organisationId}>
                    <Link
                      href={companyHref(r.organisationId)}
                      aria-current={selected === r.organisationId ? "true" : undefined}
                      className={cx(
                        "flex flex-col gap-1 rounded-card border p-4",
                        selected === r.organisationId ? "border-focus bg-mint" : "border-default bg-page",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="type-label text-primary">{r.name}</span>
                        <StatusBadge
                          status={r.tag}
                          tone={
                            r.tag === "Expiring"
                              ? "warning"
                              : r.tag === "Revoked"
                                ? "error"
                                : r.tag === "Verified"
                                  ? "success"
                                  : "progress"
                          }
                        />
                      </span>
                      <span className="type-caption text-secondary">{r.line}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <ListPager paged={paged} query={pagingQuery(sp)} />
            </div>
          ) : (
            <div className="rounded-card border border-default bg-page">
              <EmptyState title="Nothing here">Companies show here as they need a check.</EmptyState>
            </div>
          )}
          {selected ? <Company actor={actor} id={selected} canDecide={canDecide} /> : null}
        </div>

        <h2 className="type-h2">Profile claims</h2>
        <p className="type-body text-secondary">
          People claiming pre-seeded company profiles. Check the evidence, then approve or reject with a reason.
        </p>
        {claims.length === 0 ? (
          <div className="rounded-card border border-default">
            <EmptyState title="No claims waiting">New claims show here as people send them.</EmptyState>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default">
            {claims.map((r) => (
              <li key={r.claim.id} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-1">
                  <Link href={`/directory/companies/${r.slug}`} className="type-label-lg text-link hover:underline">
                    {r.company}
                  </Link>
                  <p className="type-body-sm text-body">
                    {r.claimant || "Unnamed"} · {r.claimantEmail}
                  </p>
                  <p className="type-caption text-secondary">Sent {formatIstDateTime(r.claim.createdAt)}</p>
                  {r.claim.method === "email" ? (
                    <StatusBadge status={`Company email verified: ${r.claim.email ?? ""}`} tone="success" />
                  ) : (
                    <p className="type-body-sm text-body">
                      GSTIN {r.claim.gstin} ·{" "}
                      {r.claim.letterFileId ? (
                        <a
                          href={`/api/v1/files/${r.claim.letterFileId}/link`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link underline"
                        >
                          Open the authorisation letter
                        </a>
                      ) : (
                        "no letter"
                      )}
                    </p>
                  )}
                </div>
                {canDecide ? (
                  <ClaimDecision claimId={r.claim.id} company={r.company} />
                ) : (
                  <p className="type-caption text-secondary">You can see claims but not decide them.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </WorkspaceFrame>
  );
}
