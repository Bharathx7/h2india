"use client";

import { Alert, Button, Icon } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkFile, useUploads } from "@/lib/uploads";
import { setAccountPhotoAction } from "./actions";

// Profile picture on Account (founder, 20 Nov 2026): one picture for every workspace, shown on the person's avatar.
// It goes through the normal upload (checked for viruses) and is saved as soon as it's ready.

export function PhotoControl({ initials, photoUrl }: { initials: string; photoUrl: string | null }) {
  const router = useRouter();
  const photo = useUploads("profile_photo", { max: 1 });
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, start] = useTransition();
  const uploaded = photo.items.find((i) => i.state === "uploaded");
  const failed = photo.items.find((i) => i.state === "error")?.problem;
  const busy = pending || photo.items.some((i) => i.state !== "uploaded" && i.state !== "error");

  // Saved as soon as the upload is checked and ready.
  const savedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!uploaded?.fileId || savedFor.current === uploaded.fileId) return;
    savedFor.current = uploaded.fileId;
    const fileId = uploaded.fileId;
    start(async () => {
      const r = await setAccountPhotoAction(fileId);
      if (r.ok) {
        setNotice("Picture saved.");
        for (const i of photo.items) photo.remove(i.localId);
        router.refresh();
      } else setProblem(r.error);
    });
  }, [uploaded, photo, router]);

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-tint type-h3 text-primary">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a 5-minute private storage link
          <img src={photoUrl} alt="Your profile picture" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        aria-label="Upload a profile picture"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setNotice("");
          const p = checkFile("profile_photo", file);
          if (p) setProblem(p);
          else {
            setProblem("");
            photo.add([file]);
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-1">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          <Icon name="upload" size={14} />
          {busy ? "Uploading…" : photoUrl ? "Change picture" : "Upload picture"}
        </Button>
        {photoUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setNotice("");
              start(async () => {
                const r = await setAccountPhotoAction(null);
                if (r.ok) {
                  setNotice("Picture removed.");
                  router.refresh();
                } else setProblem(r.error);
              });
            }}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {problem || failed ? (
        <Alert tone="error" title={problem || failed || ""} live />
      ) : notice ? (
        <p role="status" className="type-caption text-secondary">
          {notice}
        </p>
      ) : (
        <p className="type-caption text-secondary">JPG or PNG, square, up to 2 MB.</p>
      )}
    </div>
  );
}
