# ADR 0003: Sign-in

Status: **Accepted** at Gate 0 (founder, 11 Nov 2026).

## Context

The design offers a passkey, a six-digit email code and Google sign-in (Figma 524:1772), account recovery with two independent proofs (528:8), company membership with roles and order limits, and passkey step-up for approvals and bank changes.

## Options

1. **Better Auth 1.7** with its passkey, email code (email OTP), Google and organisation plugins, storing sessions in our PostgreSQL.
2. Hand-built on SimpleWebAuthn plus our own sessions.
3. A hosted identity service. Extra cost, data outside our database, and less control over the designed flows.

## Decision (proposed)

Option 1, **after a spike** (step 3.2) proves passkey, email code and Google work together in one flow with our database. If the spike fails, use option 2.

## Consequences

- Passkeys are tied to the domain. **The final domain (M1) must be fixed before real users register.**
- The mobile number is used for verification and recovery only, until **C6** says otherwise.

## How to reverse

Users, passkeys and sessions live in our own tables, so moving to option 2 keeps every account.
