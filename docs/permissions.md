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

| Area            | Super admin | Catalogue moderator | Supplier verifier | Operations | Editor-in-chief | Content editor | Finance |
| --------------- | :---------: | :-----------------: | :---------------: | :--------: | :-------------: | :------------: | :-----: |
| Overview        |    VEDX     |          V          |         V         |     V      |        V        |       V        |    V    |
| Queues          |    VEDX     |         VE          |        VE         |     VE     |       VE        |       V        |         |
| Content         |    VEDX     |                     |                   |            |      VEDX       |       VE       |         |
| Catalogue       |    VEDX     |        VEDX         |         V         |     V      |                 |                |    V    |
| Verification *  |    VEDX     |                     |        VEX        |     V      |                 |                |    V    |
| Orders          |    VEDX     |                     |                   |    VEX     |                 |                |   VX    |
| Money *         |    VEDX     |                     |                   |            |                 |                |   VEX   |
| Users *         |    VEDX     |                     |         V         |     V      |                 |                |    V    |
| Compliance *    |    VEDX     |                     |         V         |            |       VE        |                |         |
| Reports         |    VEDX     |          V          |                   |     VX     |        V        |       V        |   VX    |
| Settings *      |    VEDX     |                     |                   |            |                 |                |         |
| Publish content |      ✓      |                     |                   |            |        ✓        |                |         |

## Defaults

- A person who creates a company becomes its **Admin**.
- A person whose join request is approved becomes a **Requester** (buyer) or **Viewer** (supplier) unless the admin picks another role.
- Two-person approval (656:8) is added with payouts (Stage 10).
