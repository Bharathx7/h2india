# Design tokens

The colours, type, spacing, radius, shadows and motion values come from the Figma file
**hydrogen** (`swxSe4zWyngLYdZ2Qe9CWJ`), page **01 Design System**. Nobody types a hex code in the app.

| What                                                                | Where                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Source of truth (the Figma export)                                  | `packages/ui/tokens.json`                                            |
| Generated CSS (Tailwind theme, CSS variables, text-style utilities) | `packages/ui/src/styles/tokens.css`                                  |
| Generated TypeScript (values for charts, emails, tests)             | `packages/ui/src/tokens.ts`                                          |
| Base rules (focus ring, selection, reduced motion, tabular figures) | `packages/ui/src/styles/base.css`                                    |
| Fonts (subset, self-hosted)                                         | `apps/web/src/fonts/`, built by `scripts/fonts/build_fonts.py`       |
| Every token rendered for comparison                                 | `/dev/tokens` (local `pnpm dev`; staging with `FLAG_DEV_PAGES=true`) |

## Using them

| Figma                                                            | Class                                                                                                                                                                                               | Notes                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `text/primary`, `text/body`, `text/secondary`, `text/link` ...   | `text-primary`, `text-body`, `text-secondary`, `text-link`                                                                                                                                          |                                                               |
| `bg/page`, `bg/subtle`, `bg/mint`, `bg/accent`, `bg/inverse` ... | `bg-page`, `bg-subtle`, `bg-mint`, `bg-accent`, `bg-inverse`                                                                                                                                        | `bg-success` is the subtle fill, as in Figma                  |
| `border/default`, `border/control`, `border/focus` ...           | `border-default`, `border-control`, `border-focus`                                                                                                                                                  |                                                               |
| `icon/primary`, `icon/accent`, `icon/link` ...                   | `text-icon-primary`, `text-icon-accent`, `text-icon-link`                                                                                                                                           | Icons draw in `currentColor`                                  |
| Primitives `fresh/50`, `ink/500` ...                             | `bg-fresh-50`, `text-ink-500`                                                                                                                                                                       | Prefer the semantic class                                     |
| `space/16`, `space/24` ...                                       | `p-4`, `gap-6` ...                                                                                                                                                                                  | Figma's code syntax is `calc(var(--spacing) * n)`             |
| `radius/control`, `card`, `modal`, `feature`, `pill`             | `rounded-control`, `rounded-card`, `rounded-modal`, `rounded-feature`, `rounded-pill`                                                                                                               |                                                               |
| `size/control/small`, `medium`, `large`                          | `h-8`, `h-10`, `h-12` or `h-(--size-control-medium)`                                                                                                                                                | 32, 40, 48 px                                                 |
| Shadow/Soft, Lift, Float small, Float, Header                    | `shadow-soft`, `shadow-ink-lift`, `shadow-ink-float-sm`, `shadow-ink-float`, `shadow-ink-header`                                                                                                    | Names from each effect's description                          |
| Focus/Ring                                                       | automatic on `:focus-visible`                                                                                                                                                                       | White ring inside `data-surface="inverse"`                    |
| Blur/Glass 16, 20                                                | `backdrop-blur-glass-16`, `backdrop-blur-glass-20`                                                                                                                                                  | See decision D-UI3                                            |
| Motion easing                                                    | `ease-standard`, `ease-enter`, `ease-exit`                                                                                                                                                          | Durations: `duration-(--motion-duration-base)`                |
| Text styles                                                      | `type-display`, `type-h1` ... `type-h4`, `type-body-lg`, `type-body`, `type-body-sm`, `type-label-lg`, `type-label`, `type-label-sm`, `type-label-nav`, `type-caption`, `type-spec`, `type-eyebrow` | One class sets family, weight, size, line height and tracking |

Tailwind's default palette, type scale, radii, shadows and easings are switched off, so `bg-red-500` or
`text-3xl` produce nothing. `pnpm lint` also fails on any hex colour, `rgb()` literal, arbitrary colour
class (`bg-[#fff]`) or default-palette class outside the generated files.

**Green fills take ink text, never white** (fresh/500 is "Primary fill, never text").

## When the design changes

The Figma REST API for variables needs an Enterprise plan, so the export runs through the Figma MCP
server from Claude Code:

1. Ask Claude Code: "Run `packages/ui/scripts/figma-export.js` with the Figma MCP `use_figma` tool on
   file swxSe4zWyngLYdZ2Qe9CWJ and save the result as `packages/ui/tokens.figma.json`." The script only reads.
2. `pnpm tokens:diff` lists added (+), removed (-) and changed (~) tokens.
3. If the changes are intended: `pnpm --filter @h2india/ui exec node scripts/tokens.mjs diff tokens.figma.json --write`,
   then `pnpm tokens:build`, then compare `/dev/tokens` with the Figma page.
4. Commit `tokens.json` and the generated files together. CI fails if the generated files are stale.

Who re-runs the sync when the design changes is an open question for you (playbook step 2.1).

## Fonts

| Family                              | Weights kept | Used by                          |
| ----------------------------------- | ------------ | -------------------------------- |
| Manrope (variable)                  | 700 to 800   | Display, Heading H1 to H3        |
| Inter (variable, optical size kept) | 400 to 600   | Heading H4, Body, Label, Caption |
| IBM Plex Mono                       | 500          | Spec, Eyebrow                    |

Rebuild with `python3 -I scripts/fonts/build_fonts.py <Manrope[wght].ttf> <InterVariable.woff2> <IBMPlexMono-Medium.woff2>`
(sources listed in the script). The build fails if ₹, ₂, →, × or • is missing.
