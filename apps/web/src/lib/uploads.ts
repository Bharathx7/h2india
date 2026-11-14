"use client";

import {
  FILE_KINDS,
  formatBytes,
  maxBytes,
  maxCount,
  typeList,
  uploadProblemMessage,
  type FileKind,
  type FileType,
} from "@h2india/config/files";
import { useCallback, useEffect, useRef, useState } from "react";

// Browser side of uploads (step 3.7): first check, start, PUT straight to storage with progress, then poll while the
// worker checks the file. Drives the File upload zone and File rows (18:164, 18:215, 505:329).

export type UploadState = "uploading" | "checking" | "uploaded" | "error";

export interface UploadItem {
  localId: string;
  name: string;
  bytes: number;
  state: UploadState;
  progress: number;
  problem?: string;
  fileId?: string;
  /** Proof for a signed-out uploader, sent back with the form. */
  key?: string;
  /** "PDF · 1.2 MB" */
  meta: string;
}

const SHORT: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/svg+xml": "SVG",
  "text/csv": "CSV",
};
const BY_EXTENSION: Record<string, FileType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  csv: "text/csv",
};

/** The type the browser reports, or one from the extension when it reports none. The server checks the bytes. */
function typeOf(file: File): string {
  if (file.type) return file.type;
  return BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

/** The first check, in the browser; the server repeats it and the worker checks the content. */
export function checkFile(kind: FileKind, file: File): string | undefined {
  if (!(FILE_KINDS[kind].types as readonly string[]).includes(typeOf(file))) {
    return uploadProblemMessage(kind, "type", { name: file.name });
  }
  if (file.size > maxBytes(kind)) return uploadProblemMessage(kind, "size", { name: file.name, bytes: file.size });
  if (file.size === 0) return `${file.name} is empty.`;
  return undefined;
}

export function uploadHint(kind: FileKind): string {
  const rule = FILE_KINDS[kind];
  return `${typeList(kind)}, up to ${String(rule.maxMb)} MB`;
}

interface Problem {
  error?: { message?: string };
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & Problem;
  if (!res.ok) throw new Error(body.error?.message ?? "Upload failed. Try again.");
  return body;
}

export function useUploads(kind: FileKind, opts: { organisationId?: string; max?: number } = {}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const live = useRef(new Map<string, { xhr?: XMLHttpRequest; stopped: boolean }>());

  useEffect(() => {
    const running = live.current;
    return () => {
      for (const job of running.values()) {
        job.stopped = true;
        job.xhr?.abort();
      }
    };
  }, []);

  const patch = useCallback((localId: string, change: Partial<UploadItem>) => {
    setItems((all) => all.map((i) => (i.localId === localId ? { ...i, ...change } : i)));
  }, []);

  const run = useCallback(
    async (localId: string, file: File) => {
      const job: { xhr?: XMLHttpRequest; stopped: boolean } = { stopped: false };
      live.current.set(localId, job);
      // Read through a function: remove() sets it from outside while this runs.
      const stopped = () => job.stopped;
      const fail = (problem: string) => {
        patch(localId, { state: "error", problem });
      };
      try {
        const type = typeOf(file);
        const started = await json<{ id: string; uploadUrl: string; key?: string; type: string }>(
          await fetch("/api/v1/files", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              kind,
              name: file.name,
              type,
              bytes: file.size,
              organisationId: opts.organisationId,
            }),
          }),
        );
        patch(localId, { fileId: started.id, key: started.key });
        const headers: Record<string, string> = started.key ? { "x-upload-key": started.key } : {};
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          job.xhr = xhr;
          xhr.open("PUT", started.uploadUrl);
          xhr.setRequestHeader("Content-Type", started.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) patch(localId, { progress: (e.loaded / e.total) * 100 });
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error("Upload failed. Check your connection and try again."));
          };
          xhr.onerror = () => {
            reject(new Error("Upload failed. Check your connection and try again."));
          };
          xhr.onabort = () => {
            reject(new Error("Upload cancelled."));
          };
          xhr.send(file);
        });
        if (stopped()) return;
        patch(localId, { state: "checking", progress: 100 });
        let view = await json<{ status: string; problem?: string }>(
          await fetch(`/api/v1/files/${started.id}/complete`, { method: "POST", headers }),
        );
        // The worker usually answers within seconds; give it up to two minutes.
        for (let wait = 0; view.status === "Checking" && wait < 120 && !stopped(); wait++) {
          await new Promise((r) => setTimeout(r, wait < 10 ? 700 : 1500));
          view = await json(await fetch(`/api/v1/files/${started.id}`, { headers, cache: "no-store" }));
        }
        if (stopped()) return;
        if (view.status === "Available") patch(localId, { state: "uploaded" });
        else if (view.status === "Rejected") fail(view.problem ?? "That file can't be used.");
        else fail("Still checking this file. Remove it and try again in a minute.");
      } catch (error) {
        if (!stopped()) fail(error instanceof Error ? error.message : "Upload failed. Try again.");
      } finally {
        live.current.delete(localId);
      }
    },
    [kind, opts.organisationId, patch],
  );

  const add = useCallback(
    (files: File[]): string | undefined => {
      const max = opts.max ?? maxCount(kind);
      const room = max - items.filter((i) => i.state !== "error").length;
      if (max > 1 && files.length > room) return uploadProblemMessage(kind, "count", { name: "" });
      const chosen = max === 1 ? files.slice(0, 1) : files;
      const next = chosen.map((file) => ({
        localId: `${String(Date.now())}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        bytes: file.size,
        state: "uploading" as const,
        progress: 0,
        meta: `${SHORT[typeOf(file)] ?? "File"} · ${formatBytes(file.size)}`,
      }));
      setItems((all) => (max === 1 ? next : [...all, ...next]));
      if (max === 1) {
        for (const job of live.current.values()) {
          job.stopped = true;
          job.xhr?.abort();
        }
      }
      next.forEach((item, i) => {
        const file = chosen[i];
        if (file) void run(item.localId, file);
      });
      return undefined;
    },
    [items, kind, opts.max, run],
  );

  const remove = useCallback((localId: string) => {
    const job = live.current.get(localId);
    if (job) {
      job.stopped = true;
      job.xhr?.abort();
    }
    setItems((all) => all.filter((i) => i.localId !== localId));
  }, []);

  return { items, add, remove, ready: items.length > 0 && items.every((i) => i.state === "uploaded") };
}
