# Runbooks

Step 13.5. One file per incident likely in the first months. Each follows the same order: **trigger, impact, first
15 minutes, diagnosis, fix (with rollback), confirm, who to tell, follow-up.** Commands run on the server from
`/srv/h2india` with the `dc` short name from `deploy.md`:

```sh
dc() { docker compose -f /srv/h2india/compose.prod.yml --env-file /srv/h2india/h2india.env "$@"; }
```

The alarms (`/api/health/deep`, emailed to `OPS_ALERT_EMAIL`) name the runbook to open.

| Incident                                        | Runbook                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| Site down or slow; clocks or queues stuck       | [site-down.md](site-down.md)                             |
| A release broke something                       | [bad-release.md](bad-release.md)                         |
| Payment webhooks failing, payments not matching | [payments.md](payments.md)                               |
| A payout failed                                 | [payout-failed.md](payout-failed.md)                     |
| Suspected bank-change fraud                     | [bank-change-fraud.md](bank-change-fraud.md)             |
| Delivery code not received                      | [delivery-code.md](delivery-code.md)                     |
| Search results missing                          | [search.md](search.md) (Rebuild)                         |
| Email, SMS or WhatsApp provider down            | [message-provider-outage.md](message-provider-outage.md) |
| DLT or WhatsApp template rejected               | [template-rejected.md](template-rejected.md)             |
| Suspected data breach                           | [data-breach.md](data-breach.md)                         |
| Grievance deadline at risk                      | [grievance-deadline.md](grievance-deadline.md)           |

Walk each one through once on staging (step 13.5 Done when) and note the date at the end of the file.
