# India Hydrogen Tracker (step 4.5)

## What a record holds

- One collection per sub-view: Projects, Manufacturing, Pilots, Stations, Prices, State policies, plus Hubs and
  valleys for the map (`apps/web/src/cms/tracker`).
- Every record has a **source** (name, optional link), the source's **type** and an **as-of date** (A34). The type is
  the record's confidence (A35), in the Methodology order: official notice or tender result, filing, company
  announcement, press report. Figures that are estimates are ticked under "Estimated figures" and read, for example,
  "2028 (company estimate)".
- Statuses use the badge words drawn, plus Cancelled for every view and Completed for pilots (A36). Changing the
  status adds a row to the status history with the status date and the source; earlier steps can be added by hand.
- Prices are typed in rupees per kg ("397.00") and stored in paise.

## Recent changes

Publishing a tracker record compares it with its last published version and writes one `tracker-changes` row per
changed figure: field, before, after, the record's source, the date and the editor. A first publish writes
"Record · Added". Drafts write nothing. Readers see changes to sample records only when samples are shown.

## Sample content (F9, A37)

- Seed data is flagged **Sample**. With `FLAG_SAMPLE_CONTENT=false` (production) sample items are never shown to
  readers and can't be published; editors still see them in /cms.
- Set `FLAG_SAMPLE_CONTENT=true` on your machine and on staging to see the design's data. Never in production.
- The end-to-end tests run with the flag off, as production does.

## Keeping it current

The Methodology page promises an update every Monday and fixes within 1 working day. Records not verified for 30
days appear in Data quality (`/api/cms/data-quality`), red after 60; "Mark verified" is
`POST /api/cms/<collection>/<id>/verify`.
