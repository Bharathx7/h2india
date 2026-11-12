# Home page and Coming soon (step 5.1)

## Home figures (A45)

CMS → Home → **Home figures**. Up to three headline figures, each with its value as readers see it (8.62, ~8,000),
what it counts, the source and the date it was true. Readers see "SECI · as of 10 Nov 2026" under each. Open tenders
are counted live and always come after them; the verified-listings figure joins when Stage 6 has listings.

The SIGHT bars ("What SIGHT has awarded so far") take one row per tranche and add up the total. Leave a chart empty to
hide it; leave both empty to hide the snapshot.

Sample figures from the seed are ticked **Sample** and never show in production. Untick it only after replacing every
figure with a checked one.

## Coming soon (A44, A48)

1. A Super admin opens CMS → Settings → **Pre-launch**: check the launch line and add the emails that should see the
   real site (with a note saying who and why).
2. Set `FLAG_COMING_SOON=true` and restart the app. Every public page now shows the pre-launch page, except to
   signed-in operators and the allow-listed emails once they sign in.
3. The newsletter confirmation pages (`/newsletter/confirm`) stay open so people who sign up can confirm.
4. To launch, set the flag back to false and restart.

The latest-issue preview on the pre-launch page appears once newsletter issues exist (step 11.3).

## India H₂ Weekly sign-up (A46)

- Footer and Coming soon forms call the same sign-up. A new address gets "Confirm your India H₂ Weekly subscription"
  (676:8) with a link that works for 48 hours; opening it confirms the address, sends the welcome email and shows the
  topics page (448:7157). An address that is already confirmed gets "Change your India H₂ Weekly topics" instead.
- Only the latest link for an address works. An expired or replaced link shows "This link has expired" (448:7392) with
  a form that sends a new one without saying whether the address is known.
- Records: `core.newsletter_subscribers` (status, topics, consent version). Ten sign-ups an hour per address.
- Sending issues, the archive and unsubscribe pages come with steps 5.9 and 11.3.

## Early listing requests (A47)

CMS → Home → **Early listing requests** (Content export only). Set the status as you follow up: New, Contacted, Listed,
Not a fit. Five requests an hour per address.

## Checking the modules

In development (or with FLAG_DEV_PAGES=true):

- `/?state=loading` shows the loading skeletons (381:12972).
- `/?fail=tenders` (or `figures`, `schemes`, `news`, `sight`, `events`, `hubs`, `brands`, several with commas) makes
  that module fail, to see its designed error (381:13116) while the rest of the page loads.

## Words written for undrawn states (D-UI15, for the founder to check)

| Where                     | Words                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| For you · alerts          | No alerts yet · Set an alert and we'll tell you when a tender or scheme matches.                                                   |
| For you · saved           | Nothing saved yet · Save products, schemes and tenders to find them here.                                                          |
| For you · Hydrogen 101    | Start with the basics · How hydrogen is made, stored, moved and used, in short chapters. (from 379:4342)                           |
| For you · following       | Follow companies and topics · Updates from what you follow will show here.                                                         |
| Featured products (empty) | Featured products are on the way · Products show here once suppliers list them and our team has checked them. · List your products |
| Tenders (empty)           | No tenders close this week · Set an alert and we'll tell you when a tender that fits you opens.                                    |
| News (empty)              | News is on its way · The newsroom opens with our first stories.                                                                    |
| Events (empty)            | No events coming up · New webinars, summits and trainings show here as they are announced.                                         |
| Early listing consent     | H2 India may use these details to contact you about setting up your company profile before launch.                                 |
| Early listing sent        | Thanks, we'll be in touch · Our team will contact you at … to set up your company profile before launch.                           |
| Already-subscribed email  | You're already subscribed · This email already gets India H₂ Weekly. Use the button to change your topics or the extra emails.     |
