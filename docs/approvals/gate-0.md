# Gate 0: approve the plan

Playbook step 0.7 · prepared 11 Nov 2026 · for the H2 India founder.

Nothing is built until this page is approved. This is the "analyse, plan, approve, build" order you asked for.

## What will be built

H2 India, exactly as the Figma file "hydrogen" shows (739 screens on pages 03 to 17), following the Development Execution Playbook v1.0 (`docs/playbook.pdf`). Where the design or the playbook is silent, `docs/decisions.md` says what is built until you decide. Nothing is invented: prices, thresholds, dates and legal wording stay as visible placeholders.

## Order of work

| Batch                   | Playbook stages                                                                                           | Status                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 0 · Plan                | 0                                                                                                         | This page                                |
| 1 · Foundations         | 1–3: project, rules, checks, design system from Figma, sign-in, companies, roles, files, timers, messages | Starts after this approval               |
| 2 · Content and website | 4–5                                                                                                       | Next                                     |
| 3 · Marketplace         | 6–7                                                                                                       |                                          |
| 4 · Suppliers and RFQs  | 8–9                                                                                                       |                                          |
| 5 · Launch 1            | 11 (Launch 1 steps), 12, 13.1–13.6                                                                        | Public launch: no orders or payments     |
| 6 · Orders and payments | 10, 11.5, 11.6, 12 again, 13.7                                                                            | **On hold** (your decision, 11 Nov 2026) |

You approve after each batch, from a short summary, screenshots of built pages next to the Figma frames, and a link to see it running.

## Technology (details in `docs/adr/`, all marked Proposed)

| Decision               | Proposed                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0001 Application shape | One Next.js app plus one background worker, in one repository (pnpm monorepo)                                          |
| 0002 Database          | PostgreSQL. Drizzle for platform and commerce tables, Payload's adapter for content. Money in whole paise.             |
| 0003 Sign-in           | Better Auth (passkey, email code, Google, companies), proved by a test first. Passkeys need the final domain (**M1**). |
| 0004 Content           | Payload CMS 3.93 inside the app. Stay on 3.x; 4.0 is still in beta.                                                    |
| 0005 Search            | Meilisearch in Mumbai. Search never shows prices.                                                                      |
| 0006 Hosting           | AWS Mumbai (ap-south-1), built from code (Terraform). Deploys from GitHub Actions.                                     |
| 0007 Payments          | One adapter with a stand-in. No payment vendor needed until Batch 6.                                                   |

Versions checked today are in `docs/versions.md`. Notable: Node 24 LTS, Next.js 16.4, TypeScript pinned to 6.0 (7.0 is out, but the lint tools don't support it yet).

## What the old hy-gen code gives us (`docs/audit-existing.md`)

We copy ideas and small proven pieces, not modules:

- the paise money helpers and rounding
- the security patterns
- the explicit status maps
- the CSV export
- the prepared font files
- the Playwright settings for slow machines

No live data needs moving if you confirm the live site holds demo data only (**M14**).

## Your decisions already recorded (11 Nov 2026)

- **C8:** Launch 1 has no ordering. Accept quote shows a screen saying it is available in Launch 2. The screen still needs designing in Figma, after your approval.
- **M23:** Categories follow the Figma design. We launch with the named categories; the counts shown in Figma are sample data.
- **C10:** The word "escrow" is hidden. The replacement wording is still to be approved, and only affects Batch 6 screens.
- Batch 6 is on hold, so the payment, tax and cancellation questions are parked.
- **Correction to the playbook:** gap G13 is answered by the design. A delivered order is accepted automatically when the 5 working days end.

## Answers needed before or during Batch 1 (defaults are used until then)

| ID                  | Question                                                          | Default until you answer                                        |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| **M1**              | Final domain, and what happens to hydro.deecodes.io               | Build and test locally. Staging waits for a domain.             |
| **M13**             | Expected traffic, uptime target, monthly hosting budget           | Smallest staging sizes. Production sized later.                 |
| **M14**             | Must any live hy-gen data be kept?                                | No migration (the live site is a demo)                          |
| **M15**             | English only for now?                                             | Yes, English only. The language selector stays a placeholder.   |
| **M17**             | Tablet widths between 390 and 1440                                | Fluid layout with breakpoints at 768 and 1024                   |
| **F5**              | Delete the unused Wide hero variants?                             | Do not build them                                               |
| **C6**              | Is the mobile number a sign-in method?                            | No: verification and recovery only, as the sign-in screen shows |
| **M4, M5, M6, M18** | Verification, SMS and WhatsApp, email providers, holiday calendar | Stand-ins that behave like the real services                    |

## How Batch 1 will run (please approve)

1. **Code is written and tested in Claude's own workspace and pushed to GitHub.** Your computer gets the code with `git pull` into `C:\H2India`. This keeps the heavy work off your computer: the old notes show builds taking 10 to 25 minutes and test runs running out of memory.
2. **GitHub:** create an organisation (suggested `h2india`) and an empty private repository `h2india`, or tell me the account and name to use. When Batch 1 starts, you approve Claude's access to that repository.
3. **AWS and the domain** are needed only for the staging site (step 1.7). Everything else in Batch 1 can start without them.

## Costs

Nothing is bought by this plan. Known upcoming costs:

- the domain
- AWS (estimated in step 1.7 once **M13** is answered)
- later, message and verification providers, priced by their own plans

No figures are given here because none have been quoted yet.

## Approval

- [x] I approve the plan, the batch order and the technology choices above (ADRs 0001 to 0007 become Accepted).
- [x] I approve building in Claude's workspace and pushing to GitHub, with `C:\H2India` as my local copy.
- [x] GitHub repository: `https://github.com/Bharathx7/h2india`

Approved by the founder in chat on 11 Nov 2026, 18:13 IST. Changes made at approval:

- Hosting: the existing server instead of AWS (ADR 0006 amended).
- Domain (M1): deferred. Work locally first and move to the server later.
