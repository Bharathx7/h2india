"use client";

import { Alert, Button, FormField, Icon, Input, Modal, Radio, RadioGroup } from "@h2india/ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { listsForProductAction, saveToListAction } from "./actions";

// Save to project list (founder QC, 17 Nov 2026): on a product page, a buyer picks one of the company's project lists
// or names a new one. Before this, "Save to list" went to the member's personal Saved page and no product could reach
// a project list at all.

type ListOption = { id: string; name: string; count: number; has: boolean };

export function SaveToList({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListOption[] | null>(null);
  const [choice, setChoice] = useState<string>("new");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  /** The public site has no toasts, so the confirmation shows under the button. */
  const [saved, setSaved] = useState("");

  const show = () => {
    setOpen(true);
    setError("");
    start(async () => {
      const found = await listsForProductAction(productId);
      setLists(found);
      setChoice(found.find((l) => !l.has)?.id ?? "new");
    });
  };

  const save = () => {
    start(async () => {
      const r = await saveToListAction(choice === "new" ? { newName: name, productId } : { listId: choice, productId });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const listName = choice === "new" ? name.trim() : (lists?.find((l) => l.id === choice)?.name ?? "your list");
      setSaved(listName);
      setOpen(false);
      setName("");
    });
  };

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={show}
        className="inline-flex cursor-pointer items-center gap-2 rounded-control px-2 py-1 type-label text-primary hover:bg-subtle"
      >
        <Icon name="folder" size={18} />
        Save to project list
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Save to project list"
        description={`Add ${productName} to a list your company shares, to compare or request quotes later.`}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/buyer/lists" className="type-label text-link">
              Open project lists
            </Link>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button disabled={pending || lists === null || (choice === "new" && !name.trim())} onClick={save}>
                Save
              </Button>
            </div>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        {lists === null ? (
          <p role="status" className="type-body-sm text-secondary">
            Loading your lists…
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <RadioGroup aria-label="Choose a list" value={choice} onValueChange={setChoice}>
              {lists.map((l) => (
                <Radio
                  key={l.id}
                  value={l.id}
                  disabled={l.has}
                  label={`${l.name} · ${String(l.count)} ${l.count === 1 ? "product" : "products"}${l.has ? " · already saved" : ""}`}
                />
              ))}
              <Radio value="new" label="A new list" />
            </RadioGroup>
            {choice === "new" ? (
              <FormField label="List name">
                <Input
                  value={name}
                  maxLength={80}
                  placeholder="For example Pune plant expansion"
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                />
              </FormField>
            ) : null}
          </div>
        )}
      </Modal>
      {saved ? (
        <span role="status" className="type-caption text-secondary">
          Saved to {saved} ·{" "}
          <Link href="/buyer/lists" className="text-link underline">
            Open
          </Link>
        </span>
      ) : null}
    </span>
  );
}
