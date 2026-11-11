# Outside accounts and vendors

Playbook step 0.2. Each account needs a person to open it. Claude Code writes the paperwork and the code against sandbox keys. It never holds live keys, bank details or portal logins.

Keys are stored in a secrets manager (or a local `.env.local` for your machine only). They are never pasted into chat, documents or code.

## Needed for Batches 1 and 2 (start now)

| Account                                                                                     | What H2 India needs it for                                                                                                                       | What you need to open it                                                                                                              | Owner | Status      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| **GitHub** organisation and a private repository (suggested: org `h2india`, repo `h2india`) | Source code, pull requests, automatic checks (CI), deploys                                                                                       | A GitHub account. An organisation is free for private repositories. Add Claude's GitHub access to the repository when Batch 1 starts. | You   | Not started |
| **Domain** (decision **M1**)                                                                | Staging address now (for example `staging.<domain>`), production later. Passkeys are tied to the domain, so settle it before real users sign up. | Buy or choose the domain. Decide what happens to hydro.deecodes.io.                                                                   | You   | Not started |
| **AWS** account, region Mumbai (ap-south-1)                                                 | Staging and production hosting: containers, PostgreSQL, Redis, file storage, CDN, logs (playbook Section 7)                                      | Company card for billing. Turn on MFA for the root user and never use the root user day to day. Set a monthly budget alert (**M13**). | You   | Not started |
| **Google Cloud** project                                                                    | "Continue with Google" sign-in (step 3.2)                                                                                                        | A Google account. Create OAuth credentials with the staging and production addresses.                                                 | You   | Not started |
| **Sentry** (or similar)                                                                     | Error tracking with request IDs (step 1.7)                                                                                                       | Free tier is enough for staging                                                                                                       | You   | Not started |

## Needed later (Batches 3 to 5). Fakes are used until then.

| Account                                           | Used for                                                             | Decision | Sandbox                  | Typical paperwork                                                                                                                                                               | Status      |
| ------------------------------------------------- | -------------------------------------------------------------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| GSTIN, PAN, CIN and bank-account verification API | Join flow GSTIN check, verification tiers, payout account name match | **M4**   | Most providers offer one | Company documents and an agreement                                                                                                                                              | Not started |
| Email sending service                             | Sign-in codes, 23 email templates, newsletter                        | **M6**   | Yes                      | Verify the sending domain (SPF, DKIM, DMARC)                                                                                                                                    | Not started |
| SMS with DLT registration                         | Sign-in OTP, delivery OTP, order dispatched                          | **M5**   | Partial                  | DLT entity registration, sender header and each template registered. **Approval takes time. Submit the three templates exactly as designed (Figma 668:194, 668:232, 668:270).** | Not started |
| WhatsApp Business provider                        | 8 designed templates                                                 | **M5**   | Yes                      | Business verification. Each template needs approval.                                                                                                                            | Not started |
| Map tiles                                         | Directory map, ecosystem map, hubs and valleys                       | **M7**   | Yes                      | Must show India's boundaries correctly                                                                                                                                          | Not started |
| Datasheet reader (AI extraction)                  | Reading supplier datasheet PDFs                                      | **M8**   | —                        | Decide where files may be processed                                                                                                                                             | Not started |
| Video and audio hosting                           | Videos, webinar replays, podcasts                                    | **M9**   | —                        | —                                                                                                                                                                               | Not started |
| Analytics                                         | Site analytics, after cookie consent                                 | **M10**  | —                        | —                                                                                                                                                                               | Not started |
| Penetration-test vendor                           | External test before each launch                                     | **M22**  | —                        | Prefer a CERT-In empanelled firm                                                                                                                                                | Not started |

## On hold: Batch 6 (orders and payments)

Founder, 11 Nov 2026: hold until further notice.

| Account                                                   | Used for                                                      | Decision       |
| --------------------------------------------------------- | ------------------------------------------------------------- | -------------- |
| Payment partner (Razorpay or Cashfree are named in Doc 2) | Order payment accounts, holds, payouts, refunds, webhooks     | **M3**         |
| Credit partner and letter-of-credit operations            | Pay later, letter of credit                                   | **M19**        |
| Chartered Accountant                                      | TCS, TDS, fee invoice and e-invoicing sign-off                | **M11**        |
| Lawyer                                                    | Payment wording (including "escrow", **C10**), terms, privacy | **M2**, **M3** |

### Questions to send the payment partner when Batch 6 restarts

1. Can each order have its own virtual account for NEFT/RTGS, with the order reference, and what payee name will buyers see?
2. Can funds be held after payment and released only when the buyer accepts the delivery? Is there a maximum hold period?
3. Can refunds be made from held funds, and to the original payment method?
4. Can a payout be split (supplier share, our fee, GST on fee, TCS and TDS shown separately)?
5. Which webhooks exist for payment, hold, release, refund and payout? How are they signed? Can they be replayed?
6. What may we call the held money on our screens? Is "escrow" allowed?
