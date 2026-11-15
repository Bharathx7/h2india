"use client";

import { Alert, Button, Drawer, Icon, Skeleton } from "@h2india/ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { openRfqThreadAction, type WireMessage } from "./actions";
import { Conversation } from "./Conversation";

// The message drawer on an RFQ page (561:252), step 9.7: the conversation with one company about this RFQ, without
// leaving the comparison. The full inbox stays at Messages.

export function MessageDrawer({
  rfqId,
  supplierId,
  withName,
  ownName,
  organisationId,
  about,
  inboxHref,
  label = "Message",
}: {
  rfqId: string;
  /** The supplier company of the thread (on the supplier side, the supplier's own company). */
  supplierId: string;
  withName: string;
  ownName: string;
  organisationId: string;
  about: string;
  inboxHref: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<{ id: string; messages: WireMessage[] } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const load = () => {
    setError("");
    start(async () => {
      const r = await openRfqThreadAction(rfqId, supplierId);
      if (r.ok) setThread({ id: r.threadId, messages: r.messages });
      else setError(r.error);
    });
  };
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          if (!thread) load();
        }}
      >
        <Icon name="message-square" size={14} />
        {label}
      </Button>
      <Drawer open={open} onOpenChange={setOpen} title={`Messages · ${withName}`} description={about}>
        <div className="flex h-full flex-col">
          <p className="border-b border-default px-6 py-2 type-caption text-secondary">About {about}</p>
          {error ? (
            <div className="flex flex-col gap-3 p-6">
              <Alert tone="error" title="This conversation didn't open">
                {error}
              </Alert>
              <span className="flex gap-2">
                <Button variant="outline" size="sm" onClick={load}>
                  Try again
                </Button>
                <Link href={inboxHref} className="inline-flex items-center px-2 type-label underline">
                  Open Messages
                </Link>
              </span>
            </div>
          ) : thread ? (
            <Conversation
              threadId={thread.id}
              start={thread.messages}
              organisationId={organisationId}
              withName={withName}
              ownName={ownName}
            />
          ) : (
            <div
              className="flex flex-col gap-3 p-6"
              role="status"
              aria-busy={pending}
              aria-label="Loading the conversation"
            >
              <Skeleton kind="text" />
              <Skeleton kind="card" />
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
