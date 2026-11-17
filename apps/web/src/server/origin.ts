// This app's public address for redirects (founder QC, 17 Nov 2026). Behind nginx, request.url is the container's own
// address (http://localhost:3000), so a redirect built from it sent people to localhost after Log out. APP_URL is set
// per container at run time (h2economy.co, admin.h2economy.co), unlike NEXT_PUBLIC_APP_URL, which is fixed at build.

export function siteUrl(path: string): URL {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000");
}
