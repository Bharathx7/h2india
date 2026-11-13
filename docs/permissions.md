# Permissions (step 3.4)

Playbook Section 10: three layers, checked in this order on every request: platform role (visitor, member, company user, operator), company role, operator role. The values below are seeded into the database (`core.roles`, `core.permissions`, `core.role_permissions`) from `packages/core/src/authz/catalogue.ts`; changing them in the database applies at once. Every rule is enforced on the server by `can()` and the query scope; hiding a button is not security.

## Buyer company roles (Figma 575:696)

| Permission                                                   | Admin | Approver | Requester |
| ------------------------------------------------------------ | :---: | :------: | :-------: |
| See the company profile and settings                         |   ✓   |    ✓     |     ✓     |
| Change company details and settings                          |   ✓   |          |           |
| Invite people, answer join requests, change roles and limits |   ✓   |          |           |
| Set approval thresholds and second approvers                 |   ✓   |          |           |
| Submit verification documents                                |   ✓   |          |           |
| See quote requests                                           |   ✓   |    ✓     |     ✓     |
| Send quote requests                                          |   ✓   |    ✓     |     ✓     |
| See orders                                                   |   ✓   |    ✓     |     ✓     |
| Place orders up to their own limit                           |   ✓   |    ✓     |     ✓     |
| Approve orders up to their own limit                         |       |    ✓     |           |
| Read and send messages                                       |   ✓   |    ✓     |     ✓     |
| See fees, invoices and payouts                               |   ✓   |    ✓     |           |

## Supplier team roles (Figma 592:371)

| Permission                                                   | Admin | Sales | Catalogue | Finance | Viewer |
| ------------------------------------------------------------ | :---: | :---: | :-------: | :-----: | :----: |
| See the company profile and settings                         |   ✓   |   ✓   |     ✓     |    ✓    |   ✓    |
| Change company details and settings                          |   ✓   |       |           |         |        |
| Invite people, answer join requests, change roles and limits |   ✓   |       |           |         |        |
| Submit verification documents                                |   ✓   |       |           |         |        |
| See quote requests                                           |   ✓   |   ✓   |     ✓     |    ✓    |   ✓    |
| Answer quote requests with quotes                            |   ✓   |   ✓   |           |         |        |
| See orders                                                   |   ✓   |   ✓   |     ✓     |    ✓    |   ✓    |
| Accept, dispatch and update orders                           |   ✓   |   ✓   |           |         |        |
| Read and send messages                                       |   ✓   |   ✓   |     ✓     |    ✓    |   ✓    |
| Add and change products and datasheets                       |   ✓   |       |     ✓     |         |        |
| Change the storefront                                        |   ✓   |       |     ✓     |         |        |
| See fees, invoices and payouts                               |   ✓   |       |           |    ✓    |   ✓    |
| Change the payout bank account (needs a passkey)             |   ✓   |       |           |         |        |

Order limits are per person (`memberships.order_limit_paise`), as in 575:696 ("Orders up to ₹10 lakh").

## Operator roles (Figma 656:8)

Only the **Finance** grid is drawn; the other six are drafted from each role's description for the founder to review. V view, E create or edit, D delete, X export. Sensitive areas (moves money, shows bank or personal data, or changes who can do what) are marked *.

| Area                    | Super admin | Catalogue moderator | Supplier verifier | Operations | Editor-in-chief | Content editor | Finance |
| ----------------------- | :---------: | :-----------------: | :---------------: | :--------: | :-------------: | :------------: | :-----: |
| Overview                |    VEDX     |          V          |         V         |     V      |        V        |       V        |    V    |
| Queues                  |    VEDX     |         VE          |        VE         |     VE     |       VE        |       V        |         |
| Content                 |    VEDX     |                     |                   |            |      VEDX       |       VE       |         |
| Catalogue               |    VEDX     |        VEDX         |         V         |     V      |                 |                |    V    |
| Verification *          |    VEDX     |                     |        VEX        |     V      |                 |                |    V    |
| Orders                  |    VEDX     |                     |                   |    VEX     |                 |                |   VX    |
| Money *                 |    VEDX     |                     |                   |            |                 |                |   VEX   |
| Users *                 |    VEDX     |                     |         V         |     V      |                 |                |    V    |
| Compliance *            |    VEDX     |                     |         V         |            |       VE        |                |         |
| Reports                 |    VEDX     |          V          |                   |     VX     |        V        |       V        |   VX    |
| Settings *              |    VEDX     |                     |                   |            |                 |                |         |
| Publish content         |      ✓      |                     |                   |            |        ✓        |                |         |
| Change operator roles * |      ✓      |                     |                   |            |                 |                |         |

