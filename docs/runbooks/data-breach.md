# Suspected data breach

**Trigger.** Anything that suggests personal data was seen, changed, lost or taken by someone who shouldn't have it.

**Impact.** Legal duties start the moment we know: CERT-In within 6 hours for notifiable incidents; the Data
Protection Board and affected people without delay; the Board's full report within 72 hours.

## Follow the breach procedure

`docs/privacy/breach-procedure.md` is the runbook: who leads, the clock, contain, keep evidence, assess (with
`docs/privacy/inventory.md`), notify, fix and review. Start its incident log first; write the time you found out.

## Quick containment commands

| Need                   | Do                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Sign everyone out      | `dc exec postgres psql -U h2india -c "delete from core.sessions"`                                |
| Sign one person out    | Admin › Users › the person › Suspend (ends their sessions)                                       |
| Stop money moving      | Admin › System settings › switch `transactions` off (needs a second operator)                    |
| Take public pages down | Admin › System settings › Maintenance on                                                         |
| Rotate a leaked secret | `docs/secrets.md`; then `dc up -d web-public web-admin worker`                                   |
| Keep evidence          | Admin › Users › Audit › Export; `journalctl --since "<time>" > /srv/h2india/incident-<date>.log` |

## Who reports

The founder reports to CERT-In and the Board (or the person they name in the breach procedure). Write the name here:
_to fill in_.
