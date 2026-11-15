# Delivery code not received

**Trigger.** The receiving contact says the SMS with the delivery link and code never came; the supplier says the
buyer can't confirm the delivery.

**Impact.** The buyer can't record what arrived, so acceptance and the supplier's payout wait.

## First 15 minutes

1. Admin › Orders › the order: check the receiving contact's mobile and when the code was sent.
2. Check the SMS provider's status (M5); if it's down, go to [message-provider-outage.md](message-provider-outage.md).

## Diagnosis

- `dc exec postgres psql -U h2india -c "select status, reason, provider_status, created_at from core.notification_deliveries where recipient like '%<last 4 digits>' order by created_at desc limit 5"`
- A wrong mobile number on the order, a DND block, or a template not approved by DLT
  ([template-rejected.md](template-rejected.md)).
- The link locked after wrong codes (the order page says so).

## Fix

- In Admin › Orders › the order: **Resend code** (with a reason). It makes a new link and code; the old one stops
  working.
- If the SMS still can't reach them: **Confirm receipt** after speaking to the receiving contact by phone, recording
  the condition they report and the reason (audited). Never read a code out over the phone; we never ask for codes.

Rollback: a resend can be repeated; a confirmed receipt can't be undone, so be sure before confirming.

## Confirm

The order shows the receipt; the buyer can accept the delivery.

## Who to tell

The buyer's requester and the supplier, through the order's messages.

## Follow-up

If numbers are often wrong, ask for a check of the receiving contact's mobile at checkout.
