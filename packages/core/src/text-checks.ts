// Plain checks on text people type (security fixes, 16 Nov 2026). Written without regular expressions that can
// backtrack, so a long crafted input can't make the server slow (CodeQL js/polynomial-redos).

/** "ravi@greenfield.in": one @, something before it, a dot inside the domain, no spaces, at most 254 characters. */
export function looksLikeEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 5 || v.length > 254 || /\s/.test(v)) return false;
  const at = v.indexOf("@");
  if (at < 1 || at !== v.lastIndexOf("@")) return false;
  const domain = v.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}

/** A full web address with a dotted host: https only, or http too with `allowHttp`. At most 2048 characters. */
export function looksLikeWebAddress(value: string, opts: { allowHttp?: boolean } = {}): boolean {
  const v = value.trim();
  if (v.length === 0 || v.length > 2048 || /\s/.test(v)) return false;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return false;
  }
  const okProtocol = url.protocol === "https:" || (opts.allowHttp === true && url.protocol === "http:");
  const host = url.hostname;
  const dot = host.lastIndexOf(".");
  return okProtocol && dot > 0 && dot < host.length - 1;
}

/** `value` without any `ch` at its start or end: trimChars("--a-b--", "-") is "a-b". */
export function trimChars(value: string, ch: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === ch) start++;
  while (end > start && value[end - 1] === ch) end--;
  return value.slice(start, end);
}

/** `value` without any `ch` at its end: trimEndChars("/news///", "/") is "/news". */
export function trimEndChars(value: string, ch: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === ch) end--;
  return value.slice(0, end);
}
