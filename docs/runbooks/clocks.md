# Clocks, holidays and failed jobs (step 3.8)

## Clock values

The values are in `packages/config/src/clocks.ts` (decision A24). Each is also a setting (`clock.<name>`) that a Super
admin changes in System settings (step 11.8). A change applies to deadlines started after it; existing deadlines keep
their due time.

## Working days and holidays (M18)

- Monday to Saturday are working days; Sundays and listed holidays are not. Times are IST.
- The list holds the central government gazetted holidays for Delhi/New Delhi (DoPT). 2026 and 2027 are seeded,
  including Dr Ambedkar's birthday declared for 14 April 2026.
- Each July DoPT publishes the next year's list. A Super admin adds it (System settings, step 11.8; until then ask for a
  migration). Moon-dependent holidays (Id, Muharram, Milad-un-Nabi) can move; update the date when DoPT announces it.

## How deadlines fire

The worker's `clocks` queue runs `deadlines-tick` every minute. The tick reads due deadlines from the database, claims
each warn or expire event and runs its handler in one transaction, so every event happens exactly once even if the
worker was stopped or Redis was flushed. Other scheduled jobs: files sweep (15 min), GSTIN sweep (30 min), join-request
expiry, throttle and sign-in code cleanup (hourly), audit retention (03:00 IST), report leads older than 24 months
(03:15 IST, through the web app, A33).

## Failed jobs

A job that fails every retry is written to `core.dead_letters` with its error and masked data. Until the admin screen
(Stage 11), a Super admin can list them with `listDeadLetters` and retry or dismiss with `resolveDeadLetter` (audited).
To look directly: `SELECT queue, job_name, error, failed_at FROM core.dead_letters WHERE resolved_at IS NULL;`
