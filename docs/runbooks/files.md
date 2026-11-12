# Files and uploads (step 3.7)

## How it works

1. The browser asks `POST /api/v1/files` to start. The server checks who may upload this kind, the declared type and
   size (limits in `packages/config/src/files.ts`, decision A20) and returns a signed PUT link to the
   **quarantine** bucket that works for 10 minutes.
2. The browser uploads straight to storage, then calls `POST /api/v1/files/{id}/complete`.
3. The worker (`files` queue) reads the file, checks the real size, scans it with ClamAV, checks the type from the
   bytes, re-encodes images (metadata removed; 320, 640 and 1280 px WebP copies; SVG logos become PNG, A21), writes it
   to the **private** or **public** bucket and marks it Available. Anything else is Rejected with a reason.
4. `GET /api/v1/files/{id}/link` checks permission and redirects to a signed link that works for 5 minutes. Opening a
   Work ID or verification document is written to the audit log.

## Setting up storage

- Three buckets: quarantine and private with no public access; public readable by anyone (or through the CDN set in
  `S3_PUBLIC_URL`).
- Quarantine needs CORS for browser uploads: allow `PUT` from the app's origin with any header.
- Add a lifecycle rule on quarantine that deletes objects after 1 day (uploads that were never finished).
- `docker compose up` starts MinIO and ClamAV; `docker compose --profile init up minio-init` creates the buckets.

## ClamAV

- `clamav/clamav:1.5` updates its signatures itself (freshclam). The first start downloads them and takes a few
  minutes; uploads wait in "Checking file…" until it answers, and the queue retries.
- If the scanner is down, files stay Checking. Nothing is ever marked clean without a scan.

## CMS uploads (step 4.4)

Images and report PDFs that editors upload in /cms are scanned with ClamAV before Payload stores them; an infected file
is refused ("This file failed the virus check") and, if the scanner can't be reached, the upload fails and can be
tried again. Images go to the public bucket under `cms/`; report PDFs to the private bucket under `cms-reports/`,
opened by readers only through the gated download's 5-minute link.

## Checking it yourself (playbook "You do")

1. Download the EICAR test file from eicar.org (it is harmless and every scanner flags it).
2. On Lost email → "Or send a support request", add it as the Work ID.
3. The row says it failed the virus check and was deleted; the file never reaches the private bucket and has no link.
4. The audit log has a `file.virus_found` entry with the virus name.

## Work ID retention

A support request's Work ID is deleted 30 days after support marks the request handled (A22). The housekeeping job
(`sweepFiles`, scheduled with the clocks in step 3.8) removes files past their date, abandons uploads older than 24
hours that never finished, and re-queues checks that were never queued.
