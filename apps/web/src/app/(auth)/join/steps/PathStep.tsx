"use client";

import type { JoinPath } from "@h2india/core/companies/client";
import { Button, cx, Icon, TextLink, type IconName } from "@h2india/ui";
import Link from "next/link";
import { AUTH_LINKS } from "@/lib/auth-links";
import { Progress } from "./Progress";

// Join step 1 (Figma 525:9): three option cards; the chosen one is tinted with the selected border.

const OPTIONS: { value: JoinPath; title: string; text: string; icon: IconName }[] = [
  {
    value: "buyer",
    title: "Buyer company",
    text: "Find verified suppliers, compare quotes and order with GST invoices.",
    icon: "shopping-cart",
  },
  {
    value: "supplier",
    title: "Supplier company",
    text: "List products, answer quote requests and get a verified badge.",
    icon: "building",
  },
  {
    value: "member",
    title: "Individual member",
    text: "For enthusiasts, students and researchers. Follow news, schemes and events.",
    icon: "user",
  },
];

export function PathStep(props: {
  value: JoinPath;
  onChange: (path: JoinPath) => void;
  onContinue: () => void;
  busy: boolean;
  signedIn: boolean;
}) {
  return (
    <>
      <Progress step={1} of={props.value === "member" ? 2 : 4} label="How you'll use H2 India" />
      <h1 className="type-h2 text-primary">Join H2 India</h1>
      <p className="type-body text-body">Free for buyers and members. Choose the option that fits you best.</p>
      <fieldset className="flex min-w-0 flex-col gap-5">
        <legend className="sr-only">How you'll use H2 India</legend>
        {OPTIONS.map((o) => {
          const selected = props.value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                "flex cursor-pointer items-center gap-4 rounded-card p-4 md:p-5 transition-colors duration-(--motion-duration-fast) ease-standard",
                "has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-focus",
                selected
                  ? "border-2 border-selected bg-tint p-3.75 md:p-4.75"
                  : "border border-default hover:border-hover",
              )}
            >
              <span
                className={cx(
                  "flex size-12 shrink-0 items-center justify-center rounded-card text-primary",
                  selected ? "bg-page" : "bg-mint",
                )}
              >
                <Icon name={o.icon} size={24} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="type-label-lg text-primary">{o.title}</span>
                <span className="type-body-sm text-body">{o.text}</span>
              </span>
              <input
                type="radio"
                name="path"
                value={o.value}
                checked={selected}
                onChange={() => {
                  props.onChange(o.value);
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cx(
                  "flex size-5 shrink-0 items-center justify-center rounded-pill bg-page",
                  selected ? "border-2 border-focus" : "border-[1.5px] border-input",
                )}
              >
                {selected ? <span className="size-2.5 rounded-pill bg-inverse" /> : null}
              </span>
            </label>
          );
        })}
      </fieldset>
      <Button size="lg" className="w-full" disabled={props.busy} onClick={props.onContinue}>
        Continue
      </Button>
      {props.signedIn ? null : (
        <p className="flex items-center justify-center gap-1 type-body-sm text-body">
          Already on H2 India?
          <TextLink asChild showIcon={false}>
            <Link href={`${AUTH_LINKS.signIn}?next=/join`}>Sign in</Link>
          </TextLink>
        </p>
      )}
    </>
  );
}
