# ADR 0007: Payment-partner adapter

Status: **Accepted** at Gate 0 (founder, 11 Nov 2026).

## Context

Orders, payments and payouts (Batch 6) are **on hold** (founder, 11 Nov 2026). The payment partner is not chosen (**M3**), and RBI rules mean the partner, not H2 India, holds the money.

## Decision (proposed)

All payment work goes through one interface in `packages/core/adapters/payments` (playbook step 10.4), with a fake implementation for local work and tests. No vendor SDK is imported anywhere else. Nothing in Batches 1 to 5 depends on a real payment partner, and every transaction screen sits behind the `transactions` flag (off).

## Consequences

- Batches 1 to 5 can be built and launched without choosing the partner.
- When Batch 6 restarts, the partner is chosen with the written answers to the questions in `docs/vendors.md`.

## How to reverse

Not applicable. The adapter is the way to keep the vendor choice reversible.
