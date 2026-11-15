# Consent records

Step 12.2: "every consent the design collects is stored with its wording version and a timestamp". Checked on
15 November 2026.

| Consent                                    | Where it's stored                                                                | Words or version                               | When                         |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| Newsletter (double opt-in)                 | `core.newsletter_subscribers`                                                    | `consent_version` (required)                   | `created_at`, `confirmed_at` |
| Cookies (analytics)                        | `core.cookie_consents`, and the `h2_consent` cookie                              | `version` (`COOKIE_CONSENT_VERSION`)           | `created_at`                 |
| Terms at sign-up                           | `core.users`, `core.join_drafts`                                                 | `terms_version`                                | `terms_accepted_at`          |
| Gated report: share with the sponsor       | CMS `report-leads` (`cms/knowledge/gate.ts`)                                     | `consentText` and `consentVersion`             | created time                 |
| Webinar: share with the sponsor            | `core.webinar_registrations`                                                     | `consent_text` and `consent_version`           | `created_at`                 |
| Members directory listing (M24)            | `core.consent_records` (purpose `member-directory`), new in step 12.2            | `wording` and `version` (`consent/wording.ts`) | `at`                         |
| Marketing messages per topic and channel   | `core.consent_records` (purpose `marketing:<topic>:<channel>`), new in step 12.2 | `wording` and `version`                        | `at`                         |
| People directory (people the editors list) | CMS `people`: `consentRecorded` and `consentEvidence`                            | The evidence text (how and when they agreed)   | Editor's entry               |
| Early listing before launch                | CMS `early-listings`                                                             | The exact words shown (`consentText`)          | created time                 |

Notes:

- Sponsor sharing is optional: when a person doesn't tick it, no consent words or version are stored, and nothing is
  shared.
- Directory and marketing choices are recorded only when they change, in the same transaction as the change. Turning
  one off is recorded the same way (`granted = false`).
- The words a member sees on their profile page come from `directoryConsentWording()`, so the record and the screen
  can't drift. Bump `DIRECTORY_CONSENT_VERSION` or `MARKETING_CONSENT_VERSION` whenever the words change.
- Download my data (`exportMemberData()`) includes the consent history; erasure deletes it with the account.
- Analytics and other tracking scripts load only after consent (`consent/Analytics.tsx`, never for operators); the
  security headers allow the analytics tool's origin only when `NEXT_PUBLIC_ANALYTICS_SRC` is set.
