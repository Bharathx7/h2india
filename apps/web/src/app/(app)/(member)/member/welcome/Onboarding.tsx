"use client";

import { PERSONAS, STATES, TOPICS } from "@h2india/core/members/rules";
import { Button, CategoryChip, cx, Icon, Logo, Switch, type IconName } from "@h2india/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  finishAction,
  followCompanyAction,
  savePersonaAction,
  saveTopicsAction,
  skipAction,
  type Suggestions,
} from "./actions";

// Member onboarding (531:8; phones 539:768), step 7.1: 1 persona (531:9), 2 topics and states (531:101), 3 suggested
// follows and alerts (531:178). "Skip for now" on every step leaves a usable, empty home feed.

export function Onboarding({
  firstName,
  initial,
}: {
  firstName: string;
  initial: { persona: string | null; topics: string[]; states: string[] };
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [persona, setPersona] = useState<string | null>(initial.persona);
  const [topics, setTopics] = useState<string[]>(initial.topics);
  const [states, setStates] = useState<string[]>(initial.states);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [alertsOn, setAlertsOn] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const skip = () => {
    start(async () => {
      await skipAction();
      router.push("/member");
    });
  };
  const next = () => {
    start(async () => {
      if (step === 1) {
        if (persona) await savePersonaAction(persona);
        setStep(2);
      } else if (step === 2) {
        const s = await saveTopicsAction(persona, topics, states);
        setSuggestions(s);
        setAlertsOn(new Set(s.alerts.filter((a) => a.on).map((a) => a.key)));
        setStep(3);
      } else {
        await finishAction(persona, topics, [...alertsOn]);
        router.push("/member");
      }
    });
  };

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center gap-6 bg-mint px-4 py-10">
      <Logo height={40} />
      <section
        aria-labelledby="onboarding-title"
        className="flex w-full max-w-180 flex-col gap-5 rounded-feature border border-default bg-page p-6 md:p-8"
      >
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="type-caption text-secondary">Step {step} of 3</p>
            <div
              className="h-1 rounded-pill bg-subtle"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={step}
              aria-label="Onboarding progress"
            >
              <div className="h-1 rounded-pill bg-accent" style={{ width: `${String((step / 3) * 100)}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            className="type-label-sm text-link hover:text-link-hover"
          >
            Skip for now
          </button>
        </div>

        {step === 1 ? (
          <>
            <h1 id="onboarding-title" className="type-h2 text-primary">
              Welcome to H2 India{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="type-body text-body">
              Tell us a little about yourself so we can show you the right news, opportunities and people.
            </p>
            <div role="radiogroup" aria-label="Your persona" className="grid gap-3 sm:grid-cols-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={persona === p.value}
                  onClick={() => {
                    setPersona(p.value);
                  }}
                  className={cx(
                    "flex flex-col gap-2 rounded-card border-[1.5px] p-4 text-left",
                    persona === p.value ? "border-fresh-600 bg-mint" : "border-default hover:border-focus",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-control bg-tint text-icon-primary">
                      <Icon name={p.icon as IconName} size={18} />
                    </span>
                    <span className="flex-1 type-label text-primary">{p.label}</span>
                    <span
                      aria-hidden="true"
                      className={cx(
                        "size-5 rounded-pill border-[1.5px]",
                        persona === p.value ? "border-[6px] border-inverse" : "border-input",
                      )}
                    />
                  </span>
                  <span className="type-body-sm text-body">{p.text}</span>
                </button>
              ))}
            </div>
          </>
        ) : step === 2 ? (
          <>
            <h1 id="onboarding-title" className="type-h2 text-primary">
              What do you want to follow?
            </h1>
            <p className="type-body text-body">
              Pick topics and states. You&apos;ll see them in your feed, and you can change them any time.
            </p>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 type-h4 text-primary">Topics</legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <CategoryChip
                    key={t.value}
                    selected={topics.includes(t.value)}
                    onClick={() => {
                      setTopics(toggle(topics, t.value));
                    }}
                  >
                    {t.label}
                  </CategoryChip>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 type-h4 text-primary">States</legend>
              <div className="flex flex-wrap gap-2">
                {STATES.map((s) => (
                  <CategoryChip
                    key={s}
                    selected={states.includes(s)}
                    onClick={() => {
                      setStates(toggle(states, s));
                    }}
                  >
                    {s}
                  </CategoryChip>
                ))}
              </div>
            </fieldset>
            <p className="type-caption text-secondary" aria-live="polite">
              {topics.length} {topics.length === 1 ? "topic" : "topics"} and {states.length}{" "}
              {states.length === 1 ? "state" : "states"} selected
            </p>
          </>
        ) : (
          <>
            <h1 id="onboarding-title" className="type-h2 text-primary">
              Suggested for you
            </h1>
            <p className="type-body text-body">Based on what you picked. Follow or turn on with one click.</p>
            {suggestions?.companies.length ? (
              <section aria-labelledby="sug-companies" className="flex flex-col gap-3">
                <h2 id="sug-companies" className="type-h4 text-primary">
                  Companies and institutions
                </h2>
                <ul className="flex flex-col divide-y divide-default rounded-card border border-default">
                  {suggestions.companies.map((c) => {
                    const on = following.has(c.id);
                    return (
                      <li key={c.id} className="flex items-center gap-3 p-3">
                        <span
                          aria-hidden="true"
                          className="flex size-10 items-center justify-center rounded-pill bg-mint type-label-sm"
                        >
                          {c.initials}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="type-label text-primary">{c.name}</span>
                          <span className="type-caption text-secondary">{c.detail}</span>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-pressed={on}
                          onClick={() => {
                            const nextSet = new Set(following);
                            if (on) nextSet.delete(c.id);
                            else nextSet.add(c.id);
                            setFollowing(nextSet);
                            void followCompanyAction(c.id, c.name, !on);
                          }}
                        >
                          <Icon name={on ? "check" : "plus"} size={16} />
                          {on ? "Following" : "Follow"}
                          <span className="sr-only"> {c.name}</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            {suggestions?.alerts.length ? (
              <section aria-labelledby="sug-alerts" className="flex flex-col gap-3">
                <h2 id="sug-alerts" className="type-h4 text-primary">
                  Alerts
                </h2>
                <ul className="flex flex-col divide-y divide-default rounded-card border border-default">
                  {suggestions.alerts.map((a) => (
                    <li key={a.key} className="flex items-center gap-3 p-3">
                      <Icon name="bell" size={18} className="text-icon-primary" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="type-label text-primary">{a.label}</span>
                        <span className="type-caption text-secondary">{a.detail}</span>
                      </span>
                      <Switch
                        label={<span className="sr-only">{a.label}</span>}
                        checked={alertsOn.has(a.key)}
                        onCheckedChange={(v) => {
                          const nextSet = new Set(alertsOn);
                          if (v) nextSet.add(a.key);
                          else nextSet.delete(a.key);
                          setAlertsOn(nextSet);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {!suggestions?.companies.length && !suggestions?.alerts.length ? (
              <p className="type-body text-body">
                Nothing to suggest yet. Your feed fills in as you follow topics, companies and states.
              </p>
            ) : null}
          </>
        )}

        <div className="flex items-center justify-between">
          {step > 1 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setStep((step - 1) as 1 | 2);
              }}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={next} disabled={pending}>
            {step === 3 ? "Go to my feed" : "Continue"}
          </Button>
        </div>
      </section>
    </main>
  );
}