Changing operator roles (`roles.manage`, step 3.6) is kept to Super admin, as the playbook asks in step 11.4. The last Super admin can't be removed. The Audit log screen (656:872) sits with Users: reading it needs Users view, exporting it needs Users export (only Super admin today).

## Content (Stage 4)

- Content editors draft everything; the Editor-in-chief (or a Super admin) publishes articles, Hydrogen 101 chapters,
  buyer's guides, reports, videos and podcasts. Records, glossary terms and standards are published by any editor
  (A30).
- Imports (step 4.6) run from the command line with database access, so only people who can run the app's commands
  can import. Imported content lands as drafts, except records, glossary, standards and tracker rows marked
  publish=yes (A39); articles always go through the Editor-in-chief.
- Pre-seeded companies (A38) have no members and are Unclaimed: nobody can act for them or ask to join them until the
  company claims its profile (step 6.7).
- Tracker records (step 4.5) are published by any editor, like records (A30); Recent changes are written by the system
  and only Content delete can remove a wrong entry.
- Sample content (F9, A37): with FLAG_SAMPLE_CONTENT off, nobody can publish a sample-flagged item and readers never
  see one; editors still do.
- Report leads (step 4.4, A33) are personal data: only operators with Content export (Editor-in-chief, Super admin) can
  see them; Content delete runs the 24-month clean-up on demand. Report PDFs open for editors in the CMS and for
  readers only through the gated download.
- Home (step 5.1): any editor updates the Home figures (A45). Only Settings edit (a Super admin) sees and changes the
  Pre-launch setting, the Coming soon launch line and allow-list (A44, A48); the CMS carries settings.edit for this.
  Early listing requests (A47) are personal data like report leads: Content export to see them, Content delete to
  remove them; nobody creates them in the CMS.
- While Coming soon is on, signed-in operators and the allow-listed emails see the real site; everyone else, members
  included, sees the pre-launch page.

## Files (step 3.7)

Who may upload and open each kind of file (`packages/core/src/files/rules.ts`). The uploader can always open their own file.

| Kind                     | Upload                                           | Open (company)                | Open (operators)  |
| ------------------------ | ------------------------------------------------ | ----------------------------- | ----------------- |
| Verification document    | Submit verification documents                    | Submit verification documents | Verification view |
| Work ID (lost email)     | Anyone, signed out (20 per IP address per hour)  | —                             | Users view        |
| Quote attachment         | Send quote requests or answer them               | See quote requests            | Queues view       |
| Datasheet, product image | Add and change products                          | See the company profile       | Catalogue view    |
| Logo                     | Signed in (company logo: Change company details) | See the company profile       | Catalogue view    |
| Delivery photo           | The delivery link (Stage 10)                     | See orders                    | Orders view       |

## Defaults

- A person who creates a company becomes its **Admin**.
- A person whose join request is approved becomes a **Requester** (buyer) or **Viewer** (supplier) unless the admin picks another role.
- Two-person approval (656:8) is added with payouts (Stage 10).

## Who does what at launch (A172, 13 Nov 2026)

Reporting line: Founder (Super admin) → Editor-in-chief → Content editor. Working hours Monday to Saturday, 9:30 AM to
6:30 PM IST, minus holidays.

| Queue     | Main                | Back-up           |
| --------- | ------------------- | ----------------- |
| Suppliers | Supplier verifier   | Super admin       |
| Listings  | Catalogue moderator | Supplier verifier |
| RFQs      | Operations          | Super admin       |
| Content   | Editor-in-chief     | Content editor    |
| Events    | Content editor      | Editor-in-chief   |
| Jobs      | Content editor      | Operations        |
| Comments  | Content editor      | Editor-in-chief   |

First operators: the founder (the only Super admin), an Operations lead (Operations and Supplier verifier), an
Editor-in-chief and a Content editor. A Catalogue moderator joins when listings pass about 50 a week; Finance with
Launch 2. Every operator uses a passkey. The Content editor writes and edits but cannot publish; the Editor-in-chief
reviews, does legal checks, publishes, and handles corrections and grievances.

India H₂ Weekly goes out every Monday at 8:00 AM IST (the composer suggests it); schedule by Sunday evening after a
test send.
