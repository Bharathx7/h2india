"use client";

import type { TemplateId } from "@h2india/core/notify";
import { Button } from "@h2india/ui";
import { useState } from "react";
import { sendTest } from "./actions";

export function SendButton({ template }: { template: TemplateId }) {
  const [state, setState] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-3">
      {state ? (
        <span className="type-caption text-secondary" role="status">
          {state}
        </span>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setState("Sending…");
          void sendTest(template).then(setState);
        }}
      >
        Send to me
      </Button>
    </span>
  );
}
