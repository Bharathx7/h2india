# Run H2 India on your Windows computer

One click starts everything and opens the site at http://localhost:3000.

## Before the first time

Node.js 24, pnpm and Docker Desktop must be installed (`docs/setup.md`). Docker Desktop must be able to start (it needs
WSL 2).

## Start

Double-click **`start-local.cmd`** in `C:\H2India`. It:

1. Checks Node.js, pnpm and Docker, and starts Docker Desktop if it is closed.
2. Uses your `.env.local` without changing it. If there is none, it creates one from `.env.example` with a new random
   `AUTH_SECRET`. It prints the names (never the values) of settings your file is missing.
3. Starts the database, Redis, search, file storage and Mailpit in Docker, and the virus scanner in the background.
4. Runs `pnpm install`, the database migrations and the sample data seed (safe to run again).
5. Opens two windows: **H2 India - worker** (sends sign-in codes and other emails) and **H2 India - website**.
6. Waits for the site, then opens http://localhost:3000 in your browser.

For this run only it switches on the design's sample content (`FLAG_SAMPLE_CONTENT=true`, marked sample, never in
production) and switches Coming soon off.

| Address                   | What it is                                                |
| ------------------------- | --------------------------------------------------------- |
| http://localhost:3000     | The website                                               |
| http://localhost:8025     | Mailpit: every email, including sign-in codes, lands here |
| http://localhost:3000/cms | The CMS (needs a signed-in operator)                      |

## Options (from a terminal in `C:\H2India`)

| Command                        | What it does                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `start-local.cmd -ComingSoon`  | Visitors see the pre-launch page. Open the site in a private window, signed out |
| `start-local.cmd -SkipInstall` | Skips `pnpm install` when no packages changed                                   |
| `start-local.cmd -SkipSeed`    | Skips the sample data                                                           |

## Stop

Close the two **H2 India** windows. To stop the database and the other services too, run `pnpm dev:down`.

## If it stops with a message

| Message                       | What to do                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------- |
| Port 3000 is already in use   | An older H2 India window is still open. Close it and start again                  |
| Docker Desktop is not running | Start Docker Desktop, wait for "Engine running", start again                      |
| Invalid or missing settings   | Add the named settings to `.env.local` (see `.env.example` and `docs/secrets.md`) |
| The website did not answer    | Read the error in the **H2 India - website** window                               |
