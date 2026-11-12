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
- Report leads (step 4.4, A33) are personal data: only operators with Content export (Editor-in-chief, Super admin) can
  see them; Content delete runs the 24-month clean-up on demand. Report PDFs open for editors in the CMS and for
  readers only through the gated download.

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
