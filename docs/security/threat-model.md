# Threat model (step 12.1)

Written 15 November 2026 with the security review `docs/security/review-2026-11-15.md`. Finding IDs (H1, M2, L4…)
point to that review. Update this file when one of these flows changes.

## How to read this

We use **STRIDE**, six questions asked of each flow:

| Letter | Threat                 | The question                                        |
| ------ | ---------------------- | --------------------------------------------------- |
| S      | Spoofing               | Can someone pretend to be another person or system? |
| T      | Tampering              | Can someone change data they should not?            |
| R      | Repudiation            | Can someone deny doing something, with no record?   |
| I      | Information disclosure | Can someone see data they should not?               |
| D      | Denial of service      | Can someone stop others from using it?              |
| E      | Elevation of privilege | Can someone get more rights than they were given?   |

A **trust boundary** is a line where data comes from someone we do not fully trust (a browser, a phone, the payment
partner). Every check must happen on our side of the line.

"Gap" means something is missing or weak. "None found" means the review looked and the existing control holds.

---

## 1. Sign-in and account recovery (forgot access)

**Actors.** A person (buyer, supplier, member, operator); an attacker; the person's company admins; H2 India support.

**Data flow.**

1. Sign-in: the browser asks Better Auth (`/api/auth/*`) for a 6-digit email code, a passkey challenge or Google.
   Our hooks (`sign-in/hooks.ts`) add per-email limits and the wrong-code pause. A session cookie (`h2.session_token`,
   httpOnly, SameSite=Lax) is set.
2. Join: a magic link to the work email proves it (`magicLink`, `auth.ts:93-99`).
3. Recovery (`recovery/recovery.ts`): the person starts at /forgot-access; a server-side recovery token goes in a
   cookie; codes go to the email and to the mobile on file. Lost passkey = email + mobile codes. Changed mobile =
   email code + new mobile code + an admin's approval. Lost email = mobile code + an admin's (or support's) approval,
   then a link to the new email.

**Trust boundaries.** Browser → web app. Email inbox and phone (outside our control) → the codes. Google → us.
Company admin and support → approvals.

| STRIDE | Threat                                                        | Existing mitigation                                                                                          | Gap                                                                                 |
| ------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| S      | Guessing a sign-in code                                       | 10-minute codes, 5 wrong then 15-minute pause per email, per-IP limits (`hooks.ts:41-133`, `auth.ts:62-71`)  | None found                                                                          |
| S      | Phished or hijacked mailbox signs in by email code            | Passkey offered after sign-in; security notices                                                              | Email alone is enough for any account, operators included (**H2**, accepted risk 2) |
| S      | Google account for the same email links automatically         | Google verifies the address                                                                                  | A company's Workspace admin can sign in as staff (**L1**)                           |
| S      | Lost-passkey recovery by an attacker                          | Needs both the email and the mobile codes (`recovery.ts:196-202`); other admins told (`recovery.ts:235-265`) | None found                                                                          |
| S      | SIM swap plus social engineering of support (lost email path) | Mobile code plus an admin's approval; support when the person is the only admin (A17); audited               | One operator decides (accepted risk 3); operators sign in by email (**H2**)         |
| T      | Changing someone's mobile through recovery                    | Email code + new-mobile code + an admin's approval (`recovery.ts:341-355`)                                   | Expired requests can still be approved; double approval race (**L9**)               |
| R      | Denying a sign-in or recovery                                 | Recovery steps and approvals audited (`recovery.ts:210-216, 329-336, 430-437`); sessions keep IP and agent   | Individual sign-ins are not in the audit log (sessions table only)                  |
| I      | Finding out whether an email has an account                   | Recovery and sign-in screens look the same either way (`recovery.ts:73, 170`)                                | None found                                                                          |
| I      | Codes leaking in logs                                         | Codes stored hashed; `security: true` messages never stored or retried; `mask()` hides codes                 | None found                                                                          |
| D      | Locking a victim out by sending wrong codes for their email   | The pause is 15 minutes, then it lifts                                                                       | Repeatable; accepted for now (passkey sign-in is not paused)                        |
| D      | Flooding someone with codes                                   | 5 codes an hour and 30 seconds apart per email and per number (`hooks.ts:62-77`, `codes.ts:42-49`)           | None found                                                                          |
| E      | A suspended person signs back in                              | Sessions deleted on suspension; email-code sign-in refused                                                   | Passkey, Google, Join link and recovery still work; `loadActor` ignores it (**H1**) |
| E      | Operator back office with a weak sign-in                      | Operator permissions are data; admin on its own domain                                                       | No passkey requirement for operators (**H2**); 7-day sessions (**L8**)              |
| E      | Redirect after sign-in to another site                        | `safeReturnPath()` (`sign-in/rules.ts:34-50`)                                                                | None found                                                                          |

**Business-logic abuse: fake company claims.** Someone claims a directory profile that is not theirs.
Email claims need a code sent to an address on the profile's own website domain (`companies/claims.ts:107-145`).
GSTIN claims rely on the GSTIN check, which is the fake until M4. Every claim also needs an operator's decision (A137,
`decideClaim()`, audited). Gaps: operators sign in by email (**H2**); the GSTIN check is not rate limited (**L6**);
until M4 an operator is the only real check (accepted risk 6).

