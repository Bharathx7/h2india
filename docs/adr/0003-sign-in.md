# ADR 0003: Sign-in

Status: **Accepted** at Gate 0 (founder, 11 Nov 2026). Spike done and **approved by the founder on 11 Nov 2026** (step 3.2). Built in step 3.2 and merged 12 Nov 2026; see "As built".

## Context

The design offers a passkey, a six-digit email code and Google sign-in (Figma 524:1772), account recovery with two independent proofs (528:8), company membership with roles and order limits, and passkey step-up for approvals and bank changes.

## Options

1. **Better Auth 1.7** with its passkey, email code (email OTP), Google and organisation plugins, storing sessions in our PostgreSQL.
2. Hand-built on SimpleWebAuthn plus our own sessions.
3. A hosted identity service. Extra cost, data outside our database, and less control over the designed flows.

## Decision

Option 1. The spike below confirmed it. Option 2 is not needed.

## Spike result (step 3.2, branch `spike/auth`)

Better Auth 1.7.20 and @better-auth/passkey 1.7.20 (SimpleWebAuthn 13), Next.js 16.4, PostgreSQL 16, Drizzle 0.45. The browser test `tests/e2e/specs/spike-auth.spec.ts` passed 3 runs in a row (15 of 15). Passkeys were tested with Chrome's virtual authenticator.

| Check                                                                                                           | Result                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| New user signs in with a six-digit email code, adds a passkey, signs out, signs back in with the passkey        | Pass. The passkey is a discoverable credential, so sign-in needs no email.                                                          |
| Users, sessions, passkeys and codes stored in **our** PostgreSQL, in the `core` schema                          | Pass. Drizzle adapter, tables `core.users`, `sessions`, `accounts`, `verifications`, `passkeys`, `rate_limits`, snake_case columns. |
| Ids follow ADR 0002                                                                                             | Pass. uuidv7 through `advanced.database.generateId`.                                                                                |
| Code expires in 10 minutes, as the design says (524:1840, 671:428)                                              | Pass. An expired code returns `OTP_EXPIRED`, so the screen can say "expired", not "wrong".                                          |
| Code works once only                                                                                            | Pass. Second use returns `INVALID_OTP`.                                                                                             |
| Codes stored hashed                                                                                             | Pass. The database holds a hash, not the six digits.                                                                                |
| Five wrong codes pause sign-in for that email for 15 minutes (524:2036), even with the right code or a new code | Pass, through our hook (below).                                                                                                     |
| Code requests limited per email and per IP                                                                      | Pass. Per IP is built in; per email is our hook. The sixth code in an hour for one email is refused.                                |
| Google                                                                                                          | Pass up to Google's page: the browser is sent to accounts.google.com with our callback address, PKCE and a state value.             |
| Cookies                                                                                                         | Pass. `HttpOnly`, `SameSite=Lax`; `Secure` is set automatically when the site runs on https.                                        |
| Requests from other sites                                                                                       | Pass. With a session cookie, a request from another origin (or none) is refused with 403.                                           |
| Session                                                                                                         | Stored with IP and browser; 7 days, extended once a day while in use.                                                               |

### What we add ourselves

Better Auth does not do these out of the box. Each was proven in the spike through Better Auth's request hooks (`apps/web/src/spike/throttle.ts`).

1. **Pause after wrong codes.** Better Auth only kills the current code after its tries run out; a new code could be requested straight away. Our hook counts wrong codes per email and pauses sign-in for 15 minutes, which is what the locked frame says.
2. **Per-email limit on code requests.** Better Auth limits per IP only. Our hook limits codes per email.
3. **Looser per-IP limits.** The defaults (3 codes a minute, 3 sign-in tries in 10 seconds per IP) would block an office where everyone shares one IP. The spike uses 10 codes and 20 tries a minute per IP; the per-email rules carry the real protection.
4. **Expired codes kept until checked.** By default Better Auth deletes every expired row on each lookup, which can turn "expired" into "wrong". We switch that off and clear old rows with a scheduled job (step 3.8).
5. **Our table names and ids.** The production tables go into `packages/db` as a normal migration, in the `core` schema.

### Must be set in production

- **Client IP header.** Rate limits need the visitor's real IP. Behind the proxy (ADR 0006) set `advanced.ipAddress.ipAddressHeaders` to the proxy's header, and make sure the app can only be reached through the proxy; otherwise anyone can fake the header and dodge the per-IP limit. Per-email limits still hold either way.
- **Domain (M1).** Passkeys belong to one domain. Settle M1 before real users register.
- `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` from the secrets store. Telemetry is off by default and we set it off explicitly.

### Not proven yet, and why

- **Google round trip.** Needs real Google credentials (founder task), and Google's servers cannot be reached from the build workspace. To check on a laptop once credentials exist: sign in with Google, then with an email code for the same address, and confirm both land on one account.
- **Passkey on a real laptop and phone.** Founder task in the playbook. A phone test needs the site on https with its final domain (or a tunnel), because passkeys need a secure page.

### Found along the way

- `packages/db` (step 3.1) sets the UTC time zone with a query on each new connection. pg warns that this races the first query and will stop allowing it in pg 9. The spike sets it as a connection option instead (`options: "-c TimeZone=UTC"`); the same fix should go into `packages/db`.

## As built (step 3.2)

- `packages/core/src/sign-in/`: `auth.ts` (the Better Auth setup), `hooks.ts` (our rules), `throttle.ts` (per-email counters, one atomic upsert each), `mail.ts` (sends the code over SMTP), `rules.ts` (numbers from decision A2, safe return path; safe in the browser).
- Tables in `core` (migration 0002): `users`, `sessions`, `accounts`, `verifications`, `passkeys`, `rate_limits`, `sign_in_throttle`.
- `apps/web`: `/api/auth/*` (Better Auth), `/sign-in`, `/sign-out` (only from our own pages), placeholders `/join` (3.3) and `/forgot-access` (3.5).
- Email: Figma 671:428 in `packages/emails`, sent through Mailpit locally and in CI until the provider (M6) is chosen.
- Decisions: A1 (an email with no account gets a code; the account is made when the code is entered), A2 (limits), A3 (expired-code message), A4 (passkey offer after the first code sign-in, accepted 12 Nov 2026).
- Scheduled clean-up of old `verifications` and `sign_in_throttle` rows (`pruneThrottle`) is wired in step 3.8.

## Consequences

- Passkeys are tied to the domain. **The final domain (M1) must be fixed before real users register.**
- The mobile number is used for verification and recovery only, until **C6** says otherwise.

## How to reverse

Users, passkeys and sessions live in our own tables, so moving to option 2 keeps every account.
