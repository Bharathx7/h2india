# Notifications (step 3.9)

## How a message is sent

`notify()` sends one event to one person on each channel they chose: email, WhatsApp and in-app. It checks their
choices for the topic (577:288, 548:8; account and security email can't be turned off), "Unsubscribe from everything"
(stops alerts and other marketing topics and WhatsApp, never account mail) and quiet hours (WhatsApp and in-app wait
until the morning). Sign-in codes and links go straight through `deliverEmail` and `deliverSms`.

Every message, sent or not, is a row in `core.notification_deliveries` with its status and reason. To answer "why didn't
I get it?": `SELECT created_at, channel, template, status, reason, error FROM core.notification_deliveries WHERE user_id = '…' ORDER BY created_at DESC;`

Failed emails are retried by the `notify-due` job (every minute) up to five times; codes and links are never stored or
retried, the person asks for a new one.

## Providers (M5, M6)

Until you choose them, SMS and WhatsApp use a fake provider that delivers to Mailpit as an email to
`sms-<digits>@sms.h2india.local` or `whatsapp-<digits>@whatsapp.h2india.local`. With a real provider, a Super admin marks
each SMS (DLT) and WhatsApp template approved once the provider confirms it (A25); an unapproved template is refused and
logged as Refused, `not_approved`.

## Checking each template yourself (playbook "You do")

Open `/dev/messages` (local, or staging with dev pages on), sign in, and press "Send to me" on each built template. It
arrives in your inbox (or Mailpit locally) and as a test notification in your bell. Compare each with its frame on Figma
page 16; the list shows which step builds the rest.
