import { getDb } from "@h2india/core";
import { alertForToken, turnOffAlert } from "@h2india/core/alerts";
import { Alert, Button, buttonClasses } from "@h2india/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

// "Turn off this alert" (665:307 footer), step 7.3: turns off this one alert, no sign-in needed. The link only shows a
// button, so mail scanners that open links don't turn anything off; the one-click POST is /api/alerts/off.
export const metadata: Metadata = {
  title: "Turn off an alert · H2 Economy",
  robots: { index: false },
  alternates: { canonical: "/alerts/off" },
};
export const dynamic = "force-dynamic";

async function turnOff(form: FormData) {
  "use server";
  const raw = form.get("token");
  const token = typeof raw === "string" ? raw : "";
  await turnOffAlert(getDb(), token);
  redirect(`/alerts/off?done=1&token=${encodeURIComponent(token)}`);
}

export default async function AlertOffPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token = "", done } = await searchParams;
  const alert = token ? await alertForToken(getDb(), token) : null;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-16">
      {!alert ? (
        <Alert tone="error" title="This link doesn't work">
          It may have been copied incompletely. You can turn alerts off in your account.
        </Alert>
      ) : done || !alert.active ? (
        <>
          <h1 className="type-h2">Alert turned off</h1>
          <p className="type-body text-body">We won't send {alert.label} any more. Your other alerts keep working.</p>
        </>
      ) : (
        <form action={turnOff} className="flex flex-col gap-5">
          <h1 className="type-h2">Turn off this alert?</h1>
          <p className="type-body text-body">We'll stop sending {alert.label}. Your other alerts keep working.</p>
          <input type="hidden" name="token" value={token} />
          <div>
            <Button type="submit">Turn off this alert</Button>
          </div>
        </form>
      )}
      <Link href="/member/alerts" className={buttonClasses({ variant: "outline" })}>
        Manage alerts
      </Link>
    </main>
  );
}
