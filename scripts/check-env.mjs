#!/usr/bin/env node
// Playbook step 0.3: checks the tools needed to build H2 India and prints one line per tool.
// Run from the project folder:  node scripts/check-env.mjs
import { execSync } from "node:child_process";

const tools = [
  {
    name: "Node.js",
    cmd: "node -v",
    need: "24 LTS (Payload needs ^22.23.4 or >=24.22.1)",
    ok: (v) => /^v(2[4-9]|[3-9]\d)\./.test(v) || /^v22\.(2[3-9]|[3-9]\d)\./.test(v),
  },
  { name: "pnpm", cmd: "pnpm -v", need: "any recent version", ok: (v) => !!v },
  { name: "Git", cmd: "git --version", need: "any recent version", ok: (v) => !!v },
  { name: "GitHub CLI", cmd: "gh --version", need: "any recent version", ok: (v) => !!v },
  {
    name: "Docker",
    cmd: "docker --version",
    need: "Docker Desktop running (for the local database, Redis, search and file storage)",
    ok: (v) => !!v,
  },
  {
    name: "Docker running",
    cmd: 'docker info --format "{{.ServerVersion}}"',
    need: "start Docker Desktop",
    ok: (v) => !!v,
  },
  { name: "Claude Code", cmd: "claude --version", need: "installed and signed in", ok: (v) => !!v },
];

let failed = 0;
for (const t of tools) {
  let out;
  try {
    out =
      execSync(t.cmd, { stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim()
        .split("\n")[0] ?? "";
  } catch {
    out = "";
  }
  const pass = t.ok(out);
  if (!pass) failed++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${t.name.padEnd(15)} ${out || "not found"}${pass ? "" : `  -> needs: ${t.need}`}`,
  );
}
console.log(failed ? `\n${failed} check(s) failed. See docs/setup.md.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