---

## 2. Uploads

**Actors.** A signed-in person; a visitor without an account (delivery photos, some public forms); the worker; an
attacker uploading malware or a script disguised as an image.

**Data flow.** Browser → `startUpload()` (permission, type, size, rate limit) → a signed PUT link that fixes type and
size → the browser PUTs to the quarantine bucket (MinIO, through nginx) → `completeUpload()` → worker `processFile()`:
ClamAV scan, real-type sniff, image re-encode → the private or public bucket → `Available`. Reading: `fileLink()`
checks the reader and gives a 5-minute signed link.

**Trust boundaries.** Browser → web app; browser → storage (direct); storage → worker (bytes are untrusted until
checked); storage → other people's browsers.

| STRIDE | Threat                                                    | Existing mitigation                                                                                           | Gap        |
| ------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| S      | Attaching someone else's upload to your record            | Only the uploader (user, or the key given to a visitor) can attach (`files.ts:132-135, 462-476`)              | None found |
| T      | Uploading a different type or a bigger file than declared | Type and size are part of the signature (`storage.ts:37-45`); the worker re-reads with a size cap and sniffs  | None found |
| T      | Malware                                                   | ClamAV scan, fails closed (`clamav.ts`); images re-encoded (`files.ts:370-388`)                               | None found |
| T      | A file that runs script on our domain (HTML, SVG)         | Only listed types; nginx sends nosniff and a sandboxed, script-free CSP on file paths (`h2india.conf:33-43`)  | None found |
| R      | Denying who uploaded or opened a document                 | `uploadedBy`, upload key hash; opening a sensitive kind is audited (`files.ts:424-435`)                       | None found |
| I      | Reading another company's document                        | `canRead()` plus the shared-on-RFQ, order and question rules; 5-minute links; `no-store` (`files.ts:137-145`) | None found |
| I      | Guessing file addresses in storage                        | Private bucket needs a signed link; object keys are UUID v7 under the kind                                    | None found |
| D      | Filling storage or the scan queue                         | Per-user and per-IP upload limits per hour (`files.ts:111-114`); limits per kind (`config/src/files.ts`)      | None found |
| E      | Uploading for a company you don't belong to               | `startUpload()` checks the company permission (`files.ts:91-99`)                                              | None found |

---

## 3. The delivery link and 6-digit code

**Actors.** The supplier (uploads the proof of delivery); the buyer's receiving contact (no account); the buyer;
operators (resend the code, confirm receipt); an attacker.

**Data flow.** Supplier uploads proof of delivery → order Delivered, buyer's acceptance clock starts →
`issueDeliveryCode()` makes a token and a 6-digit code (stored hashed) → one SMS to the receiving contact with the
link `/d/<token>` and the code → the contact opens the page, enters the code, records the condition and photos
(`recordReceipt()`) → the buyer still accepts or reports a problem on the order; acceptance releases the money.

**Trust boundaries.** SMS (outside our control) → the receiving contact's phone → a public page with no account.
Supplier → order status.

