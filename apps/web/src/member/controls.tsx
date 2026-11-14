"use client";

import { FOLLOW_LEVEL_OPTIONS } from "@h2india/core/members/rules";
import { Button, IconButton, Select } from "@h2india/ui";
import { useTransition } from "react";
import { followFromLinkAction, removeSavedAction, setFollowLevelAction, unfollowAction } from "./actions";

export function RemoveSaved({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <IconButton
      icon="trash"
      look="outline"
      size="sm"
      label={`Remove ${title} from saved items`}
      disabled={pending}
      onClick={() => {
        start(async () => {
          await removeSavedAction(id);
        });
      }}
    />
  );
}

export function FollowLevel({ id, level, label }: { id: string; level: string; label: string }) {
  return (
    <Select
      aria-label={`Notifications for ${label}`}
      defaultValue={level}
      onChange={(e) => {
        void setFollowLevelAction(id, e.target.value);
      }}
    >
      {FOLLOW_LEVEL_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export function Unfollow({ type, targetId, label }: { type: string; targetId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await unfollowAction(type, targetId);
        });
      }}
    >
      Unfollow<span className="sr-only"> {label}</span>
    </Button>
  );
}

export function AddFollow({ type, value, label }: { type: string; value: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await followFromLinkAction(type, value);
        });
      }}
    >
      Follow<span className="sr-only"> {label}</span>
    </Button>
  );
}
