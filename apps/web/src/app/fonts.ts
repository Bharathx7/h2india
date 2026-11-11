import localFont from "next/font/local";

// Self-hosted fonts (playbook step 2.2), subset by scripts/fonts/build_fonts.py so that
// ₹, ₂, →, × and • are present. Only the weights the Figma text styles use are included.

export const manrope = localFont({
  src: "../fonts/manrope-variable.woff2",
  variable: "--font-manrope",
  weight: "700 800",
  display: "swap",
});

export const inter = localFont({
  src: "../fonts/inter-variable.woff2",
  variable: "--font-inter",
  weight: "400 600",
  display: "swap",
});

export const plexMono = localFont({
  src: "../fonts/ibm-plex-mono-500.woff2",
  variable: "--font-plex-mono",
  weight: "500",
  display: "swap",
  adjustFontFallback: false,
});

export const fontVariables = `${manrope.variable} ${inter.variable} ${plexMono.variable}`;
