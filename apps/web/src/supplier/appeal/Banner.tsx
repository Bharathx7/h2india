"use client";

import { Alert, Button, FormField, Modal, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { appealAction } from "./actions";

// Suspended company banner and Appeal (G10; built from the design system, A178). Listings are hidden from the
// marketplace and search while the suspension lasts.
export function SuspendedBanner({
  reason,
  appeal,
  canAppeal,
}: {
  reason: string | null;
  appeal: { status: string; note: string | null } | null;
  canAppeal: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const waiting = appeal?.status === "Open";
  return (
    <Alert
      tone="error"
      layout="banner"
      title="Your company is suspended. Your listings are hidden from buyers."
      action={
        canAppeal && !waiting ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(true);
            }}
          >
            Appeal
          </Button>
        ) : undefined
      }
    >
      {reason ? `Reason: ${reason}. ` : ""}
      {waiting
        ? "Your appeal is with H2 India. We'll tell you the decision."
        : appeal?.status === "Upheld"
          ? `Your last appeal was not accepted: ${appeal.note ?? ""}`
          : "If you think this is a mistake, appeal and H2 India will review it."}
      <Modal
        open={open}
        onOpenChange={setOpen}
        width={480}
        title="Appeal the suspension"
        description="Tell us why the suspension should be lifted and what you've done about the reason. A person at H2 India reviews it."
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
            <Button
              disabled={pending || text.trim().length < 20}
              onClick={() => {
                start(async () => {
                  const r = await appealAction(text);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              Send appeal
            </Button>
          </div>
        }
      >
        {error ? <Alert tone="error" title={error} live /> : null}
        <FormField label="Your appeal" required>
          <Textarea
            rows={5}
            maxLength={2000}
            showCount
            value={text}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
        </FormField>
      </Modal>
    </Alert>
  );
}
