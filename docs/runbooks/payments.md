# Payment webhooks failing, or payments not matching

**Trigger.** Alarms `webhooks` (an event unprocessed for 15 minutes), `reconciliation` (the nightly comparison found
a difference) or `ledger` (the monthly identity doesn't balance). A buyer says they paid but the order still waits.

**Impact.** Orders stay Awaiting payment after the buyer paid; suppliers wait to dispatch; money in the books may not
match the partner's. Launch 2 only (`transactions` on).

## First 15 minutes

1. Don't change any balance by hand. The ledger is append-only and every rupee must trace to an event.
2. Admin › Money › Ledger and reconciliation: read the open differences.
3. Check the partner's status page and dashboard (M3) for an incident.

## Diagnosis

| Question               | Look at                                                                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are webhooks arriving? | `dc exec postgres psql -U h2india -c "select type, received_at, processed_at, error from core.payment_webhook_events order by received_at desc limit 20"`                                                             |
| Rejected as unsigned?  | `dc logs --since 1h web-public \| grep -i "webhook"` (a wrong webhook secret after a rotation is the usual cause; the real partner's secret is added with M3, the simulator signs with a key made from `AUTH_SECRET`) |
| Stored but failing?    | the `error` column above; the event is retried on the partner's next delivery                                                                                                                                         |
| Which order?           | Admin › Orders, search the reference; the Payments tab shows each attempt                                                                                                                                             |
| Difference kind        | Admin › Money: missing in our books, missing at the partner, or amounts differ                                                                                                                                        |

## Fix

- Signature failures: put the partner's current webhook secret in `h2india.env`, `dc up -d web-public`, then ask the partner to resend
  the day's webhooks (replaying is safe: each event is processed once, drill 5).
- An event failing on a bug: fix forward ([bad-release.md](bad-release.md)); the stored event is processed when
  the partner resends it.
- A payment the partner has but we don't: get the partner to resend that event; never mark the order paid by hand.
- A payment we have but the partner doesn't: stop. Tell Finance; check with the partner before anything moves.
- Resolve each difference in Admin › Money with what was done (money.edit, audited).

Rollback: none needed; nothing above changes balances directly.

## Confirm

The alarms clear; the order shows Payment received; the monthly identity shows Balanced.

## Who to tell

Finance always; the buyer and supplier of an affected order through the order's messages.

## Follow-up

If the partner was at fault, ask for their incident report in writing.
