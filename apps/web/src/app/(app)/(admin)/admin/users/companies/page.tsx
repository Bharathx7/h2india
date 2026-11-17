import { getDb } from "@h2india/core";
import { listCompanies } from "@h2india/core/admin/lists";
import { can } from "@h2india/core/authz";
import { formatIstDate } from "@h2india/core/time";
import { buttonClasses, Icon, StatusBadge } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { ListFilters, ListTable } from "@/admin/ListTable";
import { AdminShell, requireOperator } from "@/admin/shell";
import { UsersHeader, UserTabs } from "@/admin/users/Tabs";
import { kindWord } from "@/admin/users/words";
import { pageRequest, pageWindow, pagingQuery } from "@/lib/paging";

// Users · Companies (founder QC, 17 Nov 2026; the frames' Organisations tab, 651:8): every buyer and supplier company,
// searched by name or GSTIN and paged in the database. Each opens Company detail.
export const metadata: Metadata = { title: "Companies · H2 Economy admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const KINDS = [
  { value: "", label: "All kinds" },
  { value: "buyer", label: "Buyers" },
  { value: "supplier", label: "Suppliers" },
];
const STATUSES = [
  { value: "", label: "Any status" },
  { value: "verified", label: "Verified" },
  { value: "suspended", label: "Suspended" },
];

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; status?: string; page?: string; perPage?: string }>;
}) {
  const sp = await searchParams;
  const { userId, actor } = await requireOperator("users.view", "/admin/users/companies");
  const kind = sp.kind === "buyer" || sp.kind === "supplier" ? sp.kind : undefined;
  const status = sp.status === "verified" || sp.status === "suspended" ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;
  const req = pageRequest(sp);
  const { rows, total } = await listCompanies(getDb(), actor, { q, kind, status, ...pageWindow(req) });
  return (
    <AdminShell userId={userId} current="/admin/users">
      <UsersHeader
        action={
          can(actor, "users.edit") ? (
            <Link href="/admin/users/companies/new" className={buttonClasses({})}>
              <Icon name="plus" size={18} />
              Add a supplier
            </Link>
          ) : undefined
        }
      />
      <UserTabs current="companies" />
      <ListFilters
        placeholder="Search company name or GSTIN"
        q={sp.q}
        selects={[
          { name: "kind", label: "Kind", value: kind ?? "", options: KINDS },
          { name: "status", label: "Status", value: status ?? "", options: STATUSES },
        ]}
      />
      <ListTable
        label="Companies"
        headings={["Company", "Kind", "GSTIN", "People", "Live products", "Status", "Joined"]}
        paged={{ page: req.page, perPage: req.perPage, total }}
        query={pagingQuery(sp)}
        clearHref="/admin/users/companies"
        filtered={Boolean(q ?? kind ?? status)}
        emptyTitle="No companies yet"
        emptyText="Companies appear here when people join as buyers or suppliers."
      >
        {rows.map((c) => (
          <tr key={c.id} className="border-t border-default align-top">
            <td className="px-4 py-3">
              <Link href={`/admin/users/companies/${c.id}`} className="block type-label text-link underline">
                {c.tradeName ?? c.legalName}
              </Link>
              {c.tradeName && c.tradeName !== c.legalName ? (
                <span className="block type-caption text-secondary">{c.legalName}</span>
              ) : null}
            </td>
            <td className="px-2 py-3 type-body-sm">{kindWord(c.kind)}</td>
            <td className="px-2 py-3 type-spec">{c.gstin ?? "—"}</td>
            <td className="px-2 py-3 type-body-sm">{c.people.toLocaleString("en-IN")}</td>
            <td className="px-2 py-3 type-body-sm">{c.liveProducts.toLocaleString("en-IN")}</td>
            <td className="px-2 py-3">
              {c.suspendedAt ? (
                <StatusBadge status="Suspended" tone="error" />
              ) : (
                <StatusBadge status={c.verification} tone={c.verification === "Verified" ? "success" : "neutral"} />
              )}
            </td>
            <td className="px-2 py-3 type-body-sm">{formatIstDate(c.createdAt)}</td>
          </tr>
        ))}
      </ListTable>
    </AdminShell>
  );
}
