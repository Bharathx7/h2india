# Personal data inventory

<!-- Written by `pnpm privacy:inventory` from packages/core/src/compliance/inventory.ts. Don't edit by hand. -->

What personal data H2 India holds, why, for how long, who can read it and which outside processor receives it
(step 12.2, DPDP Act 2023). **Not decided** means the founder and the lawyer still have to set the period; the
retention job (`pnpm privacy:retention`) reports what each period would remove and acts only once it is set.
Processors are named by role until each vendor is chosen and its processing agreement is signed.

## Processors

- Hosting provider (server, database, backups)
- Email provider
- SMS provider
- WhatsApp provider
- Payment partner
- GSTIN check provider

## Database (core schema)

| Table | Personal fields | Purpose | Basis | Kept for | Who can read it | Processors |
| --- | --- | --- | --- | --- | --- | --- |
| `users` | `name`, `email`, `email_verified`, `mobile`, `mobile_verified_at`, `image`, `job_role`, `terms_accepted_at`, `terms_version`, `suspend_reason` | The account: sign-in, messages, the name shown to the person's team and trading partners | Legitimate use: contract | **Not decided** | The person; operators with users.view; company admins see name and email of their own team | Hosting provider (server, database, backups); Email provider; SMS provider; WhatsApp provider |
| `accounts` | `account_id`, `access_token`, `refresh_token`, `id_token`, `password` | Sign-in methods (Better Auth) | Legitimate use: security | Until the account is erased | Nobody reads these; the sign-in code only | Hosting provider (server, database, backups) |
| `sessions` | `token`, `ip_address`, `user_agent` | Keeping a person signed in; showing their signed-in devices | Legitimate use: security | Until the session expires | The person (devices list); operators investigating abuse | Hosting provider (server, database, backups) |
| `passkeys` | `name`, `public_key`, `credential_id`, `aaguid` | Passkey sign-in and step-up for money and bank changes | Legitimate use: security | Until removed or the account is erased | The person | Hosting provider (server, database, backups) |
| `verifications` | `identifier`, `value` | Sign-in codes and links | Legitimate use: security | One day after expiry (verifications-prune) | Nobody; codes are checked, never shown | Hosting provider (server, database, backups) |
| `sign_in_throttle` | `key` | Limiting sign-in attempts per email and address | Legitimate use: security | Until the limit window ends (throttle-prune) | Nobody | Hosting provider (server, database, backups) |
| `rate_limits` | `key` | Limiting requests per address | Legitimate use: security | Until the limit window ends | Nobody | Hosting provider (server, database, backups) |
| `join_drafts` | `email`, `mobile`, `full_name`, `job_role`, `terms_accepted_at`, `terms_version`, `mobile_verified_at` | Join answers kept until the email is proved | Legitimate use: contract | Until the draft expires | The person (with the link) | Hosting provider (server, database, backups); Email provider; SMS provider |
| `recovery_requests` | `new_mobile`, `new_email`, `contact_name`, `contact_company`, `contact_email`, `document_file_id`, `email_verified_at`, `mobile_verified_at`, `new_mobile_verified_at` | Getting back into an account (lost email or phone) | Legitimate use: security | **Not decided** | Support operators (users.edit) | Hosting provider (server, database, backups); Email provider; SMS provider |
| `invitations` | `email` | Inviting a colleague to a company | Legitimate use: contract | **Not decided** | The company's admins | Hosting provider (server, database, backups); Email provider |
| `memberships` | `user_id`, `role`, `order_limit_paise` | Who belongs to which company, with what role | Legitimate use: contract | While the person is in the company | The company's team; operators | Hosting provider (server, database, backups) |
| `member_profiles` | `persona`, `topics`, `states`, `listed`, `profile` | The member profile and, if they choose, the members directory (M24) | Consent | Until changed or the account is erased | The person; signed-in members when listed | Hosting provider (server, database, backups) |
| `consent_records` | `user_id`, `purpose`, `granted`, `wording`, `version` | Proof of what a person agreed to inside their account, and when | Legitimate use: legal obligation | Until the account is erased | The person (Download my data); compliance operators | Hosting provider (server, database, backups) |
| `learning_progress` | `user_id`, `quiz`, `seconds_spent` | Hydrogen 101 progress | Legitimate use: contract | Until the account is erased | The person | Hosting provider (server, database, backups) |
| `alerts` | `user_id`, `label`, `query`, `filters` | Alerts the person set up | Consent | Until deleted or the account is erased | The person | Hosting provider (server, database, backups); Email provider; WhatsApp provider |
| `follows` | `user_id`, `label` | Companies and topics the person follows | Legitimate use: contract | Until unfollowed | The person | Hosting provider (server, database, backups) |
| `saved_items` | `user_id`, `title` | Saved items | Legitimate use: contract | Until removed | The person | Hosting provider (server, database, backups) |
| `compare_lists` | `user_id` | Products picked to compare | Legitimate use: contract | Until changed | The person | Hosting provider (server, database, backups) |
| `job_applications` | `user_id`, `role`, `company` | Jobs the member clicked Apply on (A70); nothing goes to the employer | Legitimate use: contract | **Not decided** | The person | Hosting provider (server, database, backups) |
| `notification_preferences` | `user_id`, `enabled` | What messages the person wants | Consent | Until the account is erased | The person | Hosting provider (server, database, backups) |
| `notification_settings` | `user_id`, `quiet_hours`, `quiet_from`, `quiet_to`, `unsubscribed_all` | Quiet hours and unsubscribe from everything | Consent | Until the account is erased | The person | Hosting provider (server, database, backups) |
| `notifications` | `user_id`, `title`, `body` | In-app notifications | Legitimate use: contract | 90 days (97:2564) | The person | Hosting provider (server, database, backups) |
| `notification_deliveries` | `recipient`, `payload`, `user_id` | Record of each email, SMS and WhatsApp sent, for retries and support | Legitimate use: contract | **Not decided** | Operators (system.view) | Hosting provider (server, database, backups); Email provider; SMS provider; WhatsApp provider |
| `audit_log` | `actor_id`, `acting_as_id`, `ip`, `user_agent`, `before`, `after`, `reason` | Who changed what (step 3.6); secrets and codes are masked | Legitimate use: legal obligation | 8 years (AUDIT_RETENTION_YEARS) | Operators with audit.view | Hosting provider (server, database, backups) |
| `status_history` | `actor_id`, `reason` | Who moved a record to which status | Legitimate use: legal obligation | As long as the record | The record's companies; operators | Hosting provider (server, database, backups) |
| `newsletter_subscribers` | `email`, `topics`, `monthly_note`, `consent_version`, `confirmed_at`, `unsubscribed_at` | India H₂ Weekly and digests (double opt-in) | Consent | **Not decided** | Newsletter editors (content.export) | Hosting provider (server, database, backups); Email provider |
| `newsletter_deliveries` | `subscriber_id` | Which issue went to whom, so each is sent once | Consent | **Not decided** | Nobody reads it per person | Hosting provider (server, database, backups) |
| `cookie_consents` | `browser_id`, `version`, `analytics` | Proof of each cookie choice; a random browser id, no name or email. Pseudonymous: the id is random and lives in the person's own cookie. | Consent | **Not decided** | Compliance operators | Hosting provider (server, database, backups) |
| `webinar_registrations` | `user_id`, `name`, `email`, `organisation`, `role`, `mobile`, `sponsor_consent`, `consent_text`, `consent_version` | Webinar seats, reminders and the replay; the sponsor only with consent | Consent | **Not decided** | Events editors; the sponsor receives only those who agreed | Hosting provider (server, database, backups); Email provider; WhatsApp provider |
| `grievances` | `name`, `email`, `mobile`, `description`, `files`, `user_id`, `public_note` | Complaints to the grievance officer (IT Rules, DPDP) | Legitimate use: legal obligation | **Not decided** | Compliance operators | Hosting provider (server, database, backups); Email provider |
| `data_rights_requests` | `email`, `user_id`, `details`, `plan`, `resolution` | Access, correction and erasure requests | Legitimate use: legal obligation | **Not decided** | Compliance operators | Hosting provider (server, database, backups); Email provider |
| `listing_reports` | `email`, `reporter_id`, `details`, `attachments` | Reports of a wrong or unlawful listing | Legitimate use: legal obligation | **Not decided** | Takedown operators (compliance.view) | Hosting provider (server, database, backups); Email provider |
| `product_questions` | `asker_id`, `question`, `shared_company`, `attachments` | Questions to a supplier about a listing | Legitimate use: contract | **Not decided** | The asker; the supplier asked | Hosting provider (server, database, backups); Email provider |
| `company_claims` | `claimant_id`, `email`, `email_verified_at`, `gstin`, `letter_file_id`, `reason` | Claiming a company profile | Legitimate use: contract | **Not decided** | Verification operators | Hosting provider (server, database, backups); Email provider; GSTIN check provider |
| `organisations` | `legal_name`, `pan`, `registered_address`, `suspend_reason` | The company record; for a sole proprietor these are the owner's own details | Legitimate use: contract | **Not decided** | The company's team; operators; trading partners see the legal name | Hosting provider (server, database, backups); GSTIN check provider; Payment partner |
| `organisation_gstins` | `gstin`, `legal_name`, `place` | GST registrations for invoices and tax | Legitimate use: legal obligation | **Not decided** | The company's team; trading partners on invoices; operators | Hosting provider (server, database, backups); GSTIN check provider |
| `delivery_sites` | `address`, `contacts` | Where orders are delivered and who receives them | Legitimate use: contract | **Not decided** | The buyer's team; the supplier of an order to that site | Hosting provider (server, database, backups); SMS provider |
| `carts` | `receiver_name`, `receiver_mobile`, `user_id` | Checkout choices before the order is placed | Legitimate use: contract | **Not decided** | The buyer | Hosting provider (server, database, backups) |
| `orders` | `receiver_name`, `receiver_mobile`, `placed_by` | The order, and who receives the delivery (SMS code). Order and tax records are kept as the law requires (GST: at least 6 years from the return); the period is for the CA to confirm (M11). | Legitimate use: contract | **Not decided** | The buyer's and supplier's teams; operators (orders.view) | Hosting provider (server, database, backups); SMS provider; Payment partner |
| `shipments` | `received_by`, `pod_file_ids` | Dispatch, carrier and proof of delivery | Legitimate use: contract | **Not decided** | The order's companies; operators | Hosting provider (server, database, backups) |
| `delivery_links` | `token_hash`, `code_hash` | The receiving contact's delivery link and code (hashed) | Legitimate use: security | **Not decided** | Nobody; checked, never shown | Hosting provider (server, database, backups) |
| `delivery_receipts` | `received_by`, `notes`, `photo_file_ids`, `recorded_by`, `reason` | What arrived, recorded by the receiving contact | Legitimate use: contract | **Not decided** | The order's companies; operators | Hosting provider (server, database, backups) |
| `disputes` | `details`, `photo_file_ids`, `supplier_reply`, `decision_note`, `opened_by`, `decided_by`, `escalated_by`, `supplier_file_ids`, `reason` | Delivery problems and their outcome | Legitimate use: contract | **Not decided** | The order's companies; operations (orders.edit) | Hosting provider (server, database, backups) |
| `order_approvals` | `approver_id`, `on_behalf_of`, `note` | Who approved an order | Legitimate use: contract | **Not decided** | The buyer's team | Hosting provider (server, database, backups) |
| `order_ratings` | `comment`, `rated_by` | The buyer's rating of a completed order | Legitimate use: contract | **Not decided** | The buyer; the supplier sees the rating | Hosting provider (server, database, backups) |
| `messages` | `body`, `author_id`, `attachments` | Messages between a buyer and a supplier | Legitimate use: contract | **Not decided** | The two companies in the thread | Hosting provider (server, database, backups) |
| `message_reads` | `user_id`, `read_at` | Unread counts | Legitimate use: contract | As long as the thread | The person | Hosting provider (server, database, backups) |
| `payout_bank_accounts` | `holder_name`, `account_last4`, `account_cipher`, `ifsc`, `bank_name`, `name_matches` | Where supplier payouts go; the full number is encrypted (bank.ts) | Legitimate use: contract | **Not decided** | The supplier's admins see the last four; finance operators (money.view) | Hosting provider (server, database, backups); Payment partner |
| `payment_webhook_events` | `payload` | The payment partner's messages, kept to process each once and to reconcile. Payloads can carry the payer's email or phone from the partner. | Legitimate use: legal obligation | **Not decided** | Finance operators | Hosting provider (server, database, backups); Payment partner |
| `payment_partner_calls` | `request`, `response` | Our calls to the payment partner, for idempotency and support | Legitimate use: legal obligation | **Not decided** | Finance operators | Hosting provider (server, database, backups); Payment partner |
| `files` | `uploaded_by`, `name` | Uploaded documents and photos (their contents may be personal: IDs, delivery photos) | Legitimate use: contract | Per kind where decided (scheduleFileDeletion, A22); otherwise as long as the record | Per kind (files/rules.ts) | Hosting provider (server, database, backups) |
| `verification_documents` | `name`, `number`, `file_id`, `issued_by` | Supplier verification documents (licences, certificates) | Legitimate use: contract | **Not decided** | The supplier's admins; verification operators | Hosting provider (server, database, backups) |
| `report_schedules` | `email` | Operators' scheduled report emails | Legitimate use: contract | Until removed | Operators with reports.view | Hosting provider (server, database, backups); Email provider |
| `view_as_grants` | `operator_id`, `user_id`, `reason` | Read-only View as sessions (step 11.4) | Legitimate use: security | **Not decided** | Super admins | Hosting provider (server, database, backups) |
| `suspension_appeals` | `reason`, `sent_by`, `note` | Appeals against a suspension | Legitimate use: contract | **Not decided** | The company; user operators | Hosting provider (server, database, backups); Email provider |
| `dead_letters` | `data`, `error` | Failed background jobs; data is masked (step 3.8) | Legitimate use: security | **Not decided** | System operators | Hosting provider (server, database, backups) |

