import { cx } from "../lib/cx";

// Steps in 3D (founder v2, 18 Nov 2026): every "how it works" sequence on the site uses this, so steps look the same
// everywhere. Each step is a raised card (token float shadow) with its number on a domed coin ringed off the card; a
// rail joins the coins. At rest the cards are flat so their text stays sharp; hovering a card (or
// focusing inside it) lifts it and tips it back on the shared perspective. The numbers are real order (these are sequences), so they stay. Reduced motion: base.css makes the
// change instant. Tones: "dark" for ink bands (glass cards), "light" for white and mint bands.

export interface Step3D {
  title: string;
  text: string;
}

export function Steps3D({
  steps,
  tone = "light",
  label,
  className,
}: {
  steps: Step3D[];
  tone?: "light" | "dark";
  label?: string;
  className?: string;
}) {
  const dark = tone === "dark";
  const cols = steps.length >= 4 ? "lg:grid-cols-4" : steps.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <ol
      aria-label={label}
      className={cx(
        "relative isolate grid grid-cols-1 gap-4 [perspective:1600px] md:grid-cols-2 md:gap-5",
        cols,
        className,
      )}
    >
      {/* The rail behind the coins, from the first coin to the last (one row, from 1024 px). */}
      <span
        aria-hidden="true"
        className={cx(
          "absolute top-10 right-[12%] left-[12%] hidden h-0.5 rounded-pill lg:block",
          dark ? "bg-fresh-500/40" : "bg-fresh-200",
        )}
      />
      {steps.map((s, i) => (
        <li
          key={s.title}
          data-reveal-item=""
          className={cx(
            "group relative flex flex-col gap-3 rounded-card p-6 pt-5",
            "transition-[transform,box-shadow] duration-(--motion-duration-slow) ease-standard",
            "hover:[transform:translateY(-6px)_rotateX(4deg)] focus-within:[transform:translateY(-6px)_rotateX(4deg)]",
            dark
              ? "border border-neutral-0/12 bg-neutral-0/6 shadow-ink-float backdrop-blur-glass-16"
              : "border border-default bg-page shadow-ink-float-sm hover:shadow-ink-float",
          )}
        >
          <span
            className={cx(
              "relative flex size-11 items-center justify-center rounded-pill type-label-lg text-primary",
              "bg-linear-to-b from-fresh-300 to-fresh-500 shadow-ink-float-sm ring-4",
              dark ? "ring-ink-900" : "ring-neutral-0",
            )}
          >
            {i + 1}
          </span>
          <h3 className={cx("type-label-lg", dark ? "text-inverse" : "text-primary")}>{s.title}</h3>
          <p className={cx("type-body-sm", dark ? "text-neutral-0/80" : "text-body")}>{s.text}</p>
        </li>
      ))}
    </ol>
  );
}
