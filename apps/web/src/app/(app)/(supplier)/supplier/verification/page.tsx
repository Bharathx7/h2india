import { getDb } from "@h2india/core";
import { scopeFor } from "@h2india/core/authz";
import { getSetting } from "@h2india/core";
import {
  canSubmitForReview,
  DOCUMENT_TYPES,
  documentStatusWord,
  documentTitle,
  EXPIRY_NOTICE,
  latestReview,
  listBadges,
  listDocuments,
  supplierChecklist,
  TIER_1,
} from "@h2india/core/supplier";
import { formatIstDate } from "@h2india/core/time";
import { Alert, cx, EmptyState, Icon, Skeleton, StatusBadge, VerifiedBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveSection } from "@/components/LiveSection";
import { forcedState } from "@/lib/dev-state";
import { requireSupplier, SupplierShell } from "@/supplier/shell";
import { SubmitReview } from "@/supplier/SubmitReview";
import { UploadDocument } from "@/supplier/UploadDocument";
import { ListPager } from "@/components/ListPager";
import { pageOf, pageRequest, pagingQuery } from "@/lib/paging";

// Verification documents (586:8; phones 587:281), step 8.2: the checks H2 Economy runs on the company, with status,
// expiry and what to fix. Only the company's own documents (scope). Uploads need verification.manage.
// Founder QC (17 Nov 2026): a guided flow on top (where you are, what's required and its state, the review's answer
// with its reason, Submit for review), then every document below.
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
  const [docs, badges, notice, checklist, review] = await Promise.all([
    listDocuments(db, scope, s.organisationId),
    listBadges(db, scope, s.organisationId),
    getSetting(db, EXPIRY_NOTICE),
    supplierChecklist(db, s.organisationId),
    latestReview(db, scope, s.organisationId),
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
  // What the Verified supplier badge needs: the tier-1 documents and the payout bank account.
  const bank = checklist.items.find((i) => i.key === "bank");
  const reviewItem = checklist.items.find((i) => i.key === "review");
  const required = [
    ...TIER_1.map((type) => {
      const d = docs.find((x) => x.type === type);
      const st = d ? documentStatusWord(d, now, notice.days) : null;
      const fix = d ? d.status === "Needs re-upload" || d.status === "Rejected" || d.status === "Expired" : false;
      return {
        key: type,
        title: DOCUMENT_TYPES[type].file,
        word: st?.word ?? "To upload",
        tone: st?.tone ?? ("neutral" as const),
        reason: fix ? (d?.reason ?? null) : null,
        action: !d
          ? { kind: "upload" as const, label: "Upload" }
          : fix
            ? { kind: "renew" as const, label: "Re-upload", doc: d }
            : st?.word.startsWith("Expires")
              ? { kind: "renew" as const, label: "Upload renewal", doc: d }
              : null,
      };
    }),
    {
      key: "bank",
      title: "Payout bank account",
      word: bank?.state === "done" ? "Verified" : bank?.state === "checking" ? "Being checked" : "To add",
      tone:
        bank?.state === "done"
          ? ("success" as const)
          : bank?.state === "checking"
            ? ("progress" as const)
            : ("neutral" as const),
      reason: null,
      action: bank?.state === "todo" ? { kind: "link" as const, label: "Add account", href: "/supplier/bank" } : null,
    },
  ];
  const verified = active.some((b) => b.kind === "verified_supplier");
  const allIn = required.every((x) => x.word !== "To upload" && x.word !== "To add");
  const allChecked = required.every((x) => x.word === "Verified" || x.word.startsWith("Expires"));
  // Where the company is: 0 upload, 1 being checked, 2 submit for review, 3 verified.
  const stage = verified ? 3 : reviewItem?.state === "checking" ? 2 : allChecked ? 2 : allIn ? 1 : 0;
  const sentBack = review?.status === "Changes requested" && !verified ? review : null;
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
      {sentBack ? (
        <Alert tone="warning" title="H2 Economy asked for changes before verifying you">
          {sentBack.reason ?? "Check the documents marked below and send them again."}
          {sentBack.decidedAt ? (
            <span className="block type-caption">Reviewed {formatIstDate(sentBack.decidedAt)}</span>
          ) : null}
        </Alert>
      ) : null}
      <ol aria-label="Verification progress" className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          { title: "Upload documents", text: "GST certificate, PAN and your payout bank account." },
          { title: "H2 Economy checks them", text: "Usually within 1 working day." },
          { title: "Submit for review", text: "We check your company and first listing together." },
          { title: "Verified supplier", text: "The badge shows on your storefront, quotes and listings." },
        ].map((x, i) => (
          <li
            key={x.title}
            aria-current={i === stage ? "step" : undefined}
            className={cx(
              "flex gap-3 rounded-card border p-4",
              i === stage ? "border-inverse bg-page" : i < stage ? "border-default bg-mint" : "border-default bg-page",
            )}
          >
            <span
              className={cx(
                "flex size-7 shrink-0 items-center justify-center rounded-pill type-label-sm",
                i < stage
                  ? "bg-accent text-primary"
                  : i === stage
                    ? "bg-inverse text-inverse"
                    : "bg-subtle text-secondary",
              )}
            >
              {i < stage ? <Icon name="check" size={14} /> : i + 1}
            </span>
            <span>
              <span className="block type-label text-primary">{x.title}</span>
              <span className="block type-caption text-secondary">{x.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="required" className="flex flex-col rounded-card border border-default bg-page">
          <div className="border-b border-default p-5">
            <h2 id="required" className="type-h4">
              What the Verified supplier badge needs
            </h2>
            <p className="type-caption text-secondary">Each one checked by H2 Economy and kept current.</p>
          </div>
          <ul>
            {required.map((x) => (
              <li key={x.key} className="flex flex-wrap items-center gap-3 border-b border-default p-5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="type-label text-primary">{x.title}</p>
                  {x.reason ? <p className="type-caption text-warning">{x.reason}</p> : null}
                </div>
                <StatusBadge status={x.word} tone={x.tone} />
                {canUpload && x.action ? (
                  x.action.kind === "link" ? (
                    <Link href={x.action.href} className="type-label text-link underline">
                      {x.action.label}
                    </Link>
                  ) : x.action.kind === "renew" ? (
                    <UploadDocument
                      organisationId={s.organisationId}
                      look="outline"
                      label={x.action.label}
                      renew={{
                        id: x.action.doc.id,
                        type: x.action.doc.type,
                        name: x.action.doc.name,
                        scope: x.action.doc.scope,
                        number: x.action.doc.number,
                      }}
                    />
                  ) : (
                    <UploadDocument organisationId={s.organisationId} look="outline" label={x.action.label} />
                  )
                ) : null}
              </li>
            ))}
          </ul>
          {!verified ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default bg-subtle p-5">
              <p className="type-body-sm text-body">
                {reviewItem?.state === "checking"
                  ? "Sent for review. We'll tell you when it's checked."
                  : canSubmitForReview(checklist)
                    ? "Everything's in. Send your company for review."
                    : "Submit for review opens once these and your storefront and first listing are in."}
              </p>
              {reviewItem?.state === "todo" ? <SubmitReview ready={canSubmitForReview(checklist)} /> : null}
            </div>
          ) : null}
        </section>
        <section className="flex flex-col gap-4 self-start rounded-card border border-default bg-page p-5">
          <div>
            <h2 className="type-h4">How buyers see you</h2>
            <p className="type-body-sm text-body">
              Your Verified supplier badge stays while GSTIN, PAN, bank and site visit are current. If a document
              lapses, the badge is paused until you upload the renewal.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 rounded-card border border-default p-4 shadow-ink-float-sm">
            <p className="type-label text-primary">{s.tradeName}</p>
            {s.city ? <p className="type-caption text-secondary">{s.city}</p> : null}
            <div className="flex flex-wrap gap-2">
              {active.some((b) => b.kind === "verified_supplier") ? <VerifiedBadge kind="supplier" /> : null}
              {s.verification === "Verified" || s.verification === "GST verified" ? <VerifiedBadge kind="gst" /> : null}
              {!active.some((b) => b.kind === "verified_supplier") &&
              s.verification !== "Verified" &&
              s.verification !== "GST verified" ? (
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
      </div>
      <h2 className="type-h3">All documents</h2>
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
