import { Alert, Button, buttonClasses, cx, Icon } from "@h2india/ui";
import Link from "next/link";
import type { ReactNode } from "react";

// Pieces the four submission forms share (501:8484): the card sections, the side boxes (What happens next, Content
// guidelines, Free or paid), the error summary (502:1492), the network error with retry (505:373), signed out
// (505:421) and the success card with its reference (503:294, 505:193, 505:247, 505:288).

export function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-card border border-default bg-page p-5">
      <legend className="float-left type-h4 text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}

export function SideBoxes({
  next,
  guidelines,
  money,
}: {
  next: string[];
  guidelines: string[];
  money: { title: string; text: string };
}) {
  return (
    <aside className="flex flex-col gap-4 lg:w-80 lg:shrink-0">
      <section aria-labelledby="next" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
        <h2 id="next" className="type-h4 text-primary">
          What happens next
        </h2>
        <ol className="flex flex-col gap-2.5">
          {next.map((n, i) => (
            <li key={n} className="flex items-start gap-2.5 type-body-sm text-body">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-pill bg-subtle type-label-sm text-primary">
                {i + 1}
              </span>
              {n}
            </li>
          ))}
        </ol>
      </section>
      <section
        aria-labelledby="guidelines"
        className="flex flex-col gap-2 rounded-card border border-default bg-page p-5"
      >
        <h2 id="guidelines" className="type-h4 text-primary">
          Content guidelines
        </h2>
        <ul className="flex flex-col gap-1.5">
          {guidelines.map((g) => (
            <li key={g} className="type-body-sm text-body">
              • {g}
            </li>
          ))}
        </ul>
        <Link href="/legal/editorial-policy" className="inline-flex items-center gap-1 type-label-sm text-link">
          Read the full guidelines <Icon name="arrow-right" size={14} />
        </Link>
      </section>
      <section aria-labelledby="money" className="flex flex-col gap-1 rounded-card bg-subtle p-5">
        <h2 id="money" className="type-label text-primary">
          {money.title}
        </h2>
        <p className="type-body-sm text-body">{money.text}</p>
      </section>
    </aside>
  );
}

export function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const list = Object.values(errors);
  if (!list.length) return null;
  return (
    <Alert
      live
      tone="error"
      title={`Fix ${String(list.length)} ${list.length === 1 ? "thing" : "things"} before you submit`}
    >
      {list.join(". ")}.
    </Alert>
  );
}

export function NetworkError({ onRetry, cancelHref }: { onRetry: () => void; cancelHref: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Alert live tone="error" title="We couldn't send your form" className="w-full">
        Check your connection and try again. Your answers are still here.
      </Alert>
      <div className="flex gap-3">
        <Button onClick={onRetry}>Try again</Button>
        <Link href={cancelHref} className={buttonClasses({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </div>
  );
}

export function SignedOut({ what, next }: { what: string; next: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-default bg-page px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-pill bg-mint text-icon-primary">
        <Icon name="lock" size={22} />
      </span>
      <h2 className="type-h3 text-primary">Sign in to submit {what}</h2>
      <p className="max-w-120 type-body text-body">
        You need a free H2 India account to submit events, press releases and jobs, so we know who to contact.
        Corrections and pitches don&apos;t need an account.
      </p>
      <div className="flex gap-3">
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className={buttonClasses({ size: "sm" })}>
          Sign in
        </Link>
        <Link href="/join" className={buttonClasses({ variant: "outline", size: "sm" })}>
          Join H2 India
        </Link>
      </div>
    </div>
  );
}

export function Success({
  title,
  text,
  reference,
  card,
  actions,
}: {
  title: string;
  text: string;
  reference: string;
  card?: ReactNode;
  actions: { label: string; href: string; primary?: boolean }[];
}) {
  return (
    <div className="mx-auto flex max-w-140 flex-col items-center gap-4 py-10 text-center" role="status">
      <span className="flex size-12 items-center justify-center rounded-pill bg-mint text-icon-primary">
        <Icon name="check-circle" size={24} />
      </span>
      <h1 className="type-h2 text-primary">{title}</h1>
      <p className="type-body text-body">{text}</p>
      <p className="inline-flex items-center gap-2 rounded-pill bg-subtle px-3 py-1 type-caption text-secondary">
        Reference <span className="type-spec text-primary">{reference}</span>
      </p>
      {card}
      <div className="flex flex-wrap justify-center gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className={cx(buttonClasses({ variant: a.primary ? "outline" : "ghost" }))}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
