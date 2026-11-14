"use client";

import { Button } from "@h2india/ui";
import { useState } from "react";

/** "Was this helpful?" (278:23978). Answers are counted with analytics once M10 is decided; until then only the
 * thank-you shows, and nothing is stored. */
export function HelpFeedback() {
  const [answered, setAnswered] = useState(false);
  if (answered) {
    return (
      <p role="status" className="type-body-sm text-body">
        Thanks for telling us.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <p className="type-label-sm text-primary">Was this helpful?</p>
      {["Yes", "No"].map((x) => (
        <Button
          key={x}
          size="sm"
          variant="outline"
          onClick={() => {
            setAnswered(true);
          }}
        >
          {x}
        </Button>
      ))}
    </div>
  );
}
