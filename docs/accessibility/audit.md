# Accessibility audit

Step 12.4, against WCAG 2.2 level AA. First run on 15 November 2026 (local, development server, both widths).

## Automated checks

`tests/e2e/specs/a11y-routes.spec.ts` runs axe (WCAG 2.0, 2.1 and 2.2 A and AA rules) on every page that takes no
parameter: 67 public pages, 12 member pages, 9 buyer pages, 16 supplier pages and 19 back-office pages, at 1440 and
390 (the back office at 1440 only). Any serious or critical issue fails the test. Pages with a parameter (an article,
a product, an order, a company) are checked by their own specs (19 specs run axe on their screens).

Results of the first run, all fixed in this branch:

| Page                                                         | Problem                                                         | WCAG          | Fix                                                                                           |
| ------------------------------------------------------------ | --------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `/rfq/new` (phone)                                           | The step list scrolls sideways but can't be reached by keyboard | 2.1.1         | The scrolling box takes focus and is named "Steps" (`rfq/Wizard.tsx`)                         |
| `/tracker/methodology`                                       | The status table's scroll box can't be reached by keyboard      | 2.1.1         | `tabIndex={0}`, `role="region"` and a label, as CLAUDE.md asks                                |
| `/directory/companies`                                       | At 320 px the page numbers made the page 693 px wide            | 1.4.10 Reflow | The page numbers wrap                                                                         |
| `/opportunities/tenders`, `/opportunities/grants` and others | At 320 px a card widened its grid to 471 px                     | 1.4.10 Reflow | `grid-cols-1` added to the 189 grids that set columns only from a breakpoint (CLAUDE.md rule) |

After the fixes every page passes at both widths.

## Checklist

| Check                                 | Result                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus visible on every control        | The focus ring is part of every `packages/ui` control; axe and the keyboard specs (sign-in, files, shells) pass.                                                     |
| Skip link                             | "Skip to content" is the first Tab stop on public pages and moves focus to the page (tested).                                                                        |
| Logical focus order                   | Pages follow source order; no positive `tabIndex` in the code.                                                                                                       |
| Form errors announced                 | `Field` (`packages/ui`) ties each hint and error to its input through `aria-describedby` and form-level errors use `Alert` with `live`.                              |
| Dialogs trap and restore focus        | Dialogs and sheets are Radix Dialog (`Overlays.tsx`), which traps focus and returns it to the opener.                                                                |
| Tables have headers                   | Tables use `<th scope="col">`; scrolling tables are named regions.                                                                                                   |
| Tracker charts have text alternatives | Each tracker view has its table and CSV beside the chart (`tracker/views.ts`); the map stand-in has a text label and the list by state.                              |
| Home hero can be paused (2.2.2)       | Nothing on the home page moves by itself (the featured carousel moves only with its arrows), so there is nothing to pause.                                           |
| Motion stops with reduced motion      | `base.css` stops animations under `prefers-reduced-motion: reduce`; tests run with `reducedMotion: "reduce"`.                                                        |
| 320 px wide (1.4.10)                  | Twelve main pages checked at 320 × 640 with no sideways scroll (tested).                                                                                             |
| 200% zoom                             | 1440 at 200% is 720 px wide, between the two tested widths; the layouts are fluid between them. To confirm by hand on the phone flows.                               |
| Contrast of token pairs               | axe's colour-contrast rule runs on every page above with the real token pairs and found none below AA. Green fills carry ink text (`bg-accent` rule, design-tokens). |

## Still to do (owner and date)

| Item                                                                                        | Owner       | By            |
| ------------------------------------------------------------------------------------------- | ----------- | ------------- |
| A keyboard-only pass of flows A to J, recorded here with any problem and its WCAG criterion | Claude Code | Before Gate 2 |
| One flow with a screen reader (NVDA on Windows or VoiceOver on a phone)                     | Founder     | Before Gate 2 |
| 200% zoom by hand on the sign-in, RFQ and checkout flows                                    | Founder     | Before Gate 2 |
| Decide on an external accessibility review before Launch 2                                  | Founder     | Before Gate 3 |
