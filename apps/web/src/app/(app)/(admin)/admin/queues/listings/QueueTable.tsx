"use client";

import { Button, Checkbox, StatusBadge } from "@h2india/ui";
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
}

/** Listings queue rows (629:367), with Assign to me and bulk approve for listings whose checks all passed. */
export function QueueTable({ rows, canDecide }: { rows: QueueRow[]; canDecide: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const passing = rows.filter((r) => !r.failed).map((r) => r.id);
  return (
    <>
      {selected.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-mint px-4 py-3">
          <span className="type-label">{selected.length} selected</span>
          {canDecide ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await bulkApproveAction(selected.filter((id) => passing.includes(id)));
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
