# Email, SMS or WhatsApp provider down

**Trigger.** The `messages` alarm (failed messages over the hourly limit); the provider's status page; people
saying sign-in codes don't arrive.

**Impact.** Sign-in codes and links (security mail is never retried, so the person asks again); notifications
delayed; delivery codes ([delivery-code.md](delivery-code.md)).

## First 15 minutes

1. Confirm it's the provider: `dc logs --since 30m worker web-public | grep -iE "smtp|sms|whatsapp"`.
2. Status page: "Emails and text messages are delayed. Sign in with a passkey if you have one."

## Diagnosis

- Failures by channel: `dc exec postgres psql -U h2india -c "select channel, status, count(*) from core.notification_deliveries where created_at > now() - interval '1 hour' group by 1,2"`
- Credentials expired or rotated (`SMTP_*` and the SMS and WhatsApp settings in `h2india.env`)?

## Fix

- Provider down: wait. Failed email and WhatsApp messages retry by themselves (`notify-due`, every minute); WhatsApp
  held by quiet hours goes out after them.
- Wrong credentials: correct `h2india.env`, then `dc up -d web-public web-admin worker`.
- Long outage of email: people sign in with passkeys; support can help those without one through account recovery.

Rollback: restore the previous settings if a change made it worse.

## Confirm

A test sign-in code arrives; the alarm clears; the waiting messages show Sent.

## Who to tell

Status page; support, so they can answer people who write in.

## Follow-up

If it recurs, consider a second provider for security email.
