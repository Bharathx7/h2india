"use client";

import { Alert, Button, Checkbox, StatusBadge } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignListingAction, bulkApproveAction } from "../actions";

export interface QueueRow {
  id: string;
  name: string;
  model: string | null;
  line: string;
  failed: boolean;
  submitter: string;
  company: string;
  submitted: string;
  age: string;
  ageTone: "success" | "warning" | "error";
  assignee: string | null;
  /** The company isn't Verified yet, so a new listing can't be approved (decideRevision). */
  companyUnverified: boolean;
}

/** Listings queue rows (629:367), with Assign to me and bulk approve for listings whose checks all passed. */
export function QueueTable({ rows, canDecide }: { rows: QueueRow[]; canDecide: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  // Founder, 19 Nov 2026: listings core refused were skipped silently; say which and why.
  const [result, setResult] = useState<{ approved: number; skipped: { id: string; reason: string }[] } | null>(null);
  const nameOf = (id: string) => rows.find((r) => r.id === id)?.name ?? "A listing";
  const passing = rows.filter((r) => !r.failed).map((r) => r.id);
  return (
    <>
      {result ? (
        <Alert
          live
          tone={result.skipped.length ? "warning" : "success"}
          title={`${String(result.approved)} approved${result.skipped.length ? ` · ${String(result.skipped.length)} skipped` : ""}`}
          dismiss={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResult(null);
              }}
            >
              Dismiss
            </Button>
          }
        >
          {result.skipped.length ? (
            <ul className="flex flex-col gap-1 type-body-sm">
              {result.skipped.map((x) => (
                <li key={x.id}>
                  <span className="type-label">{nameOf(x.id)}</span>: {x.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}
      {selected.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-mint px-4 py-3">
          <span className="type-label">{selected.length} selected</span>
          {canDecide ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  setResult(await bulkApproveAction(selected.filter((id) => passing.includes(id))));
                  setSelected([]);
                  router.refresh();
                });
              }}
            >
              Approve {selected.filter((id) => passing.includes(id)).length}
            </Button>
          ) : null}
          <span className="ml-auto type-caption text-secondary">
            Bulk approve only covers listings where every automated check passed.
          </span>
        </div>
      ) : null}
      <div
        tabIndex={0}
        role="region"
        aria-label="Listings waiting"
        className="relative overflow-x-auto rounded-card border border-default bg-page"
      >
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="bg-subtle text-left type-caption text-secondary">
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Select</span>
              </th>
              <th scope="col" className="px-2 py-3">
                Item
              </th>
              <th scope="col" className="px-2 py-3">
                Submitted by
              </th>
              <th scope="col" className="px-2 py-3">
                Submitted
              </th>
              <th scope="col" className="px-2 py-3">
                Age vs SLA
              </th>
              <th scope="col" className="px-2 py-3">
                Assignee
              </th>
              <th scope="col" className="px-2 py-3">
                <span className="sr-only">Review</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-default align-top">
                <td className="px-4 py-3">
                  <Checkbox
                    label={<span className="sr-only">Select {r.name}</span>}
                    checked={selected.includes(r.id)}
                    onCheckedChange={(v) => {
                      setSelected(v === true ? [...selected, r.id] : selected.filter((x) => x !== r.id));
                    }}
                  />
                </td>
                <td className="px-2 py-3">
                  <span className="block type-label">{r.name}</span>
                  {r.model ? <span className="block type-spec text-secondary">{r.model}</span> : null}
                  {r.companyUnverified ? (
                    <span className="mt-1 block">
                      <StatusBadge status="Company not verified" tone="warning" />
                    </span>
                  ) : null}
                  <span className={r.failed ? "block type-caption text-warning" : "block type-caption text-secondary"}>
                    {r.line}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <span className="block type-body-sm">{r.submitter}</span>
                  <span className="block type-caption text-secondary">{r.company}</span>
                </td>
                <td className="px-2 py-3 type-body-sm">{r.submitted}</td>
                <td className="px-2 py-3">
                  <StatusBadge status={r.age} tone={r.ageTone} />
                </td>
                <td className="px-2 py-3 type-body-sm">
                  {r.assignee ??
                    (canDecide ? (
                      <button
                        type="button"
                        className="type-label"
                        onClick={() => {
                          start(async () => {
                            await assignListingAction(r.id);
                            router.refresh();
                          });
                        }}
                      >
                        Assign to me
                      </button>
                    ) : (
                      "—"
                    ))}
                </td>
                <td className="px-2 py-3 text-right">
                  <Link
                    href={`/admin/queues/listings/${r.id}`}
                    className="rounded-pill border-[1.5px] border-control px-3 py-1.5 type-label"
                  >
                    Review<span className="sr-only"> {r.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
