"use client";

import { Button, cx, Icon, Select } from "@h2india/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// The eligibility checker's intro and six questions (749:4946 to 749:6797). The answers go into the address on "See
// my matches", and the server matches them against the rules stored on each scheme (step 5.4).

export interface Option {
  value: string;
  label: string;
}

export interface CheckerOptions {
  organisations: Option[];
  states: Option[];
  activities: Option[];
  sizes: Option[];
  startup: Option[];
  stages: Option[];
}

type Key = "organisation" | "state" | "activity" | "size" | "startup" | "stage";

const QUESTIONS: { key: Key; title: string; help: string; options: keyof CheckerOptions }[] = [
  {
    key: "organisation",
    title: "What kind of organisation are you?",
    help: "Pick the one that fits best. You can change it later.",
    options: "organisations",
  },
  {
    key: "state",
    title: "Which state is your plant or main office in?",
    help: "State schemes depend on where you invest. Choose your main state.",
    options: "states",
  },
  {
    key: "activity",
    title: "What do you do in the hydrogen value chain?",
    help: "Choose your main activity. Schemes are often limited to one part of the chain.",
    options: "activities",
  },
  {
    key: "size",
    title: "How big is your organisation?",
    help: "Some schemes are only for MSMEs, some only for larger firms.",
    options: "sizes",
  },
  {
    key: "startup",
    title: "Are you a DPIIT-recognised start-up?",
    help: "DPIIT recognition opens some calls and fee waivers.",
    options: "startup",
  },
  {
    key: "stage",
    title: "How far along is your project?",
    help: "Many schemes fund one stage only.",
    options: "stages",
  },
];

const ASK = [
  "What kind of organisation you are",
  "Which state you're in",
  "What you do in the hydrogen value chain",
  "Your size and MSME status",
  "Whether you're a DPIIT-recognised start-up",
  "How far along your project is",
];

function Disclaimer() {
  return (
    <p className="flex items-start gap-2 rounded-card bg-subtle px-3 py-2.5 type-caption text-secondary">
      <Icon name="info" size={16} className="mt-px shrink-0" />
      Indicative only. This isn&apos;t legal or financial advice; always check the official scheme notice.
    </p>
  );
}

export function Checker({
  options,
  schemeCount,
  checkedOn,
  initial,
}: {
  options: CheckerOptions;
  schemeCount: number;
  checkedOn: string | null;
  initial: Partial<Record<Key | "otherStates", string>>;
}) {
  const router = useRouter();
  const editing = Object.keys(initial).length > 0;
  const [step, setStep] = useState(editing ? 1 : 0);
  const [answers, setAnswers] = useState<Partial<Record<Key, string>>>(initial);
  const [otherStates, setOtherStates] = useState(initial.otherStates === "yes");

  if (step === 0) {
    return (
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-card bg-mint p-6 md:p-8">
          <p className="type-eyebrow text-secondary">Scheme eligibility checker</p>
          <h1 className="type-h2 text-primary">Which hydrogen schemes could fit you?</h1>
          <p className="type-body text-body">
            Answer six short questions about your organisation and project. We&apos;ll match you against {schemeCount}{" "}
            central and state schemes and open calls, and explain why each one fits.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 type-body-sm text-body">
            <li className="flex items-center gap-2">
              <Icon name="clock" size={18} /> About 2 minutes
            </li>
            <li className="flex items-center gap-2">
              <Icon name="lock" size={18} /> No sign-in needed
            </li>
            {checkedOn ? (
              <li className="flex items-center gap-2">
                <Icon name="check-circle" size={18} /> Schemes checked {checkedOn}
              </li>
            ) : null}
          </ul>
          <Button
            className="self-start"
            onClick={() => {
              setStep(1);
            }}
          >
            Start
          </Button>
        </section>
        <section aria-labelledby="ask" className="flex flex-col gap-3 rounded-card border border-default bg-page p-5">
          <h2 id="ask" className="type-h4 text-primary">
            What we&apos;ll ask
          </h2>
          <ol className="flex flex-col gap-3">
            {ASK.map((a, i) => (
              <li key={a} className="flex items-center gap-3 type-body-sm text-body">
                <span
                  aria-hidden="true"
                  className="flex size-6 items-center justify-center rounded-pill bg-subtle type-label-sm text-primary"
                >
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </section>
        <Disclaimer />
      </div>
    );
  }

  const q = QUESTIONS[step - 1];
  if (!q) return null;
  const value = answers[q.key] ?? "";
  const last = step === QUESTIONS.length;
  const next = () => {
    if (!value) return;
    if (!last) {
      setStep(step + 1);
      return;
    }
    const params = new URLSearchParams(answers);
    if (otherStates) params.set("otherStates", "yes");
    router.push(`/opportunities/eligibility?${params.toString()}`);
  };
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
    >
      <div className="flex flex-col gap-2">
        <p className="type-eyebrow text-secondary">
          Question {step} of {QUESTIONS.length}
        </p>
        <div
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={step}
          className="h-1.5 w-full overflow-hidden rounded-pill bg-subtle"
        >
          <div
            className="h-full rounded-pill bg-accent"
            style={{ width: `${String((step / QUESTIONS.length) * 100)}%` }}
          />
        </div>
      </div>
      <fieldset className="flex flex-col gap-4">
        <legend className="type-h2 text-primary">{q.title}</legend>
        <p className="type-body-sm text-secondary">{q.help}</p>
        {q.key === "state" ? (
          <div className="flex flex-col gap-3">
            <label>
              <span className="sr-only">State</span>
              <Select
                value={value}
                required
                onChange={(e) => {
                  setAnswers((a) => ({ ...a, state: e.target.value }));
                }}
              >
                <option value="" disabled>
                  Choose a state
                </option>
                {options.states.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="inline-flex items-center gap-2.5 type-body-sm text-primary">
              <input
                type="checkbox"
                checked={otherStates}
                onChange={(e) => {
                  setOtherStates(e.target.checked);
                }}
                className="size-5 text-primary accent-current"
              />
              We also invest in other states
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {options[q.options].map((o) => {
              const on = value === o.value;
              return (
                <label
                  key={o.value}
                  className={cx(
                    "flex cursor-pointer items-center gap-3 rounded-control border px-4 py-3.5 type-label text-primary",
                    on ? "border-selected bg-mint" : "border-default bg-page hover:border-focus",
                    "has-focus-visible:field-focus",
                  )}
                >
                  <input
                    type="radio"
                    name={q.key}
                    value={o.value}
                    checked={on}
                    onChange={() => {
                      setAnswers((a) => ({ ...a, [q.key]: o.value }));
                    }}
                    className="size-5 text-primary accent-current"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          leadingIcon="arrow-left"
          onClick={() => {
            setStep(step - 1);
          }}
        >
          {step === 1 ? "Back to intro" : "Back"}
        </Button>
        <Button type="submit" disabled={!value}>
          {last ? "See my matches" : "Continue"}
        </Button>
      </div>
      <Disclaimer />
      {editing ? (
        <Link href="/opportunities/eligibility" className="self-start type-label-sm text-link hover:underline">
          Start again
        </Link>
      ) : null}
    </form>
  );
}