| STRIDE | Threat                                                  | Existing mitigation                                                                                                         | Gap                                                  |
| ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| S      | Guessing the code                                       | 5 wrong codes lock the link, counted under a row lock (`flow.ts:1068-1095`); operators alerted; form limits per IP          | None found                                           |
| S      | Guessing a link                                         | Random token, stored hashed (`flow.ts:905-918`)                                                                             | 64-bit token; link and code in the same SMS (**L2**) |
| T      | Supplier marks delivered without delivering             | Any upload counts as proof, but money is released only when the buyer accepts or an operator decides a dispute              | Proof is not checked (accepted risk 5)               |
| T      | Supplier confirms receipt itself                        | The code goes only to the buyer's receiving contact; the code is never shown to the supplier (`supplier/orders/actions.ts`) | None found                                           |
| T      | Reusing an old link                                     | A new code ends earlier links; used and expired links refused (`flow.ts:905-918, 1074-1075`)                                | 14-day life (**L2**)                                 |
| R      | Contact denies confirming, or supplier denies the claim | Receipt saved with condition, photos and who received; audited (`flow.ts:1135-1158`); operator path needs a reason          | None found                                           |
| I      | The page shows prices or private details                | Reference and items only, never prices (`flow.ts:1022-1046`)                                                                | None found                                           |
| I      | Code readable from a database copy                      | Code hashed                                                                                                                 | Unsalted SHA-256 of a 6-digit code (**L2**)          |
| D      | Locking the link on purpose with wrong codes            | Operators resend a new code (`resendDeliveryCode()`) or confirm with a reason                                               | None found                                           |
| E      | Confirming receipt releases money                       | It doesn't: the buyer still accepts (`acceptDelivery()`, `flow.ts:1188`)                                                    | None found                                           |

**Business-logic abuse.**

- **Delivery-code guessing:** at most 5 tries per link, then an operator must issue a new one. One in 200,000 per link.
- **Supplier marks delivered without delivery:** the order becomes Delivered and the buyer's clock starts, but nothing
  is paid out until the buyer accepts. The buyer can report a problem (`reportProblem()`, `flow.ts:1232`), which opens
  a dispute with its own clocks. Gap: the proof file is not checked (accepted risk 5).
- **Buyer refuses a good delivery:** there is no automatic acceptance (G13 default, `flow.ts:1596-1605` only audits and
  reminds). The supplier's money stays held until the buyer accepts or a dispute is decided. The receiving contact's
  "Good" receipt and photos are the supplier's evidence. Accepted risk 4.

---

## 4. Payment webhooks

**Actors.** The payment partner (today the simulator, A176); an attacker posting fake events; the worker.

**Data flow.** Buyer starts checkout (`startOnlinePayment()`) → the partner's page (today `/dev/pay/<id>`) → the
partner POSTs a signed event to `/api/v1/payments/webhook` → `receiveWebhook()` checks the signature on the raw body,
stores the event once by its ID, then `processEvent()` applies it once under a row lock and posts to the ledger.

**Trust boundaries.** Internet → the webhook route (anyone can post). The partner → us (we trust only signed events).

| STRIDE | Threat                                           | Existing mitigation                                                                                                  | Gap                                                                              |
| ------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| S      | Forged "payment succeeded" event                 | HMAC signature over the exact body, compared in constant time, before parsing (`sim.ts:115-120`, `money.ts:137`)     | Key derived from AUTH_SECRET (**M3**)                                            |
| S      | Using the simulator in production                | Refused unless `PAYMENT_SIM_ALLOWED=true` (`adapters/payments/index.ts:19-23`); `/dev` pages 404 without the flag    | Keep both off in production                                                      |
| T      | Replayed event                                   | Unique event ID; a processed event returns "duplicate" (`money.ts:141-151`); ledger refs are unique                  | No timestamp check (fine for the simulator; needed for the real partner, **L4**) |
| T      | Event pays the wrong order or a different amount | Order looked up by reference under lock; overpayment goes to unallocated and is audited (`money.ts:317-400`)         | Payment and order not cross-checked; amount taken from the event (**L4**)        |
| R      | Partner and we disagree on what happened         | Every event stored raw; every partner call logged, masked (`adapters/payments/index.ts:50-87`); daily reconciliation | None found                                                                       |
| I      | Event errors leak details                        | The route returns only "processed", "duplicate", "stored" or 400                                                     | None found                                                                       |
| D      | Flooding the webhook                             | nginx body limit 2 MB; signature check is cheap and comes first                                                      | No rate limit; low risk                                                          |
| E      | Webhook used to reach other internal actions     | The route only calls `receiveWebhook()`                                                                              | None found                                                                       |

**Business-logic abuse: replayed or forged webhooks.** A forged event fails the signature. A replayed event has the
same ID and is ignored. A signed event for one payment cannot be replayed as a new payment because the ID is the same.
With the real partner, also check the partner's timestamp and that the payment belongs to the order (**L4**).

