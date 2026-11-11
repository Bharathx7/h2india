import type { SVGProps } from "react";
import { cx } from "../lib/cx";
import { ICON_PATHS, type IconName } from "./paths";

export type { IconName };

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** Rendered size in px. Figma uses 14, 16, 18, 20, 22 and 24. */
  size?: number;
  /** Give a label only when the icon carries meaning on its own; otherwise it is hidden from screen readers. */
  label?: string;
}

/** Outline icons from Figma page 02 (24 px grid, 1.75 stroke, recoloured through currentColor). */
export function Icon({ name, size = 24, label, className, ...rest }: IconProps) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "globe" ? 2 : 1.75}
      strokeLinecap={name === "globe" ? undefined : "round"}
      strokeLinejoin={name === "globe" || name === "pause" ? undefined : "round"}
      focusable="false"
      className={cx("shrink-0", className)}
      {...a11y}
      {...rest}
    >
      {name === "globe" ? (
        // Icon/globe (151:8) is drawn with a circle, a meridian and an equator line at 2 px.
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4C12.2269 4 12.518 4.09945 12.8672 4.43164C13.2216 4.76891 13.5871 5.30403 13.915 6.04199C14.5699 7.51539 15 9.62114 15 12C15 14.3789 14.5699 16.4846 13.915 17.958C13.5871 18.696 13.2216 19.2311 12.8672 19.5684C12.518 19.9005 12.2269 20 12 20C11.7731 20 11.482 19.9005 11.1328 19.5684C10.7784 19.2311 10.4129 18.696 10.085 17.958C9.43012 16.4846 9 14.3789 9 12C9 9.62114 9.43012 7.51539 10.085 6.04199C10.4129 5.30403 10.7784 4.76891 11.1328 4.43164C11.482 4.09945 11.7731 4 12 4Z" />
          <line x1="3" y1="11" x2="21" y2="11" />
        </>
      ) : (
        ICON_PATHS[name].map((d) => <path key={d} d={d} />)
      )}
    </svg>
  );
}

export const ICON_NAMES = [...(Object.keys(ICON_PATHS) as IconName[]), "globe" as const];
