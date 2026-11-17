"use client";

import { Alert, Button, FormField, Modal, Textarea } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setListingAction } from "./actions";

// Pause, Resume or Take down one listing (founder QC, 17 Nov 2026), with the reason the supplier is shown. Taking down
// is final (Archived); pausing can be undone here or by the supplier.

type To = "Paused" | "Live" | "Archived";
const WORDS: Record<To, { button: string; title: string; text: string; done: string }> = {
  Paused: {
    button: "Pause",
    title: "Pause",
    text: "It leaves the marketplace and search until it's resumed. The supplier can resume it too.",
    done: "paused",
  },
  Live: { button: "Resume", title: "Resume", text: "It goes back on the marketplace and search.", done: "live again" },
  Archived: {
    button: "Take down",
    title: "Take down",
    text: "It leaves the marketplace for good. The supplier can't bring it back; they would list it again.",
    done: "taken down",
  },
};

export function ListingStatus({ id, name, status }: { id: string; name: string; status: string }) {
  const router = useRouter();
  const [to, setTo] = useState<To | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const choices: To[] = status === "Live" ? ["Paused", "Archived"] : status === "Paused" ? ["Live", "Archived"] : [];
  if (!choices.length) return null;
  return (
    <span className="inline-flex gap-2">
      {choices.map((c) => (
        <Button
          key={c}
          size="sm"
          variant={c === "Archived" ? "ghost" : "outline"}
          onClick={() => {
            setTo(c);
            setReason("");
            setError("");
          }}
        >
          {WORDS[c].button}
          <span className="sr-only"> {name}</span>
        </Button>
      ))}
      {to ? (
        <Modal
          open
          onOpenChange={(o) => {
            if (!o) setTo(null);
          }}
          width={480}
          title={`${WORDS[to].title} ${name}?`}
          description={WORDS[to].text}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setTo(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={to === "Archived" ? "destructive" : "primary"}
                disabled={pending || !reason.trim()}
                onClick={() => {
                  start(async () => {
                    const r = await setListingAction(id, to, reason);
                    if (!r.ok) {
                      setError(r.error);
                      return;
                    }
                    setTo(null);
                    router.refresh();
                  });
                }}
              >
                {WORDS[to].button}
              </Button>
            </>
          }
        >
          {error ? <Alert tone="error" title={error} live /> : null}
          <FormField label="Why (the supplier sees this)" required>
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
      ) : null}
    </span>
  );
}
