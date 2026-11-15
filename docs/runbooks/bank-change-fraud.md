# Suspected bank-change fraud

**Trigger.** A supplier says they didn't change their payout account; a payout account changed right after a
sign-in from a new device or a passkey was added; the payout name check failed.

**Impact.** Someone who took over a supplier's account could send its payouts to their own bank. The hold
(`bankChangeHold`) is the window to stop it.

## First 15 minutes

1. **Suspend the company** (Admin › Users › company › Suspend, with the reason). Payout runs skip a suspended
   supplier, and its people lose access at once.
2. Note the change's time and the account's last four digits (Admin › Users › company).

## Diagnosis

- The audit log (Admin › Users › Audit), filtered by the company: who added the bank account, from which IP and
  browser, and when the passkey used for the step-up was registered.
- The person's signed-in devices (sessions) and any recent recovery request (Admin › Users).
- Any payouts already sent to the new account (Admin › Money › Payouts).

## Fix

- Confirm with the supplier's admin by phone, on the number from their verification documents, not one given in
  the account.
- If fraudulent: suspend the user who made the change (Admin › Users › Suspend: their sessions end), remove their
  passkeys and recovery options with the real admin present, and have the real admin add the correct account (the
  hold applies again).
- If a payout already went out: call the payment partner at once to recall it, and report to the bank. This is also
  a possible personal data breach: [data-breach.md](data-breach.md).

Rollback: lift the suspensions once the account is safe.

## Confirm

The correct account is Active after its hold; no payout to the wrong account; the person who changed it can't sign in.

## Who to tell

The supplier's admin; Finance; the founder. The police (cybercrime.gov.in or 1930) if money left.

## Follow-up

Review finding M2 (a passkey added just before a bank change) and the threat model's bank-change section.
