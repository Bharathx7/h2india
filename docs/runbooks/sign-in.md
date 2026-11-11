# Runbook: sign-in

Step 3.2. Rules: 6-digit email codes last 10 minutes and work once; 5 wrong codes pause sign-in for that email
for 15 minutes; at most 5 codes an hour per email and one every 30 seconds (decision A2). Passkeys and Google
are not limited this way.

## Someone is paused and it was them (they mistyped)

The pause ends by itself after 15 minutes; the screen shows the time. Only if it cannot wait, and after
confirming who they are by another route, clear it on the server:

```sql
DELETE FROM core.sign_in_throttle WHERE key IN ('sign-in:paused:<email>', 'sign-in:wrong:<email>');
```

Note the request in the support log. (An admin screen for this comes with the admin console.)

## Someone is paused and it was not them

Someone is guessing codes for that email. Do not clear the pause. Ask the person to sign in with their passkey,
which is not affected, and tell them a code is only ever sent to their own inbox. Several emails paused at once
from the same place may be an attack: check `core.rate_limits` and the proxy logs.

## No code arrives

1. Locally: open Mailpit at http://localhost:8025.
2. On the server: check the email provider's log (decision M6) and the app log for the send.
3. "Too many codes requested" means 5 codes in the last hour; the screen says when to try again.

## Passkeys stopped working everywhere

Passkeys belong to the site's domain. A change of domain (M1) makes every passkey useless. People can still
sign in with an email code and add a new passkey.
