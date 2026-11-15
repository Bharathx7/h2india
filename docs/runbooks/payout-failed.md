# A payout failed

**Trigger.** The `payouts` alarm; Admin › Money › Payouts shows Failed with the bank's reason.

**Impact.** A supplier isn't paid on time. Their releases go back to waiting automatically, so the next run (11:00 or
16:00 IST on a working day) tries again.

## First 15 minutes

1. Read the reason in Admin › Money › Payouts (account closed, name mismatch, IFSC wrong, bank down).
2. If the bank was down, do nothing: the next run retries.

## Diagnosis

- Is the bank account still right? Admin › Users › the supplier company: payout account (last four digits only).
- Did the account change recently? A change within days of a failure is a fraud signal: go to
  [bank-change-fraud.md](bank-change-fraud.md).

## Fix

- Wrong or closed account: the supplier's admin changes it in Supplier › Bank (passkey, then the hold). The releases
  are paid in the first run after the hold ends. Operators can't change it for them, and the hold can't be shortened.
- Name mismatch: the supplier fixes the holder name the same way.
- Repeated failures to a correct account: call the payment partner (M3).

Rollback: nothing to undo; no money moved and nothing was posted to the ledger for the failed payout.

## Confirm

The next run's payout shows Paid with a UTR; the order closes.

## Who to tell

The supplier's admin, by the order's messages or a call: why it failed and when it will be paid.

## Follow-up

If one bank rejects often, tell the partner and note it here.
