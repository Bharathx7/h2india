"""Build the self-hosted font files for H2 India (playbook step 2.2).

Google's CSS subsets leave out characters this product needs (₹ in the latin
subset, and ₂ and → in every Manrope subset), so the fonts are subset here from
the complete upstream files instead.

Usage (from the repo root, with fontTools and brotli installed):
    python3 -I scripts/fonts/build_fonts.py <manrope.ttf> <InterVariable.woff2> <IBMPlexMono-Medium.woff2>

Sources used on 11 Nov 2026:
    Manrope[wght].ttf          google/fonts, ofl/manrope (v4.505)
    InterVariable.woff2        npm inter-ui 4.1.1, variable/
    IBMPlexMono-Medium.woff2   npm @ibm/plex-mono 2.5.0, fonts/complete/woff2/
"""

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path("apps/web/src/fonts")

# Latin, Latin Extended, IPA/modifiers, combining marks, Latin Extended Additional,
# punctuation, super/subscripts, currency (₹ is U+20B9), letterlike, arrows,
# maths operators, geometric shapes, BOM and replacement character.
UNICODES = (
    "U+0000-024F,U+0259,U+02B0-02FF,U+0300-036F,U+1E00-1EFF,U+2000-206F,"
    "U+2070-209F,U+20A0-20C0,U+2100-214F,U+2190-21FF,U+2200-22FF,U+25A0-25FF,U+FEFF,U+FFFD"
)

REQUIRED = {0x20B9: "₹", 0x2082: "₂", 0x2192: "→", 0x00D7: "×", 0x2022: "•"}

# Only the weights the 15 Figma text styles use.
JOBS = [
    # (source arg index, output name, axis limits)
    (0, "manrope-variable.woff2", {"wght": (700, 800)}),
    (1, "inter-variable.woff2", {"wght": (400, 600)}),
    (2, "ibm-plex-mono-500.woff2", None),
]


def build(src: str, out: Path, limits: dict | None) -> None:
    font = TTFont(src, lazy=False)
    options = subset.Options()
    options.flavor = "woff2"
    # Default shaping features plus the ones the product uses: tabular and
    # lining figures for prices and reference numbers, sub/superscripts, fractions.
    options.layout_features += ["tnum", "lnum", "case", "zero", "frac", "numr", "dnom", "subs", "sinf", "sups"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    if limits and "fvar" in font:
        font = instancer.instantiateVariableFont(font, limits)
    cmap = font.getBestCmap()
    missing = [ch for cp, ch in REQUIRED.items() if cp not in cmap]
    if missing:
        raise SystemExit(f"{out.name}: missing required glyphs {''.join(missing)}")
    font.flavor = "woff2"
    font.save(out)
    print(f"{out.name}: {len(cmap)} characters, {out.stat().st_size // 1024} KB")


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)
    for index, name, limits in JOBS:
        build(sys.argv[1 + index], OUT / name, limits)


if __name__ == "__main__":
    main()
