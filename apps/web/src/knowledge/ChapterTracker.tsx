"use client";

import { Button, Icon } from "@h2india/ui";
import { useEffect, useRef, useState, useTransition } from "react";
import { chapterDoneAction, chapterOpenedAction, readingTimeAction } from "@/member/learning-actions";

// Saves Hydrogen 101 progress for a signed-in member (471:1876, step 7.5): opening a chapter starts it, time counts
// while the page is visible, and reaching the end (or Mark chapter as done) marks it done.

const FLUSH_MS = 30_000;

export function ChapterTracker({ slug, done }: { slug: string; done: boolean }) {
  const [isDone, setDone] = useState(done);
  const [, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void chapterOpenedAction(slug);
    let since = document.visibilityState === "visible" ? Date.now() : 0;
    const flush = () => {
      if (!since) return;
      const seconds = (Date.now() - since) / 1000;
      since = document.visibilityState === "visible" ? Date.now() : 0;
      if (seconds >= 1) void readingTimeAction(slug, seconds);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") since = Date.now();
      else flush();
    };
    const timer = window.setInterval(flush, FLUSH_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [slug]);
  useEffect(() => {
    const el = end.current;
    if (!el || isDone) return;
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        seen.disconnect();
        setDone(true);
        void chapterDoneAction(slug);
      }
    });
    seen.observe(el);
    return () => {
      seen.disconnect();
    };
  }, [slug, isDone]);
  return (
    <div ref={end} className="flex items-center gap-3">
      {isDone ? (
        <p role="status" className="inline-flex items-center gap-2 type-label text-success">
          <Icon name="check-circle" size={18} />
          Chapter done
        </p>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setDone(true);
            start(() => chapterDoneAction(slug));
          }}
        >
          Mark chapter as done
        </Button>
      )}
    </div>
  );
}
