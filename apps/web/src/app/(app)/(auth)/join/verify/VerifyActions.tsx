"use client";

import { JOIN } from "@h2india/core/companies/client";
import { Alert, Button } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { resendLink } from "../actions";

// Resend email / Change email (527:158) and Send a new link (527:192).
export function VerifyActions({ mode, canSend }: { mode: "sent" | "expired"; canSend: boolean }) {
  const router = useRouter();
  const [resendAt, setResendAt] = useState(() => (mode === "sent" ? Date.now() + JOIN.linkResendSeconds * 1000 : 0));
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error"; title: string; body?: string }>();

  useEffect(() => {
    if (resendAt <= now) return;
    const t = setTimeout(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearTimeout(t);
    };
  }, [resendAt, now]);

  const send = async () => {
    setBusy(true);
    setNote(undefined);
    const r = await resendLink();
    setBusy(false);
    if (r.ok) {
      const at = Date.now();
      setNow(at);
      setResendAt(at + JOIN.linkResendSeconds * 1000);
      if (mode === "expired") router.push("/join/verify");
      else setNote({ tone: "success", title: "We sent a new link" });
      return;
    }
    setNote({ tone: "error", title: "We couldn't send the link", body: "Wait a minute and try again." });
  };

  const waiting = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const clock = `${String(Math.floor(waiting / 60))}:${String(waiting % 60).padStart(2, "0")}`;

  if (mode === "expired") {
    return (
      <>
        {note ? (
          <Alert tone={note.tone} title={note.title} live>
            {note.body}
          </Alert>
        ) : null}
        <Button size="lg" className="w-full" disabled={busy || !canSend} onClick={() => void send()}>
          Send a new link
        </Button>
      </>
    );
  }
  return (
    <>
      {note ? (
        <Alert tone={note.tone} title={note.title} live>
          {note.body}
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" disabled={busy || waiting > 0 || !canSend} onClick={() => void send()}>
          Resend email
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            router.push("/join");
          }}
        >
          Change email
        </Button>
      </div>
      <p className="type-caption text-secondary">
        Didn&apos;t get it? Check your spam folder.{waiting > 0 ? ` You can resend in ${clock}.` : ""}
      </p>
    </>
  );
}
