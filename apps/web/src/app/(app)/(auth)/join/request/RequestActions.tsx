"use client";

import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelAction, remindAction, requestToJoinAction, startSeparateCompany } from "../actions";

// Buttons of the Join request screens (365:27779).
export function RequestActions(props: {
  kind: "pending" | "rejected" | "expired";
  requestId: string;
  organisationId: string;
  adminEmail: string | null;
  remindedToday?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reminded, setReminded] = useState(props.remindedToday ?? false);
  const [note, setNote] = useState<{ tone: "success" | "error"; title: string }>();

  const run = async (work: () => Promise<{ ok: boolean; value?: string; code?: string }>) => {
    setBusy(true);
    setNote(undefined);
    const r = await work();
    setBusy(false);
    return r;
  };

  const separate = (
    <Button
      variant={props.kind === "rejected" ? "outline" : "ghost"}
      size="sm"
      disabled={busy}
      onClick={() =>
        void run(startSeparateCompany).then((r) => {
          if (r.ok && r.value) router.push(r.value);
        })
      }
    >
      Create a separate company
    </Button>
  );

  return (
    <>
      {note ? <Alert tone={note.tone} title={note.title} live /> : null}
      <div className="flex flex-wrap items-center gap-3">
        {props.kind === "pending" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || reminded}
              onClick={() =>
                void run(() => remindAction(props.requestId)).then((r) => {
                  if (r.ok || r.code === "REMINDER_TOO_SOON") setReminded(true);
                  setNote(
                    r.ok
                      ? { tone: "success", title: "Reminder sent" }
                      : r.code === "REMINDER_TOO_SOON"
                        ? { tone: "error", title: "You can send one reminder a day" }
                        : { tone: "error", title: "We couldn't send the reminder" },
                  );
                })
              }
            >
              Send a reminder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(() => cancelAction(props.requestId)).then((r) => {
                  if (r.ok && r.value) router.push(r.value);
                })
              }
            >
              Cancel request
            </Button>
          </>
        ) : null}
        {props.kind === "rejected" ? (
          <>
            {props.adminEmail ? (
              <Button asChild size="sm">
                <a href={`mailto:${props.adminEmail}`}>Contact the admin</a>
              </Button>
            ) : null}
            {separate}
          </>
        ) : null}
        {props.kind === "expired" ? (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(() => requestToJoinAction(props.organisationId)).then((r) => {
                  if (r.ok) router.refresh();
                })
              }
            >
              Send a new request
            </Button>
            {separate}
          </>
        ) : null}
      </div>
    </>
  );
}
