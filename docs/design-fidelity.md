# Design fidelity: how a build is compared with Figma

Playbook step 2.6. The Figma file is the reference: **hydrogen** (`swxSe4zWyngLYdZ2Qe9CWJ`).

## Components

1. Every component set on Figma page 02 is rebuilt in `packages/ui` and shown in the gallery at `/dev/ui`,
   one section per Figma section, labelled with the Figma node IDs.
2. Variants become props, not separate components (Button v2 has 90 frames: `variant` × `size`, with hover,
   pressed, focus and disabled as real CSS states).
3. Values come only from the tokens (`docs/design-tokens.md`). A difference is fixed in code, never by
   changing a token; if the design itself looks wrong, it is raised as a question.
4. Checks that run on every pull request (`tests/e2e/specs/gallery.spec.ts`, at 1440 and 390):
   accessibility (axe, WCAG 2.2 AA), keyboard use of interactive controls, Button v2 sizes, and the
   required states.

## Screenshot baselines

Screenshots differ between browsers and operating systems, so baselines are made by the CI browser, not on a
laptop.

1. Run the CI workflow with `E2E_VISUAL=1` and `--update-snapshots` (a manual "update baselines" run).
2. Download the report artefact, look at every image once, properly, against the Figma frames.
3. When you approve them, commit the images. From then on any change in appearance fails CI and the report
   shows before, after and the difference.

Baselines approved carelessly are worse than none. Until the first set is approved, the visual comparison is
switched off (`E2E_VISUAL` unset) and the other checks still run.

## Pages

For each screen in a pull request:

1. Fetch the Figma frame screenshot through the Figma MCP server (frame IDs are in `docs/figma-index.md`).
2. Capture the built page at the same width (1440 or 390) with the same sample data.
3. Put them side by side in the pull request and list every difference with either a fix or a reason.
4. Show each data section's loading, empty and error states (`?state=` in development) and compare them with
   the state boards.

## Known differences

| Where                                 | Difference                                                                                                                         | Why                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Chip (unselected)                     | 32 px tall in code; Figma draws it 35 px because its 1.5 px stroke is counted in layout                                            | Selected and unselected chips line up in a row                                                          |
| Select                                | Closed trigger matches Figma; the open list is the browser's own until the Menu component (21:372) is built                        | Accessible and native on phones; replaced in the Navigation section                                     |
| Glass blur                            | CSS blur is half the Figma radius                                                                                                  | Decision D-UI3, to confirm visually                                                                     |
| Date picker                           | Single date only for now; the range mode (span in fresh-200) is added with the reports screens                                     | Not needed before reports                                                                               |
| Toast placement                       | Bottom right on desktop, bottom on phones                                                                                          | Figma shows the toast, not where it sits; decision D-UI5                                                |
| Data table on phones                  | Rows become cards with label and value pairs                                                                                       | Figma says "Rows become cards below 768 px" without a card frame; check against the mobile list screens |
| Workspace shell on tablets and phones | 768 to 1023: icon rail (72 px) with the wordmark moved to the top bar; below 768: the sidebar opens as a drawer from a menu button | Figma has the v2 shell at 1200 only; rule from decision M17                                             |
| Site header between 768 and 1023      | Uses the mobile header and full-screen menu; the desktop header starts at 1024                                                     | Decision M17                                                                                            |
| Site header search                    | The trigger opens the Search overlay (372:7217), which is built with search in Stage 4                                             | Needs the search service                                                                                |
| Footer                                | Language selector hidden (M15); social buttons show only once their addresses are set                                              | No addresses yet                                                                                        |
| Footer wordmark                       | Drawn as SVG text so it is not read out                                                                                            | It is decoration                                                                                        |
