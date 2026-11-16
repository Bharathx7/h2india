// H2 Economy branding in the CMS (A26): the wordmark (the same file the emails use, 424 x 80) and a short icon for
// the menu.
/* eslint-disable @next/next/no-img-element -- Payload renders these outside Next's image pipeline */
export function Logo() {
  return <img src="/brand/h2economy-logo-email.png" alt="H2 Economy" width={254} height={48} />;
}

export function Icon() {
  return <img src="/brand/h2economy-logo-email.png" alt="H2 Economy" width={127} height={24} />;
}
