import { tokens } from "@h2india/ui/tokens";

// Email clients ignore CSS variables, so emails take literal values from the same Figma tokens as the site.
const c = tokens.color;

export const colour = {
  page: c["bg/page"],
  subtle: c["bg/subtle"],
  border: c["border/default"],
  primary: c["text/primary"],
  body: c["text/body"],
  secondary: c["text/secondary"],
  link: c["text/link"],
  warning: c["text/warning"],
  accent: c["bg/accent"],
} as const;

const inter = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const manrope = "Manrope, Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const mono = "'IBM Plex Mono', Consolas, 'Courier New', monospace";

// Figma text styles used by the email frames (Figma page 16).
export const type = {
  h2: { fontFamily: manrope, fontWeight: 800, fontSize: "28px", lineHeight: "34px", letterSpacing: "-0.7px" },
  body: { fontFamily: inter, fontWeight: 400, fontSize: "16px", lineHeight: "26px" },
  bodySmall: { fontFamily: inter, fontWeight: 400, fontSize: "14px", lineHeight: "22px" },
  label: { fontFamily: inter, fontWeight: 600, fontSize: "14px", lineHeight: "20px" },
  caption: { fontFamily: inter, fontWeight: 400, fontSize: "12px", lineHeight: "18px" },
  eyebrow: {
    fontFamily: mono,
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    letterSpacing: "0.96px",
    textTransform: "uppercase" as const,
  },
} as const;