## Content system (cms schema)

| Collection | Personal fields | Purpose | Kept for |
| --- | --- | --- | --- |
| `report-leads` | name, work email, company, role, consent words and version | Who downloaded a gated report; the sponsor only with consent (A33) | 24 months after the download (report-leads-prune) |
| `people` | name, role, organisation, photo, links; consent recorded and its evidence (M24) | The people directory, published only with recorded consent | **Not decided** |
| `early-listings` | company, name, work email, mobile, the exact consent words | Suppliers who asked to be listed before launch | **Not decided** |
| `submissions` | name, email, phone and what they sent (events, press releases, corrections, contact, partnership) | Public forms and the Submissions queue | **Not decided** |
| `editors / authors / team-members` | name, photo, bio, role | Bylines and the About page, published by agreement with the person | **Not decided** |

## Files

Uploaded files (`core.files`, object storage) can themselves hold personal data: ID documents for account
recovery, delivery and damage photos, profile photos, verification documents. Who may open each kind is in
`packages/core/src/files/rules.ts`; files are opened only by 5-minute signed links.

## Tables with no personal data

`alert_sends`, `analytics_daily`, `analytics_events`, `approval_delegations`, `brand_dealers`, `brands`, `buyer_settings`, `cart_items`, `catalogue_applications`, `catalogue_attributes`, `catalogue_categories`, `catalogue_category_applications`, `catalogue_changes`, `catalogue_classes`, `company_profiles`, `datasheet_extractions`, `deadlines`, `dispatch_date_changes`, `holidays`, `join_requests`, `ledger_lines`, `ledger_transactions`, `message_threads`, `newsletter_sends`, `operator_roles`, `order_accounts`, `order_lines`, `order_milestones`, `order_settlements`, `page_views`, `payments`, `payouts`, `permissions`, `product_imports`, `product_revisions`, `products`, `project_list_items`, `project_lists`, `queue_claims`, `queue_field_comments`, `queue_saved_views`, `quote_lines`, `quote_payment_lines`, `quote_versions`, `quotes`, `reconciliation_issues`, `reference_sequences`, `refunds`, `report_daily`, `rfq_items`, `rfq_moderation_decisions`, `rfq_revisions`, `rfq_suppliers`, `rfqs`, `role_permissions`, `roles`, `search_misses`, `search_outbox`, `setting_proposals`, `settings`, `sim_partner_events`, `storefront_revisions`, `supplier_badges`, `supplier_reviews`, `template_approvals`, `verification_checks`
