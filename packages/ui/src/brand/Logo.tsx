import { useId, type SVGProps } from "react";

// Interim "H2 Economy" logo (founder, 16 Nov 2026), until the designer draws the final artwork in Figma: the "H" and
// accent "2" are the approved vector master (873:199282, Inter Extra Bold, outlined); "Economy" is set in the same
// font (Inter Extra Bold) and fitted to a fixed width, so the logo is the same size everywhere. Only colours change. The brand gradient (#22B84F to #3BDF6E) belongs to the logo artwork,
// not to the UI tokens, so this folder is exempt from the token colour check.

export type LogoVersion =
  | "primary"
  | "primary-on-dark"
  | "flat-light"
  | "flat-dark"
  | "on-green"
  | "on-deep-green"
  | "one-colour-ink"
  | "one-colour-white";

const INK = "#1B2126";
const WHITE = "#FFFFFF";
const GREEN = "#30D060";

/** Letters colour and "2 + atom dot" colour per version, from the component description. */
const COLOURS: Record<LogoVersion, { letters: string; accent: string }> = {
  // accent "gradient" = brand gradient
  primary: { letters: INK, accent: "gradient" },
  "primary-on-dark": { letters: WHITE, accent: "gradient" },
  "flat-light": { letters: INK, accent: GREEN },
  "flat-dark": { letters: WHITE, accent: GREEN },
  "on-green": { letters: INK, accent: WHITE },
  "on-deep-green": { letters: WHITE, accent: GREEN },
  "one-colour-ink": { letters: INK, accent: INK },
  "one-colour-white": { letters: WHITE, accent: WHITE },
};

/** The "H" of the approved master; the "2" below keeps its accent. */
const LETTERS = ["M0 30.0818V2.68457H6.6219V13.6809H17.4176V2.68457H24.0261V30.0818H17.4176V19.0721H6.6219V30.0818H0Z"];

/** The artwork's width: the H2 mark (to x 44) and "Economy" fitted to ECONOMY_WIDTH. */
const ECONOMY_WIDTH = 166;
const WIDTH = 44 + ECONOMY_WIDTH + 2;

const TWO =
  "M28.0008 35.9996V33.3734L33.5116 28.5487C33.9247 28.1749 34.2764 27.8331 34.5666 27.5232C34.8567 27.2085 35.078 26.8937 35.2305 26.579C35.383 26.2593 35.4592 25.9125 35.4592 25.5388C35.4592 25.1207 35.3682 24.7642 35.1862 24.4691C35.0043 24.1691 34.7534 23.9379 34.4338 23.7756C34.1141 23.6133 33.7477 23.5322 33.3346 23.5322C32.9165 23.5322 32.5501 23.6182 32.2354 23.7904C31.9206 23.9576 31.6747 24.201 31.4976 24.5207C31.3255 24.8404 31.2394 25.2289 31.2394 25.6863H27.7795C27.7795 24.6584 28.0107 23.7707 28.473 23.0231C28.9353 22.2756 29.5845 21.7002 30.4206 21.2969C31.2616 20.8887 32.2378 20.6846 33.3493 20.6846C34.4952 20.6846 35.4912 20.8764 36.3371 21.26C37.183 21.6436 37.8371 22.1797 38.2994 22.8682C38.7666 23.5518 39.0003 24.3461 39.0003 25.2511C39.0003 25.8265 38.8847 26.397 38.6535 26.9626C38.4224 27.5282 38.0068 28.1528 37.4068 28.8364C36.8117 29.52 35.9658 30.3389 34.869 31.293L33.0616 32.9602V33.0561H39.1847V35.9996H28.0008Z";

export interface LogoProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  version?: LogoVersion;
  /** Height in px; width follows the 212 x 36 artwork. Figma uses 36 in headers. */
  height?: number;
  /** Accessible name. Pass "" when the logo sits inside a link that already says "H2 Economy home". */
  title?: string;
}

export function Logo({ version = "primary", height = 36, title = "H2 Economy", ...rest }: LogoProps) {
  const uid = useId().replace(/:/g, "");
  const c = COLOURS[version];
  const accent = c.accent === "gradient" ? `url(#${uid}-g)` : c.accent;
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg
      width={(height * WIDTH) / 36}
      height={height}
      viewBox={`0 0 ${String(WIDTH)} 36`}
      fill="none"
      focusable="false"
      // The "y" of Economy reaches a little below the artwork box.
      overflow="visible"
      {...a11y}
      {...rest}
    >
      {LETTERS.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill={c.letters} />
      ))}
      <path d={TWO} fill={accent} />
      <text
        x="44"
        y="30.08"
        fontSize="37.7"
        fontWeight={800}
        textLength={ECONOMY_WIDTH}
        lengthAdjust="spacingAndGlyphs"
        fill={c.letters}
        style={{ fontFamily: "var(--font-sans, Inter), Inter, ui-sans-serif, system-ui, sans-serif" }}
      >
        Economy
      </text>
      {c.accent === "gradient" ? (
        <defs>
          <linearGradient
            id={`${uid}-g`}
            x1="29.4497"
            y1="33.7569"
            x2="39.8252"
            y2="26.0302"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#22B84F" />
            <stop offset="1" stopColor="#3BDF6E" />
          </linearGradient>
        </defs>
      ) : null}
    </svg>
  );
}
