"use client";

import { AlertDialog as RAlert, Dialog as RDialog } from "radix-ui";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../icons/Icon";
import { cx } from "../lib/cx";
import { Button } from "./Button";

const SCRIM = "fixed inset-0 z-40 bg-ink-900/45";

/** Controlled overlays have no Radix trigger, so remember what had focus and return to it on close. */
function useReturnFocus(open: boolean) {
  const last = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) last.current = document.activeElement;
  }, [open]);
  return (event: Event) => {
    if (last.current && document.contains(last.current)) {
      event.preventDefault();
      last.current.focus();
    }
  };
}

/* Figma "Confirm dialog" (22:340): for destructive or irreversible actions only. Shown over a 45% ink-900
   scrim; Esc and Cancel close it; focus returns to the trigger (Radix does this). */

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "neutral" | "destructive";
  /** Extra content, for example a required reason (Textarea in a FormField). */
  children?: ReactNode;
  confirmDisabled?: boolean;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "neutral",
  children,
  confirmDisabled,
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  const returnFocus = useReturnFocus(open);
  return (
    <RAlert.Root open={open} onOpenChange={onOpenChange}>
      <RAlert.Portal>
        <RAlert.Overlay className={SCRIM} />
        <RAlert.Content
          onCloseAutoFocus={returnFocus}
          className={cx(
            "fixed top-1/2 left-1/2 z-50 flex w-120 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4",
            "rounded-modal bg-page p-6 shadow-ink-float",
          )}
        >
          <div className="flex items-start gap-3">
            <RAlert.Title className="flex-1 type-h3">{title}</RAlert.Title>
            <RAlert.Cancel aria-label="Close" className="rounded-control text-icon-secondary hover:text-icon-primary">
              <Icon name="x" size={24} />
            </RAlert.Cancel>
          </div>
          <RAlert.Description asChild>
            <div className="type-body text-body">{description}</div>
          </RAlert.Description>
          {children}
          <div className="flex flex-wrap justify-end gap-3">
            <RAlert.Cancel asChild>
              <Button variant="outline">{cancelLabel}</Button>
            </RAlert.Cancel>
            <Button
              variant={tone === "destructive" ? "destructive" : "primary"}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </Button>
          </div>
        </RAlert.Content>
      </RAlert.Portal>
    </RAlert.Root>
  );
}

/* Figma "Drawer" (22:341): right drawer for filters on tablet and mobile, quick views and review notes.
   400 px wide (full width on small phones); content is a slot. */

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Element that opens the drawer, if it is not controlled from elsewhere. */
  trigger?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  description?: string;
}

export function Drawer({ open, onOpenChange, title, trigger, footer, children, description }: DrawerProps) {
  const returnFocus = useReturnFocus(open);
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RDialog.Trigger asChild>{trigger}</RDialog.Trigger> : null}
      <RDialog.Portal>
        <RDialog.Overlay className={SCRIM} />
        <RDialog.Content
          onCloseAutoFocus={trigger ? undefined : returnFocus}
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-y-0 right-0 z-50 flex w-100 max-w-full flex-col bg-page shadow-ink-float"
        >
          <div className="flex items-center border-b border-default px-6 py-5">
            <RDialog.Title className="flex-1 type-h3">{title}</RDialog.Title>
            <RDialog.Close aria-label="Close" className="rounded-control text-icon-secondary hover:text-icon-primary">
              <Icon name="x" size={24} />
            </RDialog.Close>
          </div>
          {description ? <RDialog.Description className="sr-only">{description}</RDialog.Description> : null}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? <div className="flex justify-end gap-3 border-t border-default px-6 py-4">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
