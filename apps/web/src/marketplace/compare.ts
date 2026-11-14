"use client";

import { COMPARE_LIMIT } from "@h2india/core/products/rules";
import { useCallback, useEffect, useSyncExternalStore } from "react";

// The compare selection (steps 6.3 and 6.5): kept in this browser's storage so it survives moving between pages; a
// signed-in copy on the server joins with step 6.5. Up to COMPARE_LIMIT products. Storage can be missing (private
// windows): the selection then lasts for the page only.

export interface CompareItem {
  id: string;
  name: string;
  /** The category slug: compare works within one category. */
  category: string;
}

const KEY = "h2_compare";
const listeners = new Set<() => void>();
let memory: CompareItem[] = [];
let cached: { raw: string | null; items: CompareItem[] } = { raw: null, items: [] };

function read(): CompareItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cached.raw) return cached.items;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(parsed) ? (parsed as CompareItem[]).slice(0, COMPARE_LIMIT) : [];
    cached = { raw, items };
    return items;
  } catch {
    return memory;
  }
}

function write(items: CompareItem[]) {
  memory = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage blocked: keep the in-memory copy.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: CompareItem[] = [];

export function useCompare() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);
  /** Adds or removes; refuses past the limit and returns why. */
  const toggle = useCallback(
    (item: CompareItem): string | null => {
      if (items.some((i) => i.id === item.id)) {
        write(items.filter((i) => i.id !== item.id));
        return null;
      }
      if (items.length >= COMPARE_LIMIT)
        return `You can compare up to ${String(COMPARE_LIMIT)} products. Remove one first.`;
      write([...items, item]);
      return null;
    },
    [items],
  );
  const remove = useCallback((id: string) => {
    write(read().filter((i) => i.id !== id));
  }, []);
  const clear = useCallback(() => {
    write([]);
  }, []);
  return { items, has, toggle, remove, clear, limit: COMPARE_LIMIT };
}

/**
 * Copies the selection to the server for a signed-in person whenever it changes (step 6.5). Rendered once on pages
 * that change the selection. Nothing is sent for people who aren't signed in.
 */
export function useCompareSync(signedIn: boolean, save: (ids: string[]) => Promise<void>) {
  const { items } = useCompare();
  const key = items.map((i) => i.id).join(",");
  useEffect(() => {
    if (!signedIn) return;
    void save(key ? key.split(",") : []);
  }, [signedIn, key, save]);
}

/** Replaces the selection, for example with the server copy or the products in a compare link. */
export function setCompare(items: CompareItem[]) {
  write(items.slice(0, COMPARE_LIMIT));
}
