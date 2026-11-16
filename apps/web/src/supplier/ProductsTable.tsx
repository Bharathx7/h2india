"use client";

import {
  Checkbox,
  ConfirmDialog,
  Icon,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  StatusBadge,
  type BadgeTone,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProductAction, setListingStatusAction } from "./product-actions";

// The Products table (598:8): select rows to pause or archive; each row's menu edits, pauses, previews or deletes
// (Dialog Delete product 685:16).

export interface ProductLine {
  id: string;
  slug: string;
  name: string;
  model: string | null;
  category: string;
  pricing: string;
  pricingSub: string;
  stock: string;
  stockSub: string;
  status: string;
}

const TONE: Record<string, BadgeTone> = {
  Live: "success",
  "In review": "progress",
  "Needs changes": "warning",
  Rejected: "error",
  Paused: "neutral",
  Draft: "neutral",
};

export function ProductsTable({ rows, canEdit, company }: { rows: ProductLine[]; canEdit: boolean; company: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [removing, setRemoving] = useState<ProductLine | null>(null);
  const [pending, start] = useTransition();
  const bulk = (to: "Paused" | "Archived") => {
    start(async () => {
      await setListingStatusAction(selected, to);
      setSelected([]);
      router.refresh();
    });
  };
  const one = (id: string, to: "Paused" | "Live" | "Archived") => {
    start(async () => {
      await setListingStatusAction([id], to);
      router.refresh();
    });
  };
  const toggle = (id: string, on: boolean) => {
    setSelected(on ? [...selected, id] : selected.filter((x) => x !== id));
  };
  return (
    <>
      {selected.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-mint px-4 py-3">
          <span className="type-label">{selected.length} selected</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              bulk("Paused");
            }}
            className="rounded-pill border-[1.5px] border-control bg-page px-3 py-1 type-label"
          >
            Pause
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              bulk("Archived");
            }}
            className="rounded-pill border-[1.5px] border-control bg-page px-3 py-1 type-label"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected([]);
            }}
            className="ml-auto type-label"
          >
            Clear selection
          </button>
        </div>
      ) : null}
      <div
        tabIndex={0}
        role="region"
        aria-label="Products"
        className="relative overflow-x-auto rounded-card border border-default bg-page"
      >
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-subtle text-left type-caption text-secondary">
              <th scope="col" className="w-12 px-4 py-3">
                <Checkbox
                  label={<span className="sr-only">Select all</span>}
                  checked={
                    selected.length === rows.length && rows.length > 0
                      ? true
                      : selected.length
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(v) => {
                    setSelected(v === true ? rows.map((r) => r.id) : []);
                  }}
                />
              </th>
              <th scope="col" className="px-2 py-3">
                Product
              </th>
              <th scope="col" className="px-2 py-3">
                Category
              </th>
              <th scope="col" className="px-2 py-3">
                Pricing
              </th>
              <th scope="col" className="px-2 py-3">
                Stock and lead time
              </th>
              <th scope="col" className="px-2 py-3">
                Status
              </th>
              <th scope="col" className="px-2 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-default">
                <td className="px-4 py-3">
                  <Checkbox
                    label={<span className="sr-only">Select {p.name}</span>}
                    checked={selected.includes(p.id)}
                    onCheckedChange={(v) => {
                      toggle(p.id, v === true);
                    }}
                  />
                </td>
                <td className="px-2 py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-mint">
                      <Icon name="package" size={18} />
                    </span>
                    <span>
                      <Link
                        href={`/supplier/products/${p.id}`}
                        className="block type-label text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.model ? <span className="block type-spec text-secondary">{p.model}</span> : null}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-3 type-body-sm">{p.category}</td>
                <td className="px-2 py-3">
                  <span className="block type-body-sm">{p.pricing}</span>
                  {p.pricingSub ? <span className="block type-caption text-secondary">{p.pricingSub}</span> : null}
                </td>
                <td className="px-2 py-3">
                  <span className="block type-body-sm">{p.stock}</span>
                  {p.stockSub ? <span className="block type-caption text-secondary">{p.stockSub}</span> : null}
                </td>
                <td className="px-2 py-3">
                  <StatusBadge status={p.status} tone={TONE[p.status] ?? "neutral"} />
                </td>
                <td className="px-2 py-3 text-right">
                  {canEdit ? (
                    <Menu>
                      <MenuTrigger
                        aria-label={`Actions for ${p.name}`}
                        className="flex size-8 items-center justify-center rounded-pill border border-control"
                      >
                        <Icon name="more-horizontal" size={18} />
                      </MenuTrigger>
                      <MenuContent>
                        <MenuItem
                          icon="pencil"
                          onSelect={() => {
                            router.push(`/supplier/products/${p.id}`);
                          }}
                        >
                          Edit
                        </MenuItem>
                        {p.status === "Live" ? (
                          <MenuItem
                            icon="pause"
                            onSelect={() => {
                              one(p.id, "Paused");
                            }}
                          >
                            Pause
                          </MenuItem>
                        ) : null}
                        {p.status === "Paused" ? (
                          <MenuItem
                            icon="play"
                            onSelect={() => {
                              one(p.id, "Live");
                            }}
                          >
                            Resume
                          </MenuItem>
                        ) : null}
                        {p.status === "Live" || p.status === "Paused" ? (
                          <MenuItem
                            icon="eye"
                            onSelect={() => window.open(`/marketplace/products/${p.slug}`, "_blank", "noopener")}
                          >
                            Preview as buyer
                          </MenuItem>
                        ) : null}
                        <MenuItem
                          icon="trash"
                          onSelect={() => {
                            setRemoving(p);
                          }}
                        >
                          Delete
                        </MenuItem>
                      </MenuContent>
                    </Menu>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => {
          if (!v) setRemoving(null);
        }}
        tone="destructive"
        title={`Delete ${removing?.name ?? "this product"}?`}
        description={`This removes the product from ${company}'s catalogue for good. You can't undo it.`}
        confirmLabel="Delete product"
        cancelLabel="Keep product"
        confirmDisabled={pending}
        onConfirm={() => {
          const id = removing?.id;
          setRemoving(null);
          if (id) {
            start(async () => {
              await deleteProductAction(id);
              router.refresh();
            });
          }
        }}
      >
        {/* 685:16: what deleting does, and a nudge to keep it paused instead. */}
        {removing ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-control bg-subtle p-3">
              <Icon name="package" size={18} />
              <span className="min-w-0 flex-1">
                <span className="block type-label">{removing.name}</span>
                <span className="block type-caption text-secondary">
                  {[removing.model, removing.category, removing.stock].filter(Boolean).join(" · ")}
                </span>
              </span>
              <StatusBadge status={removing.status} tone={TONE[removing.status] ?? "neutral"} />
            </div>
            <p className="flex gap-2 type-body-sm">
              <Icon name="info" size={16} />
              It comes off your storefront and H2 Economy search, and buyers who saved it see &quot;No longer
              available&quot;.
            </p>
            <p className="flex gap-2 type-body-sm">
              <Icon name="check-circle" size={16} />
              Quotes and orders that already include it keep their copy, so nothing changes for those buyers.
            </p>
            {removing.status === "Paused" ? (
              <p className="type-caption text-secondary">
                It&apos;s already paused, so buyers can&apos;t see it now. Keep it paused if you might sell it again.
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
