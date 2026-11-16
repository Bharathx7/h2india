"use client";

import { Icon, NewsletterBand, Select, SignUpBox } from "@h2india/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { subscribeToNewsletter } from "@/server/public-forms";

// The newsroom's interactive pieces (step 5.3): H2 Economy Weekly sign-ups, the filter selects (they change the address,
// so a filtered page can be shared), the share button and the live explainer's refresh.

/** The band's topic chips (376:7341) and the newsletter topics they stand for (as in the footer, A46). */
const BAND_TOPICS: Record<string, string> = {
  Policy: "policy",
  Tenders: "tenders-schemes",
  Projects: "projects",
  Technology: "technology",
  Mobility: "mobility",
};

// The sign-up box lives in @h2india/ui, so only the timing half of the form guard applies (step 5.9).
const loadedAt = typeof performance === "undefined" ? 0 : performance.timeOrigin;
async function signUp(email: string, topics: string[]): Promise<boolean> {
  const result = await subscribeToNewsletter({
    email,
    topics,
    source: "newsroom",
    guard: { website: "", elapsedMs: Date.now() - loadedAt },
  });
  return result.status === "sent" || result.status === "already";
}

export function NewsBand() {
  return (
    <NewsletterBand
      topics={Object.keys(BAND_TOPICS)}
      onSubscribe={(email, topics) =>
        signUp(
          email,
          topics.map((t) => BAND_TOPICS[t] ?? t),
        )
      }
    />
  );
}

/** H2 Economy Weekly in a side column (441:801). */
export function WeeklyBox({ tone }: { tone?: "outline" | "tint" }) {
  return (
    <SignUpBox
      title="H2 Economy Weekly"
      body="The week's hydrogen news, tenders and schemes, every Monday at 08:00 IST."
      topics={["policy", "tenders-schemes", "projects", "technology"]}
      onSubscribe={signUp}
      tone={tone}
    />
  );
}

/** A filter select that writes its value into the address (?state=gujarat) and goes back to page 1. */
export function FilterSelect({
  name,
  label,
  options,
  allLabel,
  className,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <Select
        value={params.get(name) ?? ""}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set(name, e.target.value);
          else next.delete(name);
          next.delete("page");
          const query = next.toString();
          router.push(query ? `${path}?${query}` : path, { scroll: false });
        }}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

/** "Share" (Icon/copy, 426:7468): the system share sheet on phones, otherwise copies the link and says so. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (copied === "idle") return;
    const timer = setTimeout(() => {
      setCopied("idle");
    }, 2500);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Share this story"
        onClick={() => {
          const url = window.location.href.split("#")[0] ?? window.location.href;
          if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
            void navigator.share({ title, url }).catch(() => undefined);
            return;
          }
          void navigator.clipboard
            .writeText(url)
            .then(() => {
              setCopied("copied");
            })
            .catch(() => {
              setCopied("failed");
            });
        }}
        className="flex size-10 items-center justify-center rounded-pill border border-control text-icon-primary hover:border-focus hover:bg-subtle"
      >
        <Icon name={copied === "copied" ? "check" : "copy"} size={18} />
      </button>
      <span
        role="status"
        className={
          copied === "idle"
            ? "sr-only"
            : "absolute top-full right-0 mt-2 whitespace-nowrap rounded-control bg-inverse px-2 py-1 type-caption text-inverse"
        }
      >
        {copied === "copied" ? "Link copied" : copied === "failed" ? "Copy the link from the address bar" : ""}
      </span>
    </span>
  );
}

/**
 * Keeps a live explainer's block current (801:7492): asks for the page again every 30 seconds while the explainer is
 * live, so only that block changes; the rest of the page stays as it is.
 */
export function LiveRefresh({ live, children }: { live: boolean; children: ReactNode }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => {
      setHidden(document.visibilityState === "hidden");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!live || hidden) return;
    const timer = setInterval(() => {
      router.refresh();
    }, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, [live, hidden, router]);
  return <>{children}</>;
}
