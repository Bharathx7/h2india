"use client";

import { APPLICATION_STATUSES } from "@h2india/core/members/rules";
import { Button, Select } from "@h2india/ui";
import { useTransition } from "react";
import { applicationStatusAction, removeSavedJobAction } from "./learning-actions";

/** "Your status" (725:1038): only the member sees it; employers don't. */
export function ApplicationStatus({ id, status, role }: { id: string; status: string; role: string }) {
  return (
    <Select
      aria-label={`Your status for ${role}`}
      defaultValue={status}
      className="w-40"
      onChange={(e) => {
        void applicationStatusAction(id, e.target.value);
      }}
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </Select>
  );
}

export function RemoveSavedJob({ id, role }: { id: string; role: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(() => removeSavedJobAction(id));
      }}
    >
      Remove<span className="sr-only"> {role}</span>
    </Button>
  );
}
