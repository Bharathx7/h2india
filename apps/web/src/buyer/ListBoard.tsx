"use client";

import type { ListCard } from "@h2india/core/buyer";
import {
  Alert,
  Button,
  buttonClasses,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  FormField,
  Icon,
  Input,
  Modal,
  ProductCard,
} from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type SyntheticEvent } from "react";
import { deleteListAction, newListAction, removeFromListAction, renameListAction } from "./actions";

// Project lists (78:2628; New list 275:23517), step 9.1: chips for the company's lists, then the chosen list's products
// with a selection bar. Request quotes takes the selection to the RFQ wizard. No price anywhere.
// Founder QC (17 Nov 2026): lists can be renamed and deleted (with a confirmation, even with products in them), a new
// list opens straight away, Request quotes fills the wizard from the list, Compare needs two products, and products
// are added from any product page with Save to project list.

/** Name a list: New list and Rename share it. Enter saves. */
function NameDialog({
  open,
  onOpenChange,
  title,
  start,
  action,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  start: string;
  action: string;
  onSave: (name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(start);
  const [error, setError] = useState("");
  const [pending, run] = useTransition();
  const submit = (e?: SyntheticEvent) => {
    e?.preventDefault();
    run(async () => {
      const problem = await onSave(name);
      if (problem) setError(problem);
      else setError("");
    });
  };
  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setName(start);
      }}
      width={480}
      title={title}
      description="Everyone in your company can see your lists."
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={pending || !name.trim()}
            onClick={() => {
              submit();
            }}
          >
            {action}
          </Button>
        </div>
      }
    >
      {error ? <Alert tone="error" title={error} live /> : null}
      <form onSubmit={submit}>
        <FormField label="List name">
          <Input
            value={name}
            maxLength={80}
            placeholder="Talegaon pilot"
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
        </FormField>
      </form>
    </Modal>
  );
}

export function NewList({ label = "New list" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
      <NameDialog
        open={open}
        onOpenChange={setOpen}
        title="New list"
        start=""
        action="Create list"
        onSave={async (name) => {
          const r = await newListAction(name);
          if (!r.ok) return r.error;
          setOpen(false);
          router.push(r.id ? `/buyer/lists?list=${r.id}` : "/buyer/lists");
          router.refresh();
          return null;
        }}
      />
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
  const [renaming, setRenaming] = useState(false);
  const [pending, start] = useTransition();
  const live = cards.filter((c) => c.live);
  const chosenLive = live.filter((c) => chosen.includes(c.id));
  // The selection, or the whole list when nothing is ticked; products no longer listed can't be quoted or compared.
  const forQuote = chosenLive.length ? chosenLive : live;
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

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="type-h3">{name}</h2>
        <p className="type-caption text-secondary">
          {cards.length} {cards.length === 1 ? "product" : "products"}
          {cards.length > live.length ? ` · ${String(cards.length - live.length)} no longer listed` : ""}
        </p>
      </div>
      {canEdit ? (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setRenaming(true);
            }}
          >
            <Icon name="pencil" size={16} />
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfirm(true);
            }}
          >
            <Icon name="trash" size={16} />
            Delete list
          </Button>
        </div>
      ) : null}
      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename list"
        start={name}
        action="Save name"
        onSave={async (next) => {
          const r = await renameListAction(listId, next);
          if (!r.ok) return r.error;
          setRenaming(false);
          router.refresh();
          return null;
        }}
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="destructive"
        title={`Delete ${name}?`}
        description={
          cards.length
            ? `The list and its ${String(cards.length)} saved ${cards.length === 1 ? "product" : "products"} go for everyone in your company. The products stay on the marketplace.`
            : "The list goes for everyone in your company."
        }
        confirmLabel="Delete list"
        onConfirm={drop}
      />
    </div>
  );

  if (!cards.length) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <EmptyState
          kind="first-use"
          icon="folder"
          title="No products in this list yet"
          action={
            <Link href="/marketplace" className={buttonClasses({})}>
              Browse the marketplace
            </Link>
          }
        >
          On any product page, choose Save to project list and pick {name}. Then compare them or request quotes for them
          together.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {header}
      {error ? <Alert tone="error" title={error} live /> : null}
      {!canEdit ? (
        <p className="type-body-sm text-secondary">
          Your role can see lists but not change them or request quotes. Ask your company admin.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 rounded-card bg-mint px-4 py-3">
        <Checkbox
          label={chosen.length ? `${String(chosen.length)} selected` : "Select all"}
          checked={chosen.length === 0 ? false : chosen.length === live.length ? true : "indeterminate"}
          disabled={!live.length}
          onCheckedChange={(v) => {
            setChosen(v === true ? live.map((c) => c.id) : []);
          }}
        />
        <span className="flex-1" />
        {canEdit ? (
          <Button
            size="sm"
            disabled={!forQuote.length}
            onClick={() => {
              router.push(`/rfq/new?from=list&products=${forQuote.map((c) => c.slug).join(",")}`);
            }}
          >
            {chosenLive.length ? "Request quotes for selected" : "Request quotes for this list"}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          disabled={chosenLive.length < 2}
          title={chosenLive.length < 2 ? "Select two or more products to compare" : undefined}
          onClick={() => {
            router.push(`/marketplace/compare?ids=${chosenLive.map((c) => c.id).join(",")}`);
          }}
        >
          <Icon name="compare" size={16} />
          Compare
        </Button>
        {canEdit ? (
          <Button variant="ghost" size="sm" disabled={!chosen.length || pending} onClick={remove}>
            Remove
          </Button>
        ) : null}
      </div>
      <p className="-mt-2 type-caption text-secondary">Compare works for two or more products in one category.</p>
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
