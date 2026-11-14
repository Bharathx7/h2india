import type { Event } from "@/payload-types";
import { absolute, SITE_DESCRIPTION, SITE_NAME } from "./site";

// Structured data (step 5.10): Organization and WebSite on the home page, Event on event pages, BreadcrumbList with
// every breadcrumb trail. Article (news/jsonld.ts) and JobPosting (opportunities/views.ts) are built where they live.
// Only facts the page shows; nothing invented (no ratings, no prices that aren't on the page).

export function JsonLd({ data }: { data: object }) {
  // "<" escaped so a value can never close the script tag.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absolute("/"),
    logo: absolute("/brand/h2india-logo-email.png"),
    description: SITE_DESCRIPTION,
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absolute("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absolute("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: absolute(c.href) } : {}),
    })),
  };
}

const MODE: Record<Event["attendance"], string> = {
  "In person": "https://schema.org/OfflineEventAttendanceMode",
  Online: "https://schema.org/OnlineEventAttendanceMode",
  Hybrid: "https://schema.org/MixedEventAttendanceMode",
};

export function eventLd(e: Event) {
  const online = e.attendance !== "In person";
  const place = e.venue || e.city;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    startDate: e.startsAt,
    ...(e.endsAt ? { endDate: e.endsAt } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: MODE[e.attendance],
    location: [
      ...(online ? [{ "@type": "VirtualLocation", url: absolute(`/events/${e.slug}`) }] : []),
      ...(e.attendance !== "Online" && place
        ? [
            {
              "@type": "Place",
              name: place,
              address: { "@type": "PostalAddress", addressLocality: e.city ?? place, addressCountry: "IN" },
            },
          ]
        : []),
    ],
    organizer: { "@type": "Organization", name: e.organiser },
    url: absolute(`/events/${e.slug}`),
  };
}
