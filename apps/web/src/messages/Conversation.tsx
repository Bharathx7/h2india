"use client";

import { Alert, Button, FileRow, FileUpload, Icon, Textarea } from "@h2india/ui";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkFile, uploadHint, useUploads } from "@/lib/uploads";
import { pollAction, sendMessageAction, type WireMessage } from "./actions";

// A conversation (572:8 right pane, 573:467 on phones): messages, new ones every few seconds without a reload, and the
// composer with attachments. A failed send keeps the text (573:571 "Your message wasn't sent").

const POLL_MS = 4000;
const time = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export function Conversation({
  threadId,
  start,
  organisationId,
  withName,
  ownName,
}: {
  threadId: string;
  start: WireMessage[];
  organisationId: string;
  withName: string;
  ownName: string;
}) {
  const [list, setList] = useState(start);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, run] = useTransition();
  const uploads = useUploads("quote_attachment", { organisationId, max: 5 });
  const end = useRef<HTMLDivElement>(null);
  const last = list[list.length - 1]?.at ?? null;

  useEffect(() => {
    let live = true;
    const tick = async () => {
      const more = await pollAction(threadId, last);
      if (live && more.length) setList((x) => [...x, ...more.filter((m) => !x.some((y) => y.id === m.id))]);
    };
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [threadId, last]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  const files = uploads.items.filter((i) => i.state === "uploaded" && i.fileId).map((i) => i.fileId ?? "");
  const send = () => {
    run(async () => {
      const r = await sendMessageAction(threadId, text, files);
      if (!r.ok) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setText("");
      for (const i of uploads.items) uploads.remove(i.localId);
      const more = await pollAction(threadId, last);
      setList((x) => [...x, ...more.filter((m) => !x.some((y) => y.id === m.id))]);
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 overflow-y-auto p-4" aria-live="polite" aria-label="Messages">
        <div className="rounded-card bg-mint p-3">
          <p className="flex items-center gap-2 type-label">
            <Icon name="info" size={16} />
            Keep conversations on H2 India
          </p>
          <p className="type-caption text-body">
            Deals agreed off the platform aren&apos;t protected by H2 India payments or disputes.
          </p>
        </div>
        {list.map((m) => (
          <div key={m.id} className={m.mine ? "flex flex-col items-end" : "flex flex-col items-start"}>
            <span className="type-caption text-secondary">
              {m.mine ? "You" : m.author} · {time(m.at)}
            </span>
            <div className={m.mine ? "max-w-[80%] rounded-card bg-mint p-3" : "max-w-[80%] rounded-card bg-subtle p-3"}>
              {m.body ? <p className="type-body-sm whitespace-pre-wrap">{m.body}</p> : null}
              {m.files.map((f) =>
                f.status === "Available" ? (
                  <a
                    key={f.id}
                    href={`/api/v1/files/${f.id}/link`}
                    className="mt-2 flex items-center gap-2 rounded-input bg-page p-2 type-label"
                  >
                    <Icon name="file-text" size={16} />
                    {f.name}
                    <Icon name="download" size={14} />
                  </a>
                ) : (
                  <span key={f.id} className="mt-2 flex items-center gap-2 type-caption text-secondary">
                    <Icon name="loader" size={14} />
                    {f.name} · being checked
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="flex flex-col gap-2 border-t border-default p-4">
        {failed ? (
          <Alert tone="error" title="Your message wasn't sent" live>
            Check your connection. Your text is still in the box.{" "}
            <button type="button" className="underline" onClick={send}>
              Send again
            </button>
          </Alert>
        ) : null}
        {uploads.items.map((i) => (
          <FileRow
            key={i.localId}
            name={i.name}
            status={i.state}
            progress={i.progress}
            meta={i.meta}
            error={i.problem}
            onRemove={() => {
              uploads.remove(i.localId);
            }}
          />
        ))}
        <details>
          <summary className="cursor-pointer type-label">Attach a file</summary>
          <FileUpload
            multiple
            label="Drop files here or browse"
            hint={uploadHint("quote_attachment")}
            check={(file) => checkFile("quote_attachment", file)}
            onFiles={(f) => {
              uploads.add(f);
            }}
          />
        </details>
        <div className="flex items-end gap-2">
          <Textarea
            aria-label={`Write a message to ${withName}`}
            placeholder={`Write a message to ${withName}`}
            rows={1}
            value={text}
            maxLength={4000}
            onChange={(e) => {
              setText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button disabled={pending || (!text.trim() && !files.length)} onClick={send}>
            Send
          </Button>
        </div>
        <p className="type-caption text-secondary">
          Only {ownName} and {withName} can see this conversation. Files up to 10 MB.
        </p>
      </div>
    </div>
  );
}
