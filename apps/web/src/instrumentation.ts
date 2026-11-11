// Runs once when the server starts. The app refuses to start with a missing or malformed setting,
// and names it (playbook step 1.6).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { parseClientEnv, parseServerEnv, readFlags } = await import("@h2india/config");
  parseServerEnv();
  parseClientEnv();
  readFlags();
}
