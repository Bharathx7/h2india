# Workstation setup

Playbook step 0.3. These are the tools needed on the computer where H2 India is built. Run `node scripts/check-env.mjs` in this folder. It prints PASS or FAIL for each tool.

| Tool              | What it is for                                                                                        | Windows                                             | macOS                        |
| ----------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- |
| Node.js 24 LTS    | Runs the website, the background worker and all build tools. Payload needs Node 22.23.4+ or 24.22.1+. | `winget install OpenJS.NodeJS.LTS`                  | `brew install node@24`       |
| pnpm              | Installs the project's packages, the same versions on every machine                                   | `npm install -g pnpm`                               | `npm install -g pnpm`        |
| Git               | Keeps the history of every change                                                                     | `winget install Git.Git`                            | `xcode-select --install`     |
| GitHub CLI (`gh`) | Opens pull requests and checks CI from the terminal                                                   | `winget install GitHub.cli`                         | `brew install gh`            |
| Docker Desktop    | Runs PostgreSQL, Redis, Meilisearch, file storage and a mail catcher locally, with one command        | `winget install Docker.DockerDesktop` (needs WSL 2) | `brew install --cask docker` |
| Claude Code       | Builds each step from this playbook                                                                   | See https://code.claude.com/docs/en/setup           | Same                         |

## Notes for Windows

- Docker Desktop on Windows needs WSL 2. Run `wsl --install` once and restart the computer if Docker asks for it.
- Turn on long paths for Git: `git config --global core.longpaths true`.
- Line endings are kept as LF in the repository (set in `.gitattributes`, step 1.1).

## Connecting Claude Code to the Figma file

Connect Claude Code to Figma's remote MCP server (`https://mcp.figma.com/mcp`) once, from this folder:

1. The repository's `.mcp.json` already adds the server. Start Claude Code in `C:\H2India` and approve the project MCP server when asked. If the file is missing, run `claude mcp add --scope project --transport http figma https://mcp.figma.com/mcp`.
2. Type `/mcp`, select **figma**, choose **Authenticate**, and click **Allow access** in the browser.
3. Sign in with the Figma account that can open the file "hydrogen" (file key `swxSe4zWyngLYdZ2Qe9CWJ`).
4. Check: ask Claude Code to "list the pages of Figma file swxSe4zWyngLYdZ2Qe9CWJ". It should list 21 pages, from 00 Cover to 20 Archive.

You can also use Figma's plugin instead, which adds Figma's skills too: `claude plugin install figma@claude-plugins-official`.

The full list of screens and node IDs is in `docs/figma-index.md`.

## Rules

- Never paste keys, passwords or customer data into Claude Code or chat.
- Never point a local machine at the staging or production database.

## GitHub repository settings (do once)

On https://github.com/Bharathx7/h2india, open **Settings → Branches → Add branch ruleset** (or **Add rule**) for `main`:

1. **Require a pull request before merging**, with 1 approval. You are the approver.
2. **Require status checks to pass**: select `Check, test, build, smoke` and `Secrets and dependencies` once they have run for the first time.
3. **Block force pushes** and **restrict deletions**.
4. Do not allow bypassing the rules, including for administrators.

Under **Settings → Code security**, turn on **Dependabot alerts** and **Secret scanning** (with push protection).
