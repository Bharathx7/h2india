"use client";

import { Alert, Button, CategoryChip, FormField, Input, Switch } from "@h2india/ui";
import { useState, type SyntheticEvent } from "react";
import { resendNewsletterLink, saveNewsletterPreferences } from "@/server/public-forms";

/** "Choose your topics" and "Also send me" (448:7157). */
export function Preferences({
  token,
  topics,
  initial,
}: {
  token: string;
  topics: { key: string; label: string }[];
  initial: { topics: string[]; tenderDigest: boolean; monthlyNote: boolean };
}) {
  const [chosen, setChosen] = useState(initial.topics);
  const [tenderDigest, setTenderDigest] = useState(initial.tenderDigest);
  const [monthlyNote, setMonthlyNote] = useState(initial.monthlyNote);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("saving");
    const ok = await saveNewsletterPreferences({ token, topics: chosen, tenderDigest, monthlyNote });
    setState(ok ? "saved" : "error");
  };
  return (
    <form onSubmit={(e) => void save(e)} className="flex w-full flex-col gap-3 border-t border-default pt-5 text-left">
      <h2 className="type-h4 text-primary">Choose your topics</h2>
      <div role="group" aria-label="Topics" className="flex flex-wrap gap-2">
        {topics.map((t) => (
          <CategoryChip
            key={t.key}
            selected={chosen.includes(t.key)}
            onClick={() => {
              setChosen((all) => (all.includes(t.key) ? all.filter((k) => k !== t.key) : [...all, t.key]));
              setState("idle");
            }}
          >
            {t.label}
          </CategoryChip>
        ))}
      </div>
      <p className="type-label text-primary">Also send me</p>
      <Switch
        label="Tender Alert digest (Mon and Thu)"
        checked={tenderDigest}
        onCheckedChange={(v) => {
          setTenderDigest(v);
          setState("idle");
        }}
      />
      <Switch
        label="Monthly data note"
        checked={monthlyNote}
        onCheckedChange={(v) => {
          setMonthlyNote(v);
          setState("idle");
        }}
      />
      {state === "saved" ? (
        <Alert tone="success" title="Preferences saved" live />
      ) : state === "error" ? (
        <Alert tone="error" title="We couldn't save your preferences" live>
          This link may have expired. Use the link in your latest H2 Economy Weekly email.
        </Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={state === "saving"} className="w-full">
        {state === "saving" ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}

/** "Send a new link" (448:7392). Says the same whether or not the address is known. */
export function ResendLink() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "sent" } | { status: "error"; message: string }>({
    status: "idle",
  });
  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({ status: "sending" });
    const result = await resendNewsletterLink(email.trim());
    setState(result.ok ? { status: "sent" } : { status: "error", message: result.message ?? "Try again." });
  };
  if (state.status === "sent") {
    return (
      <Alert tone="success" title="Check your inbox" live className="w-full text-left">
        If {email.trim()} signed up for H2 Economy Weekly, a new link is on its way.
      </Alert>
    );
  }
  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex w-full flex-col gap-3 text-left">
      <FormField
        label="Your work email"
        error={state.status === "error" ? state.message : undefined}
        className="[&>label]:sr-only"
      >
        <Input
          type="email"
          autoComplete="email"
          placeholder="Your work email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </FormField>
      <Button type="submit" size="lg" disabled={state.status === "sending"} className="w-full">
        Send a new link
      </Button>
    </form>
  );
}
