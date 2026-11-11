// Runs on every commit (simple-git-hooks pre-commit). CI runs the full set again.
export default {
  "*.{ts,tsx,mjs,js}": ["prettier --write", "eslint --max-warnings=0 --no-warn-ignored"],
  "*.{json,md,yml,yaml,css}": ["prettier --write"],
  // Type errors anywhere block the commit; tsc checks the whole workspace, not single files.
  "*.{ts,tsx}": () => "pnpm typecheck",
};
