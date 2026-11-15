# Personal data breach procedure

Step 12.2. What to do when personal data may have been seen, changed, lost or taken by someone who shouldn't have it.
**Have the lawyer confirm the time limits and the notice wording before launch.** The limits below are our reading
of the DPDP Rules 2025 (Rule 7) and the CERT-In Directions of 28 April 2022; the lawyer's word replaces them.

## Who does what

| Role              | Who                                                            | Does                                                                  |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Incident lead     | The founder, or the on-call engineer until the founder answers | Runs the steps below, decides, signs the notices                      |
| Engineer          | Whoever is on call                                             | Contains, keeps evidence, finds the cause and the scope               |
| Grievance officer | From Company and legal details (`trust-settings`, M2)          | Answers people who write in; logs their questions as grievances (GRV) |
| Lawyer            | Not chosen yet                                                 | Confirms whether and whom to notify, and the wording                  |

Write the contacts here once they're known (names, phone numbers, the CERT-In and Board addresses):

- Founder: _to fill in_
- On-call engineer: _to fill in_
- Lawyer: _to fill in_
- CERT-In: incident@cert-in.org.in (check the current address on cert-in.org.in before launch)
- Data Protection Board: _to fill in once its online system is live_

## Clock

The clock starts when anyone at H2 India **becomes aware** of a possible breach: an alert, a vendor's message, a
person's complaint, a security researcher's email. Write the time down (IST) in the incident log straight away.

| By             | What                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Straight away  | Start the incident log (`docs/incidents/<date>-<name>.md`, kept private). Contain.                                                 |
| **6 hours**    | Report to CERT-In if the incident is one of the types in its Directions (data breach, data leak, unauthorised access to systems…). |
| Without delay  | Tell the Data Protection Board briefly: what happened, when, how many people, likely impact.                                       |
| Without delay  | Tell each affected person: what happened, what it means for them, what we're doing, what they can do, and whom to contact.         |
| **72 hours**   | Send the Board the full report: facts, cause, what was done, who was told, and how we'll stop it happening again.                  |
| Within 30 days | Post-incident review written up; fixes merged; this procedure updated.                                                             |

## Steps

### 1. Detect

Signals that start this procedure:

- Monitoring alerts (Stage 13): many failed sign-ins, unusual exports, errors in the audit log, the worker's dead-letter
  list filling with access errors.
- The audit log (`/admin/users/audit`): an operator reading or exporting what they normally don't; View as sessions
  without a clear reason.
- A vendor tells us (hosting, email, SMS, WhatsApp, payment partner, GSTIN checks).
- A person, a customer or a researcher writes to the grievance officer or support.
- A leaked secret: gitleaks in CI, or a key seen anywhere it shouldn't be.

### 2. Contain (first hour)

Use what fits; don't wait for certainty.

- Rotate the exposed secret (`docs/secrets.md` says where each one lives and how to rotate it).
- Sign everyone out: delete the rows in `core.sessions` (all, or the affected people's).
- Suspend an account or company: `suspendUser()` / `suspendCompany()` from the back office.
- Switch features off in System settings: `transactions` (money), file uploads, public forms.
- Turn on maintenance (`maintenance` switch): public pages show the maintenance page with a 503; the admin stays open.
- Block an address at nginx (`infra/nginx/h2india.conf`, `deny`).
- If payouts are at risk, pause the payout runs (switch `transactions` off; the 11:00 and 16:00 runs then do nothing)
  and call the payment partner.

### 3. Keep evidence

Before changing anything else, save: the audit log entries (export from `/admin/users/audit`), nginx access logs, the
app logs with request IDs, a database dump (`docs/runbooks/deploy.md`, Backups), and copies of anything a vendor sends.
Never delete logs during an incident; `core.audit_log` can't be changed by design.

### 4. Assess

Answer, in the incident log:

1. What data? Use `docs/privacy/inventory.md` to list the tables and fields involved, and whether files were involved.
2. Whose, and how many people? Count from the database; note children's data if any (H2 India doesn't knowingly
   collect it).
3. Seen, changed, lost or taken? Was it encrypted (bank account numbers are, `supplier/bank.ts`)?
4. Likely harm to the people: fraud (bank details, payment links), phishing (emails and mobiles), embarrassment.
5. Is it still happening?

Every breach of personal data is reported to the Board and to the affected people under the DPDP Rules, whatever its
size. The assessment shapes what we say, not whether we say it; the lawyer confirms.

### 5. Notify

- **CERT-In** (6 hours): use the form on cert-in.org.in. Include the logs it asks for; our logs are kept 180 days or
  more as the Directions require (check the retention of nginx and app logs on the server before launch).
- **Data Protection Board**: the first notice without delay, the full report within 72 hours.
- **Affected people**: by email through `notify()` with `security: true` (never held by quiet hours or unsubscribe),
  plus an in-app notice. Plain words: what happened, what data, what we've done, what they should do (for example,
  watch for calls asking for a delivery code, which we never ask for), and the grievance officer's contact.
- **Business customers**: if their own staff's or customers' data is involved, tell their admin too; they may have
  their own duties.
- **Vendors**: if the breach is on their side, get their report in writing.

Write every notice sent, to whom and when, into the incident log.

### 6. Fix and review

- Fix the cause with a test that would have caught it; add a finding to `docs/security/review-<date>.md`.
- Update `docs/security/threat-model.md` if the way in wasn't there.
- Within 30 days, write the review: timeline, what went well, what didn't, what changes.

## Practice

Run a table-top exercise of this procedure once before Launch 1 and once a year after, with a made-up breach (for
example, a supplier's team member's laptop with an open session is stolen). Record it in `docs/drills/`.
