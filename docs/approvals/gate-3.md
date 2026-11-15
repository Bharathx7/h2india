# Gate 3: approve Launch 2 (orders and payments)

Playbook step 10.12 · prepared 15 Nov 2026 · for the H2 India founder.

**Do not sign this yet.** Launch 2 moves real money. It is signed after the three written confirmations below, the
real payment partner is connected, and Stage 12 is repeated for the money flows.

## What is built (branch `step/10-orders-payments`)

Stage 10 and steps 11.5 and 11.6, running against the **simulated payment partner** (A176): no money moves.

| Area                                                                                                    | State                                                            |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Orders: twelve statuses, timeline, Overdue from clocks, history and audit                               | Built, tested                                                    |
| Cart and four-step checkout, priced on the server, nothing charged at placing                           | Built, tested (flow B)                                           |
| Approvals: limits, second approver, delegation, no self-approval, fresh passkey                         | Built, tested (integration)                                      |
| Payment partner interface; simulated partner with test pay page, signed webhooks once, refunds, payouts | Built, tested                                                    |
| Online payment and bank transfer into the order's own account; partial payments; retry limit            | Built, tested                                                    |
| Double-entry ledger: append-only, balanced at commit, monthly identity, nightly reconciliation          | Built, tested                                                    |
| Supplier pipeline, accept or decline, dispatch checklist, proof of delivery, delivery code page         | Built, tested (flow B)                                           |
| Accept, accept part, disputes with offers, H2 India's decision, refunds                                 | Built, tested (flow H)                                           |
| Fees, TCS, TDS from versioned rate cards; payout runs at 11:00 and 16:00 IST; statements                | Built, tested                                                    |
| Admin Orders and Money                                                                                  | Built, tested                                                    |
| Order emails and SMS                                                                                    | Built (SMS from their frames; emails in the notice layout, A178) |
| Pilot list: only listed companies trade when it is set                                                  | Built, tested                                                    |

## How it was checked

- Integration tests: `packages/core/src/orders/orders.int.test.ts` (32 tests with the rules) against the simulator.
- Browser: `tests/e2e/specs/flow-b.spec.ts` and `flow-h.spec.ts` pass locally with the app, the worker and Mailpit.
- CI runs the browser tests with `FLAG_TRANSACTIONS=true` (A176).

## Before you sign

1. **Payment partner (M3)**: choose it, open its sandbox, and get written answers on holding funds per order, the
   payee name buyers see, and whether the word "escrow" may be used (it appears on several screens). Then the real
   adapter replaces `packages/core/src/adapters/payments/sim.ts`; nothing else changes.
2. **Chartered Accountant (M11)**: confirm the rate card (3% capped at ₹50,000, 18% GST on the fee), TCS 0.5% and
   TDS 0.1% and their bases, the e-way bill threshold and whether an IRN is needed, and the fee invoice format.
   Every figure is a setting marked as a sample until then.
3. **Penetration test (M22, step 12.7)** covering the money flows.
4. Decide **A177** (advance paid out on payment, as drawn, or everything held until acceptance), **G9** and the Doc 4
   cancellation rules, **G13**, **C1 to C3** (launch-offer dates), **M12** (order tiers) and **M19** (pay later, letter
   of credit).
5. Check the screens listed in `docs/approvals/frames-to-check.md` against Figma (A178).
6. Choose the pilot companies and set the pilot list in admin Money.

## Sign-off

|                           | Name | Date |
| ------------------------- | ---- | ---- |
| Founder approves Launch 2 |      |      |
