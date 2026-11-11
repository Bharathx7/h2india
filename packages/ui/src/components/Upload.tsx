"use client";

import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "File upload" (18:164): drag-and-drop zone for verification documents, certificates and quote
// attachments. Dashed 1.5 px border (6 on, 4 off). States: default, drag over, error.

export interface FileUploadProps {
  /** Called with the chosen files after the size and type checks pass. */
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Largest file in MB; larger files raise the error state. */
  maxSizeMb?: number;
  label?: ReactNode;
  hint?: ReactNode;
  /** Error from the caller (for example a failed upload). The zone's own size check sets one too. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onFiles,
  accept = ".pdf,.jpg,.jpeg,.png",
  multiple = true,
  maxSizeMb = 10,
  label = "Drop files here or browse",
  hint = `PDF, JPG or PNG, up to ${maxSizeMb} MB each`,
  error,
  disabled,
  className,
}: FileUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [ownError, setOwnError] = useState<string | undefined>();
  const shownError = error ?? ownError;

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    const tooBig = files.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setOwnError(`${tooBig.name} is over ${maxSizeMb} MB. Upload a smaller PDF, JPG or PNG.`);
      return;
    }
    setOwnError(undefined);
    onFiles(files);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setOver(false);
    if (!disabled) take(event.dataTransfer.files);
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => {
        setOver(false);
      }}
      onDrop={onDrop}
      data-state={shownError ? "error" : over ? "over" : "default"}
      className={cx(
        "relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-card px-6 py-8 text-center",
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-(color:--border-color-focus)",
        over ? "bg-mint" : "bg-page",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
    >
      {/* The dashed border: CSS cannot set dash lengths, so it is drawn as an SVG rectangle. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-[0.75px] left-[0.75px] size-[calc(100%-1.5px)] overflow-visible"
      >
        <rect
          width="100%"
          height="100%"
          rx="11.25"
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          className={cx(shownError ? "stroke-error" : over ? "stroke-fresh-600" : "stroke-ink-500")}
        />
      </svg>
      <Icon name="upload" size={24} className={shownError ? "text-icon-error" : "text-icon-primary"} />
      <span className="type-label text-primary">{label}</span>
      <span className={cx("type-caption", shownError ? "text-error" : "text-secondary")} aria-live="polite">
        {shownError ?? hint}
      </span>
      <input
        ref={input}
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-invalid={shownError ? true : undefined}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

// Figma "File row" (18:215): one uploaded file with its status. Icon and words carry the state, not colour alone.

export type FileRowStatus = "uploading" | "uploaded" | "error";

export interface FileRowProps {
  name: string;
  status: FileRowStatus;
  /** 0 to 100 while uploading. */
  progress?: number;
  /** For example "PDF · 1.2 MB". */
  meta?: string;
  error?: string;
  /** Remove the file, or cancel while uploading. */
  onRemove?: () => void;
  className?: string;
}

export function FileRow({
  name,
  status,
  progress = 0,
  meta,
  error = "Upload failed. Try again.",
  onRemove,
  className,
}: FileRowProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-card border bg-page px-4 py-3",
        status === "error" ? "border-error" : "border-default",
        className,
      )}
    >
      <Icon name="file-text" size={24} className="text-icon-secondary" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate type-label text-primary">{name}</span>
        <span className={cx("type-caption", status === "error" ? "text-error" : "text-secondary")}>
          {status === "uploading" ? `Uploading · ${pct}%` : status === "error" ? error : meta}
        </span>
        {status === "uploading" ? (
          <span
            role="progressbar"
            aria-label={`Uploading ${name}`}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-0.5 block h-1 w-full overflow-hidden rounded-[2px] bg-subtle"
          >
            <span className="block h-full rounded-[2px] bg-fresh-600 transition-[width]" style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </div>
      {status === "uploading" ? (
        <Icon name="loader" size={24} className="animate-spin text-icon-secondary motion-reduce:animate-none" />
      ) : status === "uploaded" ? (
        <Icon name="check-circle" size={24} label="Uploaded" className="text-icon-success" />
      ) : (
        <Icon name="alert-circle" size={24} label="Upload failed" className="text-icon-error" />
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={status === "uploading" ? `Cancel uploading ${name}` : `Remove ${name}`}
          className="rounded-control text-icon-secondary hover:text-icon-primary"
        >
          <Icon name="x" size={20} />
        </button>
      ) : null}
    </div>
  );
}
