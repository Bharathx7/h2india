"use client";

import { Button, ConfirmDialog } from "@h2india/ui";
import { useState, useTransition } from "react";
import { cancelRegistrationAction } from "./learning-actions";

/** "Cancel registration" (725:667), with a confirmation. */
export function CancelRegistration({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          setOpen(true);
        }}
      >
        Cancel registration<span className="sr-only"> for {title}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="destructive"
        title="Cancel your registration?"
        description={`Your seat for ${title} is freed and the reminders stop. You can register again while seats are left.`}
        confirmLabel="Cancel registration"
        cancelLabel="Keep it"
        onConfirm={() => {
          setOpen(false);
          start(() => cancelRegistrationAction(id));
        }}
      />
    </>
  );
}
