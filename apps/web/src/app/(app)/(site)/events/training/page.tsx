import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsList } from "@/events/EventsList";
import { CardsLoading } from "@/opportunities/parts";

// Training and courses (step 5.7): the events list with its preset. See EventsList.

export const metadata: Metadata = {
  title: "Hydrogen training and courses · H2 Economy",
  description: "Summits, expos, webinars and training for India's hydrogen industry, checked before they go live.",
  alternates: { canonical: "/events/training" },
};
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <main id="main" className="[&_:is(h1,h2,h3)]:text-wrap">
      <Suspense fallback={<CardsLoading label="Loading events" />}>
        <EventsList
          preset={{
            path: "/events/training",
            crumb: "Training and courses",
            title: "Hydrogen training and courses",
            types: ["Workshop and training"],
          }}
          params={params}
        />
      </Suspense>
    </main>
  );
}
