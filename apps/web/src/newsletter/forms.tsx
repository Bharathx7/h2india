"use client";

import { Alert, Button, CategoryChip, cx, Icon, Input } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormGuard } from "@/lib/form-guard";
import { resendNewsletterLink, subscribeToNewsletter, unsubscribeFromNewsletter } from "@/server/public-forms";

// The newsletter page's sign-up box (445:5885) and the sign-up states that follow it: Check your inbox (448:7048) and
// You're already subscribed (448:7291). The address travels to those pages masked; the full address stays in this
// browser's session storage only, for Resend link.

const KEY = "h2-newsletter-email";
const remember = (email: string) => {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    // Private mode: Resend link then asks for the address.
  }
};
const recall = () => {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

const EXTRAS = ["Tender Alert digest", "Monthly data note", "Jobs"] as const;

export function ArchiveSignup() {
  const router = useRouter();
  const { trap, guard } = useFormGuard();
  const [email, setEmail] = useState("");
  const [extras, setExtras] = useState<string[]>(["Tender Alert digest"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      aria-labelledby="get-weekly"
      className="relative flex flex-col gap-3 rounded-card bg-mint p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await subscribeToNewsletter({
            email,
            topics: ["news", "tenders-schemes", ...(extras.includes("Jobs") ? ["jobs"] : [])],
            source: "newsletter-page",
            tenderDigest: extras.includes("Tender Alert digest"),
            monthlyNote: extras.includes("Monthly data note"),
            guard: guard(),
          }).catch(() => ({ status: "error" as const, message: "We couldn't sign you up. Try again in a moment." }));
          if (r.status === "sent" || r.status === "already") {
            remember(r.email);
            router.push(
              `/newsletter/${r.status === "sent" ? "check-inbox" : "already"}?to=${encodeURIComponent(r.masked)}`,
            );
          } else setError(r.message);
        });
      }}
    >
      {trap}
      <h2 id="get-weekly" className="type-h4 text-primary">
        Get H2 Economy Weekly
      </h2>
      <p className="type-body-sm text-body">Every Monday at 08:00 IST. Free. Unsubscribe in one click.</p>
      <Input
        type="email"
        autoComplete="email"
        aria-label="Your work email"
        placeholder="Your work email"
        value={email}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      {error ? (
        <p role="alert" className="type-caption text-error">
          {error}
        </p>
      ) : null}
      <div role="group" aria-labelledby="also" className="flex flex-col gap-2">
        <p id="also" className="type-caption text-secondary">
          Also send me
        </p>
        <div className="flex flex-wrap gap-2">
          {EXTRAS.map((x) => (
            <CategoryChip
              key={x}
              selected={extras.includes(x)}
              onClick={() => {
                setExtras((all) => (all.includes(x) ? all.filter((y) => y !== x) : [...all, x]));
              }}
            >
              {x}
            </CategoryChip>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        Subscribe
      </Button>
      <p className="type-caption text-secondary">
        We use your email only for newsletters. See our{" "}
        <Link href="/legal/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

/** "Resend link" on Check your inbox, and "Manage preferences" on Already subscribed: both send a fresh link. */
export function SendLinkAgain({ label, primary = false }: { label: string; primary?: boolean }) {
  const [email, setEmail] = useState("");
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const send = (address: string) => {
    start(async () => {
      const r = await resendNewsletterLink(address).catch(() => ({ ok: false, message: "Try again in a moment." }));
      if (r.ok) setDone("Sent. Check your inbox for a fresh link.");
      else setDone(r.message ?? "Try again in a moment.");
    });
  };
  if (done) {
    return <Alert live tone="success" title={done} className="w-full text-left" />;
  }
  if (asking) {
    return (
      <form
        noValidate
        className="flex w-full flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          send(email);
        }}
      >
        <Input
          type="email"
          autoComplete="email"
          aria-label="Your email"
          placeholder="name@company.in"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <Button type="submit" disabled={pending}>
          Send
        </Button>
      </form>
    );
  }
  return (
    <Button
      variant={primary ? "primary" : "outline"}
      disabled={pending}
      onClick={() => {
        const saved = recall();
        if (saved) send(saved);
        else setAsking(true);
      }}
    >
      {label}
    </Button>
  );
}

export function UnsubscribeButton({ token }: { token: string }) {
  const [result, setResult] = useState<string | null | undefined>(undefined);
  const [pending, start] = useTransition();
  if (result) {
    return (
      <div className="flex flex-col items-center gap-3" role="status">
        <span className="flex size-16 items-center justify-center rounded-pill bg-mint text-icon-primary">
          <Icon name="check-circle" size={28} />
        </span>
        <h2 className="type-h3 text-primary">You&rsquo;re unsubscribed</h2>
        <p className="type-body text-body">{result} won&rsquo;t get H2 Economy Weekly any more.</p>
        <Link href="/newsletter" className="type-label text-link underline">
          Changed your mind? Subscribe again
        </Link>
      </div>
    );
  }
  return (
    <div className={cx("flex flex-col items-center gap-3")}>
      {result === null ? (
        <Alert live tone="error" title="This unsubscribe link doesn't work. Use the link in your latest issue." />
      ) : null}
      <Button
        disabled={pending}
        onClick={() => {
          start(async () => {
            setResult(await unsubscribeFromNewsletter(token).catch(() => null));
          });
        }}
      >
        Unsubscribe
      </Button>
    </div>
  );
}
