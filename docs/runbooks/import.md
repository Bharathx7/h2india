# Importing content and companies (step 4.6)

## Commands

```
pnpm import:glossary terms.csv            # check only: prints the report, changes nothing
pnpm import:glossary terms.csv --apply    # writes, if no row has a problem
pnpm import:articles | import:schemes | import:tenders | import:events | import:companies <file>
pnpm content:import <type> <file>         # any type: also grants, jobs, standards, tracker-projects,
                                          # tracker-factories, tracker-pilots, tracker-stations, tracker-prices,
                                          # tracker-policies, tracker-hubs
```

Always run the check first and read the report (playbook "You do"). Nothing is written while any row has a problem.

## Files

- CSV with a header row, or JSON (an array of objects). Column names are the CMS field names, for example `term`,
  `short`, `aliases`; groups use dots in CSV (`source.name`, `source.tier`) or nested objects in JSON.
- `slug` is the stable key: the same slug updates the same item. Without it, the slug is made from the title, so
  keep titles stable or give slugs.
- Lists: separate with `;` in CSV (`PEM; Alkaline`), or use a JSON array.
- Yes/no fields: `yes`/`no`. Dates: `2026-11-04`, `2026-11-04 15:00` or `2026-11` (India time).
- Links to other items use their slug (authors, topics, tags, schemes); editors by email.
- Rich text (article bodies, chapters): Markdown.
- Images and PDFs are not imported; add them in /cms.
- `publish`: `yes` makes the item live at once. Allowed for records, glossary, standards and tracker rows; articles
  always arrive as drafts for the Editor-in-chief (A39). Without it, new items are drafts, and a change to a live item
  is saved as a draft beside the live version.

## The report

Row numbers match the file: in a CSV the first data row is row 2 (row 1 is the header); in JSON the first item is
row 1. Each problem names the field and what is wrong. Rows are checked by saving them through the CMS inside a
transaction that is rolled back, so the rules are exactly the ones editors meet in /cms.

## Companies

`pnpm import:companies companies.csv` with columns `key` (stable, lower-case with dashes), `legal_name`,
`trade_name`, `kind` (supplier, buyer or both), `types`, `city`, `state` (as GST writes it, for example Maharashtra),
`website`, `categories`, `summary`, `founded`, `employees`. Companies are created **Unclaimed** with no members (A38):
they don't appear in Join search until claimed (step 6.7).

## Sample data

`pnpm db:seed` loads the design's sample companies, glossary terms, tracker records and reports, all flagged sample
(A40). It is safe to run again. With `FLAG_SAMPLE_CONTENT=true` (your machine, staging) they are published; with it
off they arrive as drafts and stay hidden (A37). Each Stage 5 page adds its own frame's sample data to `apps/web/seed`.
