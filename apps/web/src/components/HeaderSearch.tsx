"use client";

import { SearchOverlay, type SearchOverlayGroup, type SearchOverlayState } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { quoteHrefFor, searchPageHref } from "@/search/present";

// The header search overlay (step 5.2; 372:16695, 372:16870, 372:16991). Opened by the header's search trigger, by "/"
// (SiteHeader), and by the home hero for news, schemes and tenders (the `h2:open-search` event). Asks
// /api/v1/search/suggest as people type, cancelling the previous request so a slow answer never overwrites a newer one.

export const SCOPES = [
  { id: "all", label: "All" },
  { id: "products", label: "Products" },
  { id: "companies", label: "Companies" },
  { id: "news", label: "News" },
  { id: "schemes", label: "Schemes" },
  { id: "tenders", label: "Tenders" },
  { id: "events", label: "Events" },
  { id: "knowledge", label: "Knowledge" },
];

export const OPEN_SEARCH_EVENT = "h2:open-search";
export type OpenSearchDetail = { query?: string; scope?: string };

/** Opens the header search from anywhere on the page (the home hero uses this). */
export function openHeaderSearch(detail: OpenSearchDetail = {}) {
  window.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, { detail }));
}

interface Answer {
  groups: SearchOverlayGroup[];
  total: number;
  related: { label: string; href: string }[];
}

const NOTHING: Answer = { groups: [], total: 0, related: [] };
/** Wait this long after the last key before asking, so fast typing makes one request. */
const DEBOUNCE_MS = 120;

/** The answer to one question (words, scope, attempt); the overlay's state is worked out from it. */
interface Reply {
  key: string;
  ok: boolean;
  answer: Answer;
}

export function useHeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [attempt, setAttempt] = useState(0);
  const [reply, setReply] = useState<Reply | null>(null);
  const q = query.trim();
  const key = `${q}|${scope}|${String(attempt)}`;
  // Loading until the reply for exactly these words arrives; the last answer stays on screen meanwhile.
  const state: SearchOverlayState = !q ? "idle" : reply?.key !== key ? "loading" : reply.ok ? "ready" : "error";
  const answer = q && reply ? reply.answer : NOTHING;

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<OpenSearchDetail>).detail;
      if (d.query !== undefined) setQuery(d.query);
      if (d.scope) setScope(d.scope);
      setOpen(true);
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open || !q) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/v1/search/suggest?${new URLSearchParams({ q, scope }).toString()}`, { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          setReply({ key, ok: true, answer: (await res.json()) as Answer });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error("[search] suggestions failed", error);
          setReply({ key, ok: false, answer: NOTHING });
        });
    }, DEBOUNCE_MS);
    // A newer question cancels this one, so a slow answer never replaces a newer one.
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, q, scope, key]);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  return { open, setOpen, query, setQuery, scope, setScope, answer, state, retry };
}

export function HeaderSearch({
  search,
  canQuote = true,
}: {
  search: ReturnType<typeof useHeaderSearch>;
  /** Request a quote shows only to visitors and buyers (canRequestQuote); the workspaces pass false for the rest. */
  canQuote?: boolean;
}) {
  const router = useRouter();
  const { open, setOpen, query, setQuery, scope, setScope, answer, state, retry } = search;
  return (
    <SearchOverlay
      open={open}
      onOpenChange={setOpen}
      query={query}
      onQueryChange={setQuery}
      scopes={SCOPES}
      scope={scope}
      onScopeChange={setScope}
      groups={answer.groups}
      total={answer.total}
      state={state}
      related={answer.related}
      quoteHref={canQuote ? quoteHrefFor(query) : undefined}
      onOpenItem={(item) => {
        setOpen(false);
        router.push(item.href);
      }}
      onSeeAll={() => {
        setOpen(false);
        router.push(searchPageHref(query, scope, "header"));
      }}
      onRetry={retry}
      renderLink={({ href, className, children, onClick }) => (
        <Link key={href} href={href} className={className} onClick={onClick}>
          {children}
        </Link>
      )}
    />
  );
}
