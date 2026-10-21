#!/usr/bin/env python3
"""Build banner.ans: an 80-column ANSI banner in the style of 1990s BBS art.

Original artwork in that tradition: block letters with dithered shading in
the 16-colour ANSI palette, a drop shadow, and a "release info" box. Run it
again after editing the letters, colours or text below.
"""
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent / "banner.ans"
WIDTH = 80

RESET = "\x1b[0m"
ESCAPES = re.compile(r"\x1b\[[0-9;]*m")

# The 16-colour palette by name, as foreground codes; background is +10.
BLACK, BLUE, CYAN, WHITE = 30, 34, 36, 37
GREY, BRIGHT_BLUE, BRIGHT_CYAN, BRIGHT_WHITE, BRIGHT_MAGENTA = 90, 94, 96, 97, 95
MAGENTA = 35


def sgr(*codes):
    return f"\x1b[{';'.join(map(str, codes))}m"


# 4x6 pixel letters. Each pixel is two columns wide, so pixels come out square.
FONT = {
    "T": ["####", ".##.", ".##.", ".##.", ".##.", ".##."],
    "E": ["####", "#...", "###.", "#...", "#...", "####"],
    "X": ["#..#", "#..#", ".##.", ".##.", "#..#", "#..#"],
    "B": ["###.", "#..#", "###.", "#..#", "#..#", "###."],
    "A": [".##.", "#..#", "#..#", "####", "#..#", "#..#"],
    "C": [".###", "#...", "#...", "#...", "#...", ".###"],
    "K": ["#..#", "#.#.", "##..", "#.#.", "#..#", "#..#"],
    "D": ["###.", "#..#", "#..#", "#..#", "#..#", "###."],
    "R": ["###.", "#..#", "###.", "#.#.", "#..#", "#..#"],
    "O": [".##.", "#..#", "#..#", "#..#", "#..#", ".##."],
    "P": ["###.", "#..#", "###.", "#...", "#...", "#..."],
}

# One style per pixel row, top to bottom: a shade character, its colour, and
# the colour behind it. Solid rows are spaces on a background colour, since a
# background fills the whole line height and leaves no seam between rows.
# The dithered rows in between are what make it read as ANSI art.
TEXT_ROWS = [
    (" ", None, BRIGHT_WHITE), (" ", None, BRIGHT_CYAN), ("▓", BRIGHT_CYAN, CYAN),
    (" ", None, CYAN), ("▓", CYAN, BLUE), ("▒", BLUE, BLACK),
]
BACKDROP_ROWS = [
    (" ", None, BRIGHT_MAGENTA), ("▓", BRIGHT_MAGENTA, MAGENTA), (" ", None, MAGENTA),
    ("▓", MAGENTA, BLUE), (" ", None, BLUE), ("▒", BLUE, BLACK),
]
SHADOW = sgr(BLUE) + "░░"


def cell(style):
    char, fg, bg = style
    codes = ([fg] if fg else []) + [bg + 10]
    return sgr(*codes) + char * 2 + RESET


def word(text, rows):
    """Block letters for one word, with a shadow one pixel down and right."""
    glyphs = [FONT[c] for c in text]
    grid = [".".join(g[r] for g in glyphs) for r in range(6)]
    width = len(grid[0])
    lit = lambda r, c: 0 <= r < 6 and 0 <= c < width and grid[r][c] == "#"
    lines = []
    for r in range(7):
        line = ""
        for c in range(width + 1):
            if lit(r, c):
                line += cell(rows[r])
            elif lit(r - 1, c - 1):
                line += SHADOW
            else:
                line += "  "
        lines.append(line + RESET)
    return lines


def visible(s):
    return len(ESCAPES.sub("", s))


def centre(s):
    return " " * ((WIDTH - visible(s)) // 2) + s


def fade_bar():
    # A shading ramp across the full width, dark to bright and back.
    ramp = [(GREY, "░"), (BLUE, "░"), (BLUE, "▒"), (BRIGHT_BLUE, "▓"), (CYAN, "▓"), (BRIGHT_CYAN, "█")]
    half = WIDTH // 2
    out = ""
    for i in range(WIDTH):
        step = min(i, WIDTH - 1 - i) * len(ramp) // half
        colour, char = ramp[min(step, len(ramp) - 1)]
        out += sgr(colour) + char
    return out + RESET


def info_box():
    title = " TEXT BACKDROP · RELEASE INFO "
    rows = [
        ("Type", "GNOME Shell extension"),
        ("Platform", "GNOME 50 on Wayland"),
        ("Formats", "plain text · ANSI colour · Markdown"),
        ("Sheets", "up to 4 per monitor, each with its own font"),
        ("Updates", "redraws the moment the file changes"),
        ("License", "GPL-2.0-or-later"),
    ]
    inner = 62
    frame = lambda s: sgr(BLUE) + s + RESET
    top = (frame("╔═══[") + sgr(1, BRIGHT_WHITE) + title + RESET
           + frame("]" + "═" * (inner - len(title) - 5) + "╗"))
    body = []
    for key, value in rows:
        text = (sgr(BRIGHT_CYAN) + f" {key} " + sgr(GREY) + "." * (12 - len(key))
                + " " + sgr(WHITE) + value + RESET)
        body.append(frame("║") + text + " " * (inner - visible(text)) + frame("║"))
    bottom = frame("╚" + "═" * inner + "╝")
    return [top, *body, bottom]


def build():
    lines = [fade_bar(), ""]
    lines += [centre(l) for l in word("TEXT", TEXT_ROWS)]
    lines += [centre(l) for l in word("BACKDROP", BACKDROP_ROWS)]
    lines += ["", fade_bar(), ""]
    lines += [centre(l) for l in info_box()]
    lines += ["", centre(sgr(GREY) + "an ANSI example for Text Backdrop · examples/ansi-banner" + RESET)]
    for line in lines:
        if visible(line) > WIDTH:
            raise ValueError(f"line is {visible(line)} columns, room for {WIDTH}")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    OUT.write_text(build(), encoding="utf-8")
    print(f"wrote {OUT.name} ({WIDTH} columns)")
