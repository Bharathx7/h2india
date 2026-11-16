"use client";

import { useId, useState, type SyntheticEvent } from "react";
import { Icon } from "../../icons/Icon";
import { cx } from "../../lib/cx";
import { Button } from "../Button";
import { CategoryChip } from "../Chips";

/* Figma "Newsletter band" (376:7341, on the news home 428:1305 and Insights 440:40): H2 Economy Weekly sign-up with topic
   chips, the same content as the footer sign-up as a full-width band. And the side-column box (434:3284 "Tender Alert
   digest", 441:801 "H2 Economy Weekly"): title, one line, email and a full-width Subscribe. */

type Subscribe = (email: string, topics: string[]) => Promise<boolean>;
type SendState = "idle" | "sending" | "done" | "error";

function useSignUp(onSubscribe: Subscribe) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SendState>("idle");
  const submit = async (e: SyntheticEvent<HTMLFormElement>, topics: string[]) => {
    e.preventDefault();
    setState("sending");
    const ok = await onSubscribe(email.trim(), topics).catch(() => false);
    setState(ok ? "done" : "error");
  };
  return { email, setEmail, state, submit };
}

function Done() {
  return (
    <p role="status" className="flex items-center gap-2 type-body-sm text-primary">
      <Icon name="check-circle" size={18} className="text-icon-success" />
      Check your inbox to confirm your subscription.
    </p>
  );
}

function Failed() {
  return (
    <p role="alert" className="type-caption text-error">
      We could not sign you up. Check the address and try again.
    </p>
  );
}

function EmailField({ value, onChange, grow }: { value: string; onChange: (v: string) => void; grow?: boolean }) {
  return (
    <label
      className={cx(
        "flex h-11.5 min-w-0 shrink-0 items-center gap-2 rounded-control border border-input bg-page px-4 focus-within:field-focus",
        grow && "flex-1",
      )}
    >
      <Icon name="mail" size={20} className="text-icon-secondary" />
      <span className="sr-only">Your work email</span>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Your work email"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        className="min-w-0 flex-1 bg-transparent type-body text-primary placeholder:text-secondary focus-visible:outline-none"
      />
    </label>
  );
}

export function NewsletterBand({
  onSubscribe,
  topics = ["Policy", "Tenders", "Projects", "Technology", "Mobility"],
  title = "H2 Economy Weekly",
  body = "The week's Indian hydrogen news, tenders and scheme deadlines. Every Monday, free.",
  className,
}: {
  onSubscribe: Subscribe;
  topics?: string[];
  title?: string;
  body?: string;
  className?: string;
}) {
  const id = useId();
  const { email, setEmail, state, submit } = useSignUp(onSubscribe);
  const [chosen, setChosen] = useState<string[]>(topics.slice(0, 2));
  return (
    <section aria-labelledby={id} className={cx("bg-tint", className)}>
      <div className="mx-auto flex w-full max-w-300 flex-col gap-6 px-4 py-12 md:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-16 xl:px-0">
        <div className="flex max-w-130 flex-col gap-3">
          <p className="type-eyebrow text-primary">Newsletter</p>
          <h2 id={id} className="type-h2 text-primary">
            {title}
          </h2>
          <p className="type-body text-body">{body}</p>
        </div>
        <form
          onSubmit={(e) => void submit(e, chosen)}
          className="flex w-full max-w-130 flex-col gap-3"
          aria-labelledby={id}
        >
          {state === "done" ? (
            <Done />
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <EmailField value={email} onChange={setEmail} grow />
                <Button type="submit" size="lg" disabled={state === "sending"}>
                  Subscribe
                </Button>
              </div>
              <div role="group" aria-label="Topics" className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <CategoryChip
                    key={t}
                    selected={chosen.includes(t)}
                    onClick={() => {
                      setChosen((all) => (all.includes(t) ? all.filter((x) => x !== t) : [...all, t]));
                    }}
                  >
                    {t}
                  </CategoryChip>
                ))}
              </div>
              {state === "error" ? <Failed /> : null}
              <p className="type-caption text-body">Unsubscribe any time. We never share your email.</p>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

/** The side-column sign-up box (434:3284, 441:801). */
export function SignUpBox({
  title,
  body,
  topics,
  onSubscribe,
  tone = "outline",
}: {
  title: string;
  body: string;
  /** The topics this box signs people up to. */
  topics: string[];
  onSubscribe: Subscribe;
  tone?: "outline" | "tint";
}) {
  const id = useId();
  const { email, setEmail, state, submit } = useSignUp(onSubscribe);
  return (
    <section
      aria-labelledby={id}
      className={cx(
        "flex flex-col gap-3 rounded-card p-5",
        tone === "tint" ? "bg-subtle" : "border border-default bg-page",
      )}
    >
      <h2 id={id} className="type-h4 text-primary">
        {title}
      </h2>
      <p className="type-body-sm text-body">{body}</p>
      {state === "done" ? (
        <Done />
      ) : (
        <form onSubmit={(e) => void submit(e, topics)} className="flex flex-col gap-3" aria-labelledby={id}>
          <EmailField value={email} onChange={setEmail} />
          <Button type="submit" className="w-full" disabled={state === "sending"}>
            Subscribe
          </Button>
          {state === "error" ? <Failed /> : null}
        </form>
      )}
    </section>
  );
}
