import type { Metadata } from "next";
import { getDb } from "@h2india/core";
import { loadActor } from "@h2india/core/authz";
import { jobPosters } from "@h2india/core/opportunities";
import { cx } from "@h2india/ui";
import { Crumbs, wrap } from "@/opportunities/parts";
import { getSession } from "@/server/auth";
import { EventForm } from "@/submissions/forms";
import { SideBoxes, SignedOut } from "@/submissions/parts";

// Submit an event (501:8485; phones 506:22; errors 502:1492, logo 502:1834, success 503:294; signed out 505:421;
// step 5.7). Listing is free; no featured-event payment until F7 is decided.

export const metadata: Metadata = {
  title: "Submit an event · H2 India",
  description: "List a hydrogen conference, exhibition, webinar or site visit. Listing is free.",
  alternates: { canonical: "/events/submit" },
};
export const dynamic = "force-dynamic";

export default async function SubmitEventPage() {
  const session = await getSession().catch(() => null);
  const poster = session ? (await jobPosters(getDb(), await loadActor(getDb(), session.user.id)))[0] : undefined;
  return (
    <main id="main" className="min-h-screen bg-subtle pb-16 [&_:is(h1,h2,h3)]:text-wrap">
      <div className={cx(wrap, "flex flex-col gap-2 pt-6 md:pt-8")}>
        <Crumbs items={[{ label: "Events", href: "/events" }, { label: "Submit an event" }]} />
        <h1 className="mt-2 type-h1 text-primary">Submit an event</h1>
        <p className="type-body text-body">
          List a hydrogen conference, exhibition, webinar or site visit. Listing is free. We review every event before
          it goes live.
        </p>
      </div>
      <div className={cx(wrap, "flex flex-col gap-6 pt-6 lg:flex-row lg:items-start")}>
        {session ? (
          <EventForm organiser={poster?.name ?? ""} />
        ) : (
          <div className="flex-1">
            <SignedOut what="an event" next="/events/submit" />
          </div>
        )}
        <SideBoxes
          next={[
            "We review your event within 1 working day.",
            "It goes live on the events calendar, or we email you the reason if we can't publish it.",
            "You can edit or cancel it from your workspace.",
          ]}
          guidelines={[
            "Hydrogen-related events only",
            "Use the official event name and dates",
            "No all-capital titles or emoji",
            "One listing per event, not per session",
          ]}
          money={{
            title: "Free or paid",
            text: "Listing an event is free. Featured placement is paid and always labelled as Featured.",
          }}
        />
      </div>
    </main>
  );
}
