"use client";

import { Alert, Button, Switch } from "@h2india/ui";
import { useState } from "react";
import { saveChoice, useCookieChoice } from "./store";

// Cookie preferences (footer "Cookie preferences", /legal/cookies#preferences). Necessary cookies can't be switched
// off; Analytics is the only optional category until M10.

export function CookieChoices() {
  const choice = useCookieChoice();
  // What the switch shows: the visitor's change, or else what's stored.
  const [changed, setAnalytics] = useState<boolean | null>(null);
  const analytics = changed ?? choice?.analytics ?? false;
  const [saved, setSaved] = useState(false);
  return (
    <section
      id="preferences"
      aria-labelledby="preferences-title"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-default p-5"
    >
      <h2 id="preferences-title" className="type-h3 text-primary">
        Cookie preferences
      </h2>
      <div className="flex items-start justify-between gap-4 border-b border-default pb-4">
        <div>
          <p className="type-label text-primary">Necessary</p>
          <p className="type-body-sm text-body">Keep you signed in, remember your cart and protect forms. Always on.</p>
        </div>
        <Switch label="" aria-label="Necessary cookies, always on" checked disabled />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-label text-primary">Analytics</p>
          <p className="type-body-sm text-body">Count visits and see which pages are used, so we can improve them.</p>
        </div>
        <Switch
          label=""
          aria-label="Analytics cookies"
          checked={analytics}
          onCheckedChange={(on) => {
            setAnalytics(on);
            setSaved(false);
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={() => {
            void saveChoice(analytics, "preferences").then(() => {
              setSaved(true);
            });
          }}
        >
          Save choices
        </Button>
        {saved ? (
          <Alert live tone="success" title="Saved. Your choice applies straight away." className="flex-1" />
        ) : null}
      </div>
    </section>
  );
}
