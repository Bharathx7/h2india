"use client";

import { Alert, Button, FormField, Icon, Input, Modal, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveRecordAction, purgeRecordAction, restoreRecordAction } from "./record-actions";

// Archive and Restore (founder QC, 17 Nov 2026). Archiving asks for a reason and a confirmation; the record leaves the
// site, search and the lists, and stays under Archived to be restored. Nothing is deleted.

export function ArchiveRecord({
  slug,
  id,
  name,
  after,
}: {
  slug: string;
  id: number;
  name: string;
  /** Where to go once archived (the list). */
  after: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Icon name="folder" size={16} />
        Archive
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Archive ${name}?`}
        description="It leaves the site, search and this list. You can restore it from Archived; nothing is deleted."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !reason.trim()}
              onClick={() => {
                start(async () => {
                  const r = await archiveRecordAction(slug, id, reason);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  router.push(after);
                  router.refresh();
                });
              }}
            >
              Archive
            </Button>
          </>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <FormField label="Why (kept in the audit log)" required>
          <Textarea
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </>
  );
}

export function RestoreRecord({ slug, id, name }: { slug: string; id: number; name: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await restoreRecordAction(slug, id);
            setError(r.ok ? "" : r.error);
            router.refresh();
          });
        }}
      >
        Restore<span className="sr-only"> {name}</span>
      </Button>
      {error ? <span className="type-caption text-error">{error}</span> : null}
    </span>
  );
}

/**
 * Delete permanently (A198). Shown only to a Super admin (content.purge): a reason, and the record's name typed to
 * confirm. The server checks the type's condition again (cms/purge-rules.ts) and refuses with the reason when it isn't
 * met, for example "Archive it first" or "It's still used by 3 records".
 */
export function PurgeRecord({
  slug,
  id,
  name,
  after,
  size = "md",
}: {
  slug: string;
  id: number;
  name: string;
  /** Where to go once deleted (the list); when absent, the current page refreshes. */
  after?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        size={size}
        onClick={() => {
          setError("");
          setTyped("");
          setOpen(true);
        }}
      >
        <Icon name="trash" size={size === "sm" ? 14 : 16} />
        Delete permanently<span className="sr-only"> {name}</span>
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title={`Delete ${name} permanently?`}
        description="It's removed from the site, search and the CMS for good. This can't be undone; the audit log keeps who deleted it, when and why."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !reason.trim() || !typed.trim()}
              onClick={() => {
                start(async () => {
                  const r = await purgeRecordAction(slug, id, reason, typed);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  if (after) router.push(after);
                  router.refresh();
                });
              }}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <FormField label="Why (kept in the audit log)" required>
          <Textarea
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </FormField>
        <FormField label={`Type "${name}" to confirm`} required>
          <Input
            autoComplete="off"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </>
  );
}
