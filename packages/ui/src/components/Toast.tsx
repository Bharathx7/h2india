"use client";

import { Toast as RToast } from "radix-ui";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";
import { cx } from "../lib/cx";

// Figma "Toast" (20:281): finished actions, three lines at most. Errors stay until dismissed; success and
// info close after 4 s; Undo for reversible actions.

export type ToastTone = "success" | "error" | "info";

export interface ToastOptions {
  tone?: ToastTone;
  title: string;
  body?: string;
  /** For reversible actions, for example { label: "Undo", onClick }. */
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
}

const TONE: Record<ToastTone, { icon: IconName; colour: string; word: string }> = {
  success: { icon: "check-circle", colour: "text-icon-success", word: "Success" },
  error: { icon: "alert-circle", colour: "text-icon-error", word: "Error" },
  info: { icon: "info", colour: "text-icon-link", word: "Information" },
};

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

/** Show a toast from anywhere under <Toaster>. */
export function useToast(): (options: ToastOptions) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <Toaster>");
  return show;
}

/** Place once near the root of each area. Toasts stack at the bottom right (bottom centre on phones). */
export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((options: ToastOptions) => {
    setItems((all) => [...all, { ...options, id: Date.now() + Math.random() }]);
  }, []);
  const remove = useCallback((id: number) => {
    setItems((all) => all.filter((t) => t.id !== id));
  }, []);
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      <RToast.Provider swipeDirection="right" label="Notifications (F8)">
        {children}
        {items.map((t) => {
          const tone = TONE[t.tone ?? "success"];
          return (
            <RToast.Root
              key={t.id}
              duration={t.tone === "error" ? Infinity : 4000}
              type={t.tone === "error" ? "foreground" : "background"}
              onOpenChange={(open) => {
                if (!open) remove(t.id);
              }}
              className={cx(
                "flex w-full items-start gap-3 rounded-card border border-default bg-page px-4 py-3.5 shadow-ink-float-sm",
                "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=end]:animate-none",
              )}
            >
              <Icon name={tone.icon} size={20} label={tone.word} className={cx("mt-px", tone.colour)} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <RToast.Title className="type-label text-primary">{t.title}</RToast.Title>
                {t.body ? (
                  <RToast.Description className="line-clamp-2 type-body-sm text-body">{t.body}</RToast.Description>
                ) : null}
              </div>
              {t.action ? (
                <RToast.Action altText={t.action.label} asChild>
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="rounded-control type-label text-link hover:text-link-hover"
                  >
                    {t.action.label}
                  </button>
                </RToast.Action>
              ) : null}
              <RToast.Close
                aria-label="Dismiss"
                className="rounded-control text-icon-secondary hover:text-icon-primary"
              >
                <Icon name="x" size={20} />
              </RToast.Close>
            </RToast.Root>
          );
        })}
        <RToast.Viewport className="fixed right-0 bottom-0 z-50 m-0 flex w-full max-w-full list-none flex-col gap-3 p-4 outline-none sm:right-6 sm:bottom-6 sm:w-95 sm:p-0" />
      </RToast.Provider>
    </ToastContext.Provider>
  );
}
