import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { getSetting } from "@h2india/core";
import { documentStatusWord, documentTitle, EXPIRY_NOTICE, listBadges, listDocuments } from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import { EmptyState, Icon, Skeleton, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { UploadDocument } from "@/supplier/UploadDocument";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Verification documents (586:8; phones 587:281), step 8.2: the checks H2 Economy runs on the company, with status,
// expiry and what to fix. Only the company's own documents (scope). Uploads need verification.manage.
export const metadata: Metadata = { title: "Verification · H2 Economy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const page = await requireSupplier("/supplier/verification");
  const db = getDb();
  const s = page.supplier;
  const scope = scopeFor(page.actor);
  const [docs, badges, notice] = await Promise.all([
    listDocuments(db, scope, s.organisationId),
    listBadges(db, scope, s.organisationId),
    getSetting(db, EXPIRY_NOTICE),
  ]);
  const now = new Date();
  const canUpload = s.seat.permissions.has("verification.manage");
  const words = docs.map((d) => documentStatusWord(d, now, notice.days).word);
  const count = (pred: (w: string) => boolean) => words.filter(pred).length;
  const chips = [
    { n: count((w) => w === "Verified"), label: "verified", tone: "success" as const },
    { n: count((w) => w === "Pending"), label: "pending", tone: "progress" as const },
    { n: count((w) => w === "Needs re-upload"), label: "needs re-upload", tone: "warning" as const },
    { n: count((w) => w === "Rejected" || w === "Expired"), label: "rejected or expired", tone: "error" as const },
    { n: count((w) => w.startsWith("Expires in")), label: "expiring soon", tone: "warning" as const },
  ].filter((c) => c.n);
  const active = badges.filter((b) => b.status === "Active");
  const paged = pageOf(docs, pageRequest(sp));
  return (
    <SupplierShell page={page} current="/supplier/verification" title="Verification">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2">Verification</h1>
          <p className="type-body-sm text-secondary">
            Checks H2 Economy runs on {s.tradeName}. Keep them current to keep your badges.
          </p>
        </div>
        {canUpload ? <UploadDocument organisationId={s.organisationId} /> : null}
      </div>
      <section className="flex flex-wrap gap-6 rounded-card border border-default bg-page p-5">
        <div className="min-w-60 flex-1">
          <h2 className="type-h4">How buyers see you</h2>
          <p className="type-body-sm text-body">
            Your Verified supplier badge stays while GSTIN, PAN, bank and site visit are current. If a document lapses,
            the badge is paused until you upload the renewal.
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-2 rounded-card border border-default p-4 shadow-ink-float-sm">
          <p className="type-label text-primary">{s.tradeName}</p>
          {s.city ? <p className="type-caption text-secondary">{s.city}</p> : null}
          <div className="flex flex-wrap gap-2">
            {active.some((b) => b.kind === "verified_supplier") ? <VerifiedBadge kind="supplier" /> : null}
            {s.verification === "Verified" || s.verification === "GST verified" ? <VerifiedBadge kind="gst" /> : null}
            {active.length === 0 && s.verification !== "GST verified" ? (
              <span className="type-caption text-secondary">Not verified yet</span>
            ) : null}
          </div>
          {s.slug ? (
            <Link
              href={`/directory/companies/${s.slug}`}
              className="inline-flex items-center gap-1.5 type-label text-link"
            >
              View profile
              <Icon name="arrow-right" size={16} />
            </Link>
          ) : null}
        </div>
      </section>
      {chips.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Summary">
          {chips.map((c) => (
            <li key={c.label}>
              <StatusBadge status={`${String(c.n)} ${c.label}`} tone={c.tone} />
            </li>
          ))}
        </ul>
      ) : null}
      <LiveSection
        label="Verification documents"
        state={forcedState(sp.state) ?? (docs.length ? "ready" : "empty")}
        skeleton={
          <div className="flex flex-col gap-3 rounded-card border border-default bg-page p-6">
            <Skeleton kind="table-row" />
            <Skeleton kind="table-row" />
          </div>
        }
        empty={
          <div className="rounded-card border border-default bg-page">
            <EmptyState title="No documents yet">
              Upload your GST certificate, PAN and certificate of incorporation. H2 Economy checks them within 1 working
              day.
            </EmptyState>
          </div>
        }
      >
        <div
          tabIndex={0}
          role="region"
          aria-label="Verification documents"
          className="relative overflow-x-auto rounded-card border border-default bg-page"
        >
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-subtle text-left type-caption text-secondary">
                <th scope="col" className="px-4 py-3">
                  Check
                </th>
                <th scope="col" className="px-4 py-3">
                  Checked
                </th>
                <th scope="col" className="px-4 py-3">
                  Expires
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((d) => {
                const st = documentStatusWord(d, now, notice.days);
                const fix = d.status === "Needs re-upload" || d.status === "Rejected" || d.status === "Expired";
                return (
                  <tr key={d.id} className="border-t border-default align-top">
                    <th scope="row" className="px-4 py-4 text-left font-normal">
                      <span className="block type-label text-primary">{documentTitle(d)}</span>
                      {d.number ? <span className="block type-spec text-secondary">{d.number}</span> : null}
                      {d.scope ? <span className="block type-caption text-secondary">{d.scope}</span> : null}
                      {d.fileId ? (
                        <a
                          href={`/api/v1/files/${d.fileId}/link`}
                          className="inline-flex items-center gap-1 type-caption text-link underline"
                        >
                          <Icon name="file-text" size={14} />
                          {d.type === "site_visit" ? "Visit report" : "Open document"}
                        </a>
                      ) : null}
                      {d.reason && fix ? (
                        <span
                          className={
                            d.status === "Needs re-upload"
                              ? "block type-caption text-warning"
                              : "block type-caption text-error"
                          }
                        >
                          {d.reason}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-4 type-body-sm">{d.checkedAt ? formatIstDate(d.checkedAt) : "—"}</td>
                    <td
                      className={
                        st.tone === "warning" && st.word.startsWith("Expires")
                          ? "px-4 py-4 type-body-sm text-warning"
                          : "px-4 py-4 type-body-sm"
                      }
                    >
                      {d.expiresOn ? formatIstDate(d.expiresOn) : d.type === "site_visit" ? "—" : "No expiry"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        status={
                          d.type === "site_visit" && d.visitAt && d.status === "Submitted"
                            ? `Visit on ${formatIstDate(d.visitAt)}`
                            : st.word
                        }
                        tone={st.tone}
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
                      {canUpload && d.type !== "site_visit" && (fix || st.word.startsWith("Expires")) ? (
                        <UploadDocument
                          organisationId={s.organisationId}
                          look="outline"
                          label={fix ? "Re-upload" : "Upload renewal"}
                          renew={{ id: d.id, type: d.type, name: d.name, scope: d.scope, number: d.number }}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ListPager paged={paged} query={pagingQuery(sp)} className="mt-4" />
      </LiveSection>
    </SupplierShell>
  );
}
