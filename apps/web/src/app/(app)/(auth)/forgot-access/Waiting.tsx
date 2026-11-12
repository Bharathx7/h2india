"use client";

import { Button } from "@h2india/ui";
import Link from "next/link";
import { useEffect } from "react";
import { recoveryStatus } from "./actions";
import { StatusIcon } from "../StatusIcon";

// "Waiting for your admin" (528:480) and the support version (A17). Checks every 10 seconds for the answer.
export function Waiting(props: {
  caption: string;
  support: boolean;
  body: string;
  onAnswer: (status: string) => void;
}) {
  const { onAnswer } = props;
  useEffect(() => {
    const timer = setInterval(() => {
      void recoveryStatus().then((s) => {
        if (s && s !== "Waiting for admin" && s !== "Waiting for support") onAnswer(s);
      });
    }, 10_000);
    return () => {
      clearInterval(timer);
    };
  }, [onAnswer]);
  return (
    <>
      <p className="type-caption text-secondary">{props.caption}</p>
      <StatusIcon name="clock" />
      <h1 className="type-h2 text-primary">
        {props.support ? "Waiting for H2 India support" : "Waiting for your admin"}
      </h1>
      <p className="type-body text-body">{props.body}</p>
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/">Go to the home page</Link>
      </Button>
    </>
  );
}
