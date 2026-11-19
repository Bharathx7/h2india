// Security headers for every page and API response (step 12.1). Set in proxy.ts at request time, not in next.config,
// because the production image is built once with throwaway settings and the storage address is only known at run time.
//
// The script policy allows inline scripts: most public pages are pre-rendered (static), and a per-request nonce would
// make every page dynamic. Moving to nonces is open decision A180 (docs/security/review-2026-11-15.md, finding M1).
// Everything else is strict: no plugins, no framing by other sites, forms post only to us, scripts only from us.

export interface HeaderOptions {
  /** next dev needs eval for its error overlay and a websocket for reloads. */
  dev: boolean;
  /** Origins the browser talks to for files: the signed upload links (S3_ENDPOINT) and the public bucket. */
  storageOrigins: string[];
  pathname: string;
  /** The analytics tool's origin (NEXT_PUBLIC_ANALYTICS_SRC, M10); it loads only after consent (consent/Analytics). */
  analyticsOrigin?: string | null;
}

/** The origin of an address, or nothing when it isn't one (settings are checked elsewhere). */
export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// The old advanced editor (/cms) needed eval and jsDelivr; it closed on 19 Nov 2026 (one CMS, in /admin/content), so
// every page now gets the same strict script policy.
export function contentSecurityPolicy({ dev, storageOrigins, analyticsOrigin }: HeaderOptions): string {
  const storage = [...new Set(storageOrigins)];
  const script = ["'self'", "'unsafe-inline'"];
  if (dev) script.push("'unsafe-eval'");
  const analytics = analyticsOrigin ? [analyticsOrigin] : [];
  script.push(...analytics);
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", script],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    // Article and event pictures can come from an editor's link (https only); files from storage.
    ["img-src", ["'self'", "data:", "blob:", "https:", ...storage]],
    ["font-src", ["'self'", "data:"]],
    // Replays and podcasts play from their host in the browser's own player (M9, @h2india/core/media).
    ["media-src", ["'self'", "blob:", "https:", ...storage]],
    ["connect-src", ["'self'", ...storage, ...analytics, ...(dev ? ["ws:", "wss:"] : [])]],
    ["worker-src", ["'self'", "blob:"]],
    // YouTube videos in articles and knowledge pages play from the privacy-enhanced host only (A195, lib/youtube.ts).
    ["frame-src", ["'self'", "https://www.youtube-nocookie.com"]],
    ["frame-ancestors", ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["manifest-src", ["'self'"]],
  ];
  const parts = directives.map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!dev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

/** Every response's security headers. HSTS is set by nginx, which terminates TLS (infra/nginx/h2india.conf). */
export function securityHeaders(options: HeaderOptions): [string, string][] {
  return [
    ["Content-Security-Policy", contentSecurityPolicy(options)],
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "DENY"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    // Uploads use the file picker, never the camera API; the delivery page takes photos through <input capture>.
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"],
    ["Cross-Origin-Opener-Policy", "same-origin"],
  ];
}
