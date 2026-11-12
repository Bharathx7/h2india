// H2 India branding in the CMS (A26): the wordmark (the same file the emails use) and a short icon for the menu.
/* eslint-disable @next/next/no-img-element -- Payload renders these outside Next's image pipeline */
export function Logo() {
  return <img src="/brand/h2india-logo-email.png" alt="H2 India" width={176} height={48} />;
}

export function Icon() {
  return <img src="/brand/h2india-logo-email.png" alt="H2 India" width={88} height={24} />;
}
