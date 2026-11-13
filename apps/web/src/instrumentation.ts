// Runs once when the server starts. The app refuses to start with a missing or malformed setting,
// and names it (playbook step 1.6).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { parseClientEnv, parseServerEnv, readFlags } = await import("@h2india/config");
  parseServerEnv();
  parseClientEnv();
  readFlags();
  // Switches changed in System settings (step 11.8) reach this server within 30 seconds.
  const { refreshFlagOverrides } = await import("@h2india/core/admin/system");
  await refreshFlagOverrides();
  setInterval(() => void refreshFlagOverrides(), 30_000).unref();
}

/**
 * Logs every server error with its digest (the reference the 500 page shows) and the request ID from the proxy, so a
 * reference quoted to support leads to the request and its audit entries (step 5.10).
 */
export function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
): void {
  const digest = (error as { digest?: string }).digest ?? null;
  const requestId = request.headers["x-request-id"] ?? null;
  console.error(
    JSON.stringify({
      level: "error",
      event: "request.error",
      digest,
      requestId,
      method: request.method,
      path: request.path,
    }),
  );
}
