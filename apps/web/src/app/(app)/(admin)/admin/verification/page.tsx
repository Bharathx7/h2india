import { getDb, getSetting } from "@h2india/core";
import { can, type Actor } from "@h2india/core/authz";
import { pendingClaims } from "@h2india/core/companies";
import { formatIstDateTime } from "@h2india/core/companies/client";
import {
  BADGE_KINDS,
  deskCompany,
  deskCounts,
  documentStatusWord,
  documentTitle,
  EXPIRY_NOTICE,
  isBadgeKind,
  storefrontQueue,
  verificationDesk,
  type DeskTab,
} from "@h2india/core/supplier";
import { listingQueue, NEW_LISTING_KINDS } from "@h2india/core/products";
import { formatIstDate } from "@h2india/core/time";
import { buttonClasses, cx, EmptyState, Icon, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell, requireOperator } from "@/admin/shell";
import { StorefrontDecision } from "../queues/listings/StorefrontDecision";
import { ClaimDecision } from "./ClaimDecision";
import { DocumentDecision, GrantBadge, ReviewDecision, RevokeBadge, RunChecks } from "./DeskControls";
import { ListingDecision } from "./ListingDecision";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Verification desk (635:9; Revoke badge 636:436), step 8.2: documents, automated checks and expiry dates in one
// place, and badges granted only from recorded evidence. Profile claims (step 6.7) follow below. Operators with
// verification.view see everything; verification.edit decides.
export const metadata: Metadata = { title: "Verification · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const CLAIMS_PER_PAGE = 10;

const TABS: { key: DeskTab; label: string }[] = [
  { key: "action", label: "Needs action" },
  { key: "expiring", label: "Expiring in 60 days" },
  { key: "verified", label: "Verified" },
  { key: "revoked", label: "Revoked" },
];

// The company panel, in the order an operator works (founder, 19 Nov 2026): who it is, the documents to check, the
// automated checks, the checklist decision, the storefront and first product, then any other badge.
async function Company({ actor, id, canDecide }: { actor: Actor; id: string; canDecide: boolean }) {
  const db = getDb();
  const seesQueues = can(actor, "queues.view");
  const [c, notice, storefronts, listings] = await Promise.all([
    deskCompany(db, actor, id),
    getSetting(db, EXPIRY_NOTICE),
    seesQueues ? storefrontQueue(db, actor) : Promise.resolve([]),
    seesQueues ? listingQueue(db, actor) : Promise.resolve([]),
  ]);
  if (!c) return null;
  const now = new Date();
  const name = c.profile?.tradeName ?? c.org.legalName;
  const active = c.badges.filter((b) => b.status === "Active");
  const verifiedSince = active.find((b) => b.kind === "verified_supplier")?.grantedAt;
  const storefront = storefronts.find((s) => s.r.organisationId === id) ?? null;
  const products = listings.filter((x) => x.r.organisationId === id);
  const companyVerified = c.org.verification === "Verified";
  const decidesQueues = can(actor, "queues.edit");
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
          {/* The back office's Company detail (founder QC, 17 Nov 2026: this opened the public directory). */}
          <Link
            href={`/admin/users/companies/${id}`}
            className="inline-flex items-center gap-1.5 type-label text-primary"
          >
            <Icon name="building" size={16} />
            Open company
          </Link>
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

      {/* Founder, 19 Nov 2026: the checklist always shows, so the operator sees where the company stands. */}
      <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h3 className="type-h4">Verification checklist</h3>
        {c.review?.status === "Submitted" ? (
          <>
            <p className="type-caption text-secondary">
              Submitted for review {formatIstDateTime(c.review.submittedAt)}
            </p>
            {canDecide ? (
              <ReviewDecision
                id={c.review.id}
                initial={c.review.checks}
                evidence={c.evidence.ticks}
                verifyFirst={c.evidence.tier1Missing}
              />
            ) : (
              <p className="type-body-sm text-body">You can see this review but not decide it.</p>
            )}
          </>
        ) : c.review?.status === "Approved" ? (
          <p className="flex items-center gap-1.5 type-body-sm text-body">
            <Icon name="check-circle" size={16} className="text-icon-success" />
            Approved on {formatIstDate(c.review.decidedAt ?? c.review.updatedAt)}
          </p>
        ) : (
          <>
            {c.review?.status === "Changes requested" ? (
              <p className="type-body-sm text-body">
                Sent back on {formatIstDate(c.review.decidedAt ?? c.review.updatedAt)}
                {c.review.reason ? `: ${c.review.reason}` : ""}
              </p>
            ) : null}
            <p className="type-label">Waiting for the supplier to submit for review</p>
            {c.evidence.waitingOn.length ? (
              <ul className="flex list-disc flex-col gap-1 pl-5 type-body-sm text-body">
                {c.evidence.waitingOn.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : (
              <p className="type-body-sm text-secondary">Their documents and bank account are in place.</p>
            )}
          </>
        )}
      </section>

      {seesQueues ? (
        <section className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h3 className="type-h4">Storefront and first product</h3>
          {!storefront && !products.length ? (
            <p className="type-body-sm text-body">Nothing from {name} is waiting for review.</p>
          ) : null}
          {storefront ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className="type-label">Storefront change</p>
                <p className="type-caption text-secondary">
                  Sent {formatIstDateTime(storefront.r.submittedAt)} ·{" "}
                  <Link href="/admin/queues/listings#storefronts" className="underline">
                    See the change
                  </Link>
                </p>
              </div>
              {decidesQueues ? <StorefrontDecision id={storefront.r.id} /> : null}
            </div>
          ) : null}
          {products.length ? (
            <ul className="flex flex-col divide-y divide-default">
              {products.map((x) => {
                const isNew = NEW_LISTING_KINDS.includes(x.r.kind);
                return (
                  <li key={x.r.id} className="grid grid-cols-1 gap-3 py-3 md:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                      <p className="type-label">{x.name}</p>
                      <p className="type-caption text-secondary">
                        {x.r.kind}
                        {x.r.submittedAt ? ` · sent ${formatIstDateTime(x.r.submittedAt)}` : ""} ·{" "}
                        <Link href={`/admin/queues/listings/${x.r.id}`} className="underline">
                          Full review
                        </Link>
                      </p>
                    </div>
                    {decidesQueues ? (
                      <ListingDecision
                        id={x.r.id}
                        name={x.name}
                        blocked={
                          isNew && !companyVerified
                            ? "Approve the company in the checklist above first: new listings go live only for verified suppliers"
                            : null
                        }
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

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
  searchParams: Promise<{
    tab?: string;
    company?: string;
    org?: string;
    page?: string;
    perPage?: string;
    claims?: string;
  }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("verification.view", "/admin/verification");
  const db = getDb();
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "action";
  const [claims, list, counts] = await Promise.all([
    pendingClaims(db, actor),
    verificationDesk(db, actor, tab),
    deskCounts(db, actor),
  ]);
  const canDecide = can(actor, "verification.edit");
  const paged = pageOf(list, pageRequest(sp));
  // Profile claims page on their own (founder QC, 17 Nov 2026), oldest first, so the desk's pager stays the desk's.
  const claimPages = Math.max(1, Math.ceil(claims.length / CLAIMS_PER_PAGE));
  const claimPage = Math.min(claimPages, Math.max(1, Number(sp.claims) || 1));
  const claimStart = (claimPage - 1) * CLAIMS_PER_PAGE;
  const claimsHref = (n: number) =>
    `/admin/verification?${new URLSearchParams({ ...pagingQuery(sp), claims: String(n) }).toString()}#claims`;
  // ?company= opens that company; ?org= is the older name some links used (founder QC, 17 Nov 2026: the Suppliers
  // queue's Review opened whichever company came first).
  const asked = sp.company ?? sp.org;
  const selected = asked && /^[0-9a-f-]{36}$/i.test(asked) ? asked : paged.rows[0]?.organisationId;
  // Opening a company keeps the desk list on the same page.
  const companyHref = (id: string) =>
    `/admin/verification?${new URLSearchParams({
      tab,
      company: id,
      ...(sp.page ? { page: String(paged.page) } : {}),
      ...(sp.perPage ? { perPage: String(paged.perPage) } : {}),
    }).toString()}`;
  return (
    <AdminShell userId={userId} current="/admin/verification">
      <div className="flex flex-col gap-6">
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

        <h2 id="claims" className="type-h2">
          Profile claims
        </h2>
        <p className="type-body text-secondary">
          People claiming pre-seeded company profiles. Check the evidence, then approve or reject with a reason.
        </p>
        {claims.length > CLAIMS_PER_PAGE ? (
          <p className="type-caption text-secondary">
            {claims.length} waiting · showing {claimStart + 1}–{Math.min(claimStart + CLAIMS_PER_PAGE, claims.length)}
          </p>
        ) : null}
        {claims.length === 0 ? (
          <div className="rounded-card border border-default">
            <EmptyState title="No claims waiting">New claims show here as people send them.</EmptyState>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-default rounded-card border border-default">
            {claims.slice(claimStart, claimStart + CLAIMS_PER_PAGE).map((r) => (
              <li key={r.claim.id} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/admin/users/companies/${r.claim.organisationId}`}
                    className="type-label-lg text-link hover:underline"
                  >
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
        {claims.length > CLAIMS_PER_PAGE ? (
          <nav aria-label="Claims pages" className="flex gap-3">
            {claimPage > 1 ? (
              <Link href={claimsHref(claimPage - 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
                Newer claims
              </Link>
            ) : null}
            {claimStart + CLAIMS_PER_PAGE < claims.length ? (
              <Link href={claimsHref(claimPage + 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
                Older claims
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </AdminShell>
  );
}