---

## 5. Payouts

**Actors.** The worker (payout runs at 11:00 and 16:00 IST); the payment partner; the supplier; Finance operators.

**Data flow.** Buyer accepts (or an advance falls due) → `release()` books the settlement with a payout date →
`runPayouts()` groups due settlements per supplier, skips a supplier with no Active account or a change on hold,
claims the rows in a transaction, asks the partner to pay, and marks the payout Processing → a `payout.processed`
or `payout.failed` webhook settles it.

**Trust boundaries.** Worker → partner; partner → webhook (see section 4).

| STRIDE | Threat                                           | Existing mitigation                                                                                              | Gap                                                       |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| S      | Payout to an account the supplier didn't approve | Only the Active account; a change on hold blocks the run (`money.ts:597-600`)                                    | See section 6                                             |
| T      | Paying the same settlement twice                 | Settlements claimed with `payout_id is null` in one transaction (`money.ts:603-629`); idempotency key per payout | None found                                                |
| T      | Paying a supplier who should not be paid         | Bank hold                                                                                                        | Suspended companies are still paid (**M4**)               |
| R      | Disputes about what was paid                     | Ledger postings, partner call log, daily reconciliation (`money.ts:651`)                                         | Audit log could be changed by the superuser role (**M6**) |
| I      | Account numbers in logs                          | Encrypted; only last four shown; partner log masks account fields (`index.ts:37-48`)                             | Encryption key derived from AUTH_SECRET (**M3**)          |
| D      | A failing partner blocks the run                 | Each supplier separate; failed payouts recorded                                                                  | None found                                                |
| E      | Supplier speeds up their payout                  | Due dates come from settings and the working calendar; no user input                                             | None found                                                |

---

## 6. Bank-account changes

**Actors.** A supplier company admin; the company's other admins; an attacker who took over an admin's account.

**Data flow.** Admin enters the new account → `addBankAccount()` checks the format and asks the bank adapter for a name
match against the GST legal name → admin signs in with a passkey (step-up, 5 minutes) → `confirmBankAccount()` starts
the `bankChangeHold` clock (default 72 hours) and tells every admin by email and SMS → during the hold any admin can
cancel; payouts wait → at the end the new account becomes Active.

**Trust boundaries.** Browser → web app; the person's passkey device; the bank adapter; email and SMS to other admins.

| STRIDE | Threat                                                     | Existing mitigation                                                                                   | Gap                                                                                |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| S      | Attacker with the admin's mailbox changes the bank account | Passkey step-up (`bank.ts:187-189`); 72-hour hold; email and SMS to every admin; any admin can cancel | A passkey added by the attacker counts; no notice when a passkey is added (**M2**) |
| S      | Account in someone else's name                             | Bank adapter name match against the GST legal name (`bank.ts:119-125`)                                | Adapter is simulated until the provider is chosen                                  |
| T      | Shortening or skipping the hold                            | Hold comes from the clock settings (`setClock()`, audited); no code path shortens it                  | First account is active at once (accepted risk 9)                                  |
| T      | Two changes at once                                        | Only one change in progress (`bank.ts:113-118`)                                                       | None found                                                                         |
| R      | Admin denies making the change                             | Audited with before and after last four, the passkey flag, IP and request ID (`bank.ts:217-226`)      | Audit log tamper by the superuser role (**M6**)                                    |
| I      | Account number exposed                                     | AES-256-GCM, cipher never leaves `bank.ts`; only last four shown, logged and sent                     | Key derived from AUTH_SECRET; no key version (**M3**)                              |
| D      | Attacker cancels a real change                             | Cancel is audited; the admin can start again                                                          | None found                                                                         |
| E      | A non-admin changes the account                            | `payout_bank.change` permission for the company (`bank.ts:101, 185`)                                  | A suspended company keeps the permission (**M4**)                                  |

**Business-logic abuse: bank-change fraud after account takeover.** The attacker reads the admin's inbox, signs in with
an email code, adds a passkey, signs in with it, and changes the bank account. Today the hold and the notices are what
stop the money. If the company has one admin, only the SMS (to a verified mobile) reaches the real owner, because the
email goes to the inbox the attacker controls. Fixes: **M2** (older passkey for step-up, notice on new passkey,
user verification required), **H2** for operators, and ask single-admin suppliers to verify their mobile before their
first payout.
