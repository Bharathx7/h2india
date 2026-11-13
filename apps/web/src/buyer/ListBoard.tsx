"use client";

import type { ListCard } from "@h2india/core/buyer";
import {
  Alert,
  Button,
  buttonClasses,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Icon,
  Input,
  Modal,
  ProductCard,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteListAction, newListAction, removeFromListAction } from "./actions";

// Saved lists (78:2628; New list 275:23517), step 9.1: chips for the company's lists, then the chosen list's products
// with a selection bar. Request quotes takes the selection to the RFQ wizard. No price anywhere.

export function NewList({ label = "Add another list" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const save = () => {
    start(async () => {
      const r = await newListAction(name);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      setName("");
      router.refresh();
    });
  };
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="plus" size={16} />
        {label}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="New list"
        description="Everyone in your company can see your lists."
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button disabled={pending} onClick={save}>
              Create list
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <label className="flex flex-col gap-1.5">
          <span className="type-label">List name</span>
          <Input
            value={name}
            maxLength={80}
            placeholder="Talegaon pilot"
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </label>
      </Modal>
    </>
  );
}

export function ListBoard({
  listId,
  name,
  cards,
  canEdit,
}: {
  listId: string;
  name: string;
  cards: ListCard[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const live = cards.filter((c) => c.live);
  const selected = cards.filter((c) => chosen.includes(c.id));
  const toggle = (id: string, on: boolean) => {
    setChosen(on ? [...chosen, id] : chosen.filter((x) => x !== id));
  };
  const remove = () => {
    start(async () => {
      const r = await removeFromListAction(listId, chosen);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setChosen([]);
      router.refresh();
    });
  };
  const drop = () => {
    start(async () => {
      const r = await deleteListAction(listId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/buyer/lists");
      router.refresh();
    });
  };
  if (!cards.length) {
    return (
      <div className="flex flex-col items-start gap-3">
        <EmptyState
          kind="first-use"
          icon="folder"
          title={`${name} is empty`}
          action={
            <Link href="/marketplace" className={buttonClasses({})}>
              Browse the marketplace
            </Link>
          }
        >
          Save products to this list from any product page, then request quotes for them together.
        </EmptyState>
        {canEdit ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirm(true);
            }}
          >
            <Icon name="trash" size={16} />
            Delete this list
          </Button>
        ) : null}
        <ConfirmDialog
          open={confirm}
          onOpenChange={setConfirm}
          tone="destructive"
          title={`Delete ${name}?`}
          description="The list goes for everyone in your company."
          confirmLabel="Delete list"
          onConfirm={drop}
        />
      </div>
    );
  }
  const ids = selected.filter((c) => c.live).map((c) => c.id);
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="error" title={error} live /> : null}
      <div className="flex flex-wrap items-center gap-3 rounded-card bg-mint px-4 py-3">
        <Checkbox
          label={chosen.length ? `${String(chosen.length)} selected` : "Select all"}
          checked={chosen.length === 0 ? false : chosen.length === cards.length ? true : "indeterminate"}
          onCheckedChange={(v) => {
            setChosen(v === true ? cards.map((c) => c.id) : []);
          }}
        />
        <span className="flex-1" />
        <Link
          href={`/rfq/new?products=${(ids.length ? ids : live.map((c) => c.id)).join(",")}`}
          className={buttonClasses({ size: "sm" })}
          aria-disabled={live.length === 0 || undefined}
        >
          {chosen.length ? "Request quotes for selected" : "Request quotes for this list"}
        </Link>
        <Link
          href={`/marketplace/compare?ids=${ids.join(",")}`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
          aria-disabled={ids.length < 2 || undefined}
        >
          <Icon name="compare" size={16} />
          Compare
        </Link>
        {canEdit ? (
          <Button variant="ghost" size="sm" disabled={!chosen.length || pending} onClick={remove}>
            Remove
          </Button>
        ) : null}
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <li key={c.id} className={c.live ? "" : "opacity-60"}>
            <ProductCard
              name={c.name}
              href={c.href}
              eyebrow={c.eyebrow}
              supplier={c.supplier.name}
              supplierVerified={c.supplier.verified}
              chips={c.live ? c.chips : ["No longer listed"]}
              leadTime={c.leadTime}
              renderLink={({ href, className, children }) => (
                <Link href={href} className={className}>
                  {children}
                </Link>
              )}
              actions={
                <span className="rounded-pill bg-page px-2 py-1">
                  <Checkbox
                    label={<span className="sr-only">Select {c.name}</span>}
                    checked={chosen.includes(c.id)}
                    onCheckedChange={(v) => {
                      toggle(c.id, v === true);
                    }}
                  />
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
