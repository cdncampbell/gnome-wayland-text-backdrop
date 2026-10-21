#!/usr/bin/env python3
"""Build a two-column ANSI cheat sheet for the GitHub CLI from a JSON file.

    build-gh-sheet.py                          team-workflow.json -> gh-team-workflow.ans
    build-gh-sheet.py CONTENT.json OUT.ans     any other content

The layout lives here and the words live in the JSON, so a team can keep its
own version (branch names, environments, rules) outside this repo and build
it with the same script. See team-workflow.json for the format.
"""
import json
import re
import sys
import textwrap
from pathlib import Path

HERE = Path(__file__).resolve().parent

INK, MUTED, BORDER_DIM, PLACEHOLDER = "e7ecf3", "9ba7b8", "56627a", "f39a4f"
GOOD, BAD = "4cc394", "f08070"
COLOURS = {
    "blue": "6c9ff0", "green": "4cc394", "orange": "f39a4f",
    "purple": "ac8af2", "red": "f08070", "grey": "9ba7b8",
}

RESET, BOLD = "\x1b[0m", "\x1b[1m"
ESCAPES = re.compile(r"\x1b\[[0-9;]*m")

BOX = 78            # width of one column's boxes
GAP = "   "
INNER = BOX - 4     # text width inside "│ " and " │"
MAX_COMMAND = 40    # longer commands get a line of their own


def fg(hex_colour):
    r, g, b = (int(hex_colour[i:i + 2], 16) for i in (0, 2, 4))
    return f"\x1b[38;2;{r};{g};{b}m"


def paint(text, colour, *styles):
    return "".join(styles) + fg(colour) + text + RESET


def width(s):
    return len(ESCAPES.sub("", s))


def pad(s, w):
    n = width(s)
    if n > w:
        raise ValueError(f"{ESCAPES.sub('', s)!r} is {n} wide, room for {w}")
    return s + " " * (w - n)


def command(text):
    # <placeholders> stand out, so it's clear what to fill in.
    parts = re.split(r"(<[^>]+>)", text)
    return "".join(paint(p, PLACEHOLDER) if p.startswith("<") else paint(p, INK, BOLD) for p in parts if p)


def section(spec):
    colour = COLOURS[spec.get("colour", "blue")]
    border = lambda s: paint(s, colour)
    title = f" {spec['title'].upper()} "
    lines = [border("╭─") + paint(title, colour, BOLD) + border("─" * (BOX - 3 - len(title)) + "╮")]
    body = []
    if spec.get("note_above"):
        body += [paint(l, MUTED) for l in textwrap.wrap(spec["note_above"], INNER)]

    rows = spec.get("rows", [])
    fits = [cmd for cmd, _ in rows if len(cmd) <= MAX_COMMAND]
    cmd_width = max((len(c) for c in fits), default=0) + 2
    for cmd, desc in rows:
        if len(cmd) > cmd_width - 2:
            # Too long to share a line: the command, then its description indented.
            body.append(command(cmd))
            body += ["  " + paint(l, MUTED) for l in textwrap.wrap(desc, INNER - 2)]
        else:
            wrapped = textwrap.wrap(desc, INNER - cmd_width) or [""]
            body.append(pad(command(cmd), cmd_width) + paint(wrapped[0], MUTED))
            body += [" " * cmd_width + paint(l, MUTED) for l in wrapped[1:]]

    for rule in spec.get("rules", []):
        good = rule.startswith("+")
        mark = paint("✓ ", GOOD, BOLD) if good else paint("✗ ", BAD, BOLD)
        wrapped = textwrap.wrap(rule[1:].strip(), INNER - 2)
        body.append(mark + paint(wrapped[0], INK))
        body += ["  " + paint(l, INK) for l in wrapped[1:]]

    if spec.get("note"):
        body += [paint(l, MUTED) for l in textwrap.wrap(spec["note"], INNER)]

    lines += [border("│ ") + pad(b, INNER) + border(" │") for b in body]
    return lines + [border("╰" + "─" * (BOX - 2) + "╯")]


def column(sections):
    lines = []
    for spec in sections:
        lines += section(spec)
    return lines


def build(content):
    total = 2 * BOX + len(GAP)
    lines = [
        paint(content["title"].upper(), INK, BOLD) + "   " + paint(content["subtitle"], MUTED),
        paint("<placeholder>", PLACEHOLDER) + paint(" fill in   ", MUTED)
        + paint("✓", GOOD, BOLD) + paint(" do   ", MUTED) + paint("✗", BAD, BOLD) + paint(" never", MUTED),
        "",
    ]
    left, right = (column(c) for c in content["columns"])
    for n in range(max(len(left), len(right))):
        l = left[n] if n < len(left) else ""
        r = right[n] if n < len(right) else ""
        lines.append(pad(l, BOX) + GAP + r)
    for line in lines:
        pad(line, total)
    return "\n".join(line.rstrip() + RESET for line in lines) + "\n"


if __name__ == "__main__":
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "team-workflow.json"
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "gh-team-workflow.ans"
    out.write_text(build(json.loads(source.read_text(encoding="utf-8"))), encoding="utf-8")
    print(f"wrote {out}")
