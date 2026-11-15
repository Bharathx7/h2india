# After launch: release rhythm and upkeep

Step 13.8.

| Rhythm       | What                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every change | Pull request, CI green (checks, tests, browser suite, CodeQL, secrets and dependencies), founder's approval to merge to `main`, then the Image workflow and a deploy.                      |
| Weekly       | Read the nightly reports; merge Dependabot updates that pass; check `journalctl --disk-usage`.                                                                                             |
| Monthly      | Review alarms that fired and their limits (`ops.alarms`); review grievance and data-rights timings; check Figma for design changes and record them in `docs/decisions.md` before building. |
| Quarterly    | Restore drill from backup (`docs/drills/`); review access (operator roles, GitHub, server SSH); re-run `pnpm privacy:retention` and update the inventory.                                  |
| Yearly       | Breach procedure table-top; security review; penetration test before any large change.                                                                                                     |

Upgrades: Payload stays on 3.x and TypeScript on 6.0 until their blockers clear (`docs/versions.md`). Upgrade one
major dependency per pull request, with the full suite green.
