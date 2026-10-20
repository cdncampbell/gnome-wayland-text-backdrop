#!/usr/bin/env python3
"""Build kb16-cheat-sheet.ans: the KB16 layer map as ANSI-coloured UTF-8 text.

The layer data mirrors cheat-sheet/kb16-cheat-sheet-colours.html in the
keebmonkey-megaladon-kb16-01 repo. When a key changes there, change it here
too and run `make sheet`.
"""
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent / "kb16-cheat-sheet.ans"

# The dark-theme colours from the HTML cheat sheet, as 24-bit colour so the
# terminal and the desktop show the same shades as the pad's LEDs whatever
# the terminal's palette is.
INK, MUTED, GRID, RUN, WARN = "e7ecf3", "9ba7b8", "56627a", "4cc394", "f08070"

RESET, BOLD, STRIKE = "\x1b[0m", "\x1b[1m", "\x1b[9m"
ESCAPES = re.compile(r"\x1b\[[0-9;]*m")

CELL = 16  # text width inside one key cap
GRID_WIDTH = 4 * (CELL + 2) + 5
CARD_WIDTH = GRID_WIDTH + 4
GAP = "  "
PAGE_WIDTH = 2 * CARD_WIDTH + len(GAP)


def fg(hex_colour):
    r, g, b = (int(hex_colour[i:i + 2], 16) for i in (0, 2, 4))
    return f"\x1b[38;2;{r};{g};{b}m"


def paint(text, colour, *styles):
    return "".join(styles) + fg(colour) + text + RESET


def width(s):
    return len(ESCAPES.sub("", s))


def pad(s, w):
    # Every line is padded to an exact width, so overflowing text fails the
    # build here instead of silently breaking the box drawing.
    n = width(s)
    if n > w:
        raise ValueError(f"{ESCAPES.sub('', s)!r} is {n} wide, room for {w}")
    return s + " " * (w - n)


def k(label, keys="", **opts):
    return (label, keys, opts)


GUI_TOP = [k("Copy", "Ctrl+C"), k("Paste", "Ctrl+V"), k("Save", "Ctrl+S"), k("Find", "Ctrl+F")]
TERM_TOP = [k("Copy", "Ctrl+Shift+C"), k("Paste", "Ctrl+Shift+V"), k("Save", "off here", off=True),
            k("Find", "Ctrl+Shift+F")]
UNDO = ("Undo", "Redo")

LAYERS = [
    dict(name="Base", led="Blue", colour="6c9ff0", tag="OpenWhispr, windows, screenshots", top=GUI_TOP, big=UNDO,
         rows=[
             ("OpenWhispr", [k("Dictation", "Ctrl+Shift+D"), k("Voice assistant", "Ctrl+Shift+Spc"),
                             k("Meeting", "Ctrl+Shift+M"), k("Translation", "Ctrl+Shift+N")]),
             ("Navigate", [k("Back", "Alt+←"), k("Forward", "Alt+→"), k("Screenshot", "PrtSc"),
                           k("Window ◂ monitor", "Shift+Super+←")]),
             ("Windows", [k("Tile left", "Super+←"), k("Maximize", "Super+↑"), k("Tile right", "Super+→"),
                          k("Window ▸ monitor", "Shift+Super+→")]),
         ]),
    dict(name="Cursor", led="Orange", colour="f39a4f", tag="Built-in AI, editing, panels", top=GUI_TOP, big=UNDO,
         rows=[
             ("AI", [k("AI chat", "Ctrl+L"), k("Inline edit", "Ctrl+K"), k("Accept", "Ctrl+Enter"),
                     k("Reject", "Ctrl+Bksp")]),
             ("Edit", [k("Comment", "Ctrl+/"), k("Format", "Ctrl+Shift+I", check=True), k("Rename", "F2"),
                       k("Next match", "Ctrl+D")]),
             ("Panels", [k("Terminal", "Ctrl+`"), k("Sidebar", "Ctrl+B", check=True), k("Split editor", "Ctrl+\\"),
                         k("Search files", "Ctrl+Shift+F")]),
         ]),
    dict(name="Terminal", led="Green", colour="4cc394", tag="Git and shell, Ptyxis or Cursor", top=TERM_TOP,
         big=("Scroll down", "Scroll up"),
         rows=[
             ("Inspect", [k("git status", run=True), k("git diff", run=True),
                          k("git log", run=True, sub="--oneline -20"), k("git fetch", run=True)]),
             ("Sync + branch", [k("git pull", type=True), k("git push", type=True),
                                k("git switch -c", type=True, sub="feature/"), k("git switch", type=True)]),
             ("Shell", [k("git stash", type=True), k("clear", run=True), k("Cancel", "Ctrl+C"),
                        k("History", "Ctrl+R")]),
         ]),
    dict(name="Obsidian", led="Purple", colour="ac8af2", tag="Notes, editing, view", top=GUI_TOP, big=UNDO,
         rows=[
             ("Notes", [k("New note", "Ctrl+N"), k("Daily note", "Meh+D", star=True),
                        k("Template", "Meh+I", star=True), k("Edit / read", "Ctrl+E")]),
             ("Format", [k("Checkbox", "Ctrl+L"), k("Bold", "Ctrl+B"), k("Italic", "Ctrl+I"), k("Link", "Ctrl+K")]),
             ("View", [k("Graph", "Ctrl+G"), k("Left sidebar", "Meh+[", star=True),
                       k("Right sidebar", "Meh+]", star=True), k("Split right", "Meh+\\", star=True)]),
         ]),
]


def cap_lines(key, colour, shared):
    """The two text lines inside one key cap: what it does, then how."""
    label, keys, o = key
    if o.get("off"):
        top = paint(label, MUTED, STRIKE)
    else:
        top = paint(label, INK) if shared else paint(label, INK, BOLD)
    if o.get("star"):
        top += " " + paint("★", colour)
    if o.get("check"):
        top += " " + paint("?", WARN, BOLD)

    sub = o.get("sub")
    if o.get("run"):
        bottom = paint(sub + " " if sub else "runs ", MUTED) + paint("⏎", RUN, BOLD)
    elif o.get("type"):
        bottom = paint(sub + " " if sub else "", MUTED) + paint("types", MUTED)
    else:
        bottom = paint(keys, WARN if o.get("off") else MUTED)
    return [top, bottom]


def key_grid(layer):
    line = lambda s: paint(s, GRID)
    rows = [("every layer", layer["top"], True)] + [(tag, keys, False) for tag, keys in layer["rows"]]
    out = []
    for i, (tag, keys, shared) in enumerate(rows):
        left, mid, right = ("┌", "┬", "┐") if i == 0 else ("├", "┼", "┤")
        label = f" {tag.upper()} "
        first = line("─") + paint(label, MUTED) + line("─" * (CELL + 1 - len(label)))
        out.append(line(left) + first + line(mid + mid.join(["─" * (CELL + 2)] * 3) + right))
        caps = [cap_lines(key, layer["colour"], shared) for key in keys]
        for n in range(2):
            out.append(line("│") + line("│").join(" " + pad(c[n], CELL) + " " for c in caps) + line("│"))
    out.append(line("└" + "┴".join(["─" * (CELL + 2)] * 4) + "┘"))
    return out


def dial_strip(i, layer):
    colour = layer["colour"]
    next_layer = LAYERS[(i + 1) % len(LAYERS)]["name"]
    big_name = "SCROLL" if layer["name"] == "Terminal" else "UNDO"
    dials = [
        ("ZOOM", "small left", "out", "in", "reset"),
        ("TABS", "small right", "prev", "next", next_layer + " →"),
        (big_name, "big dial", *layer["big"], "home" if i == 0 else "home to Base"),
    ]
    columns = [[
        paint(name, colour, BOLD) + paint(" · " + where, MUTED),
        paint("↺ ", MUTED) + paint(ccw, INK),
        paint("↻ ", MUTED) + paint(cw, INK),
        paint("press ", MUTED) + paint(press, colour, BOLD),
    ] for name, where, ccw, cw, press in dials]
    col = GRID_WIDTH // 3
    return ["".join(pad(c[n], col) for c in columns) for n in range(4)]


def layer_card(i, layer):
    colour = layer["colour"]
    border = lambda s: paint(s, colour)
    inner = CARD_WIDTH - 2
    title = f"L{i} {layer['name'].upper()}"
    led = f" ● {layer['led'].upper()} "
    fill = inner - (2 + len(title) + 1 + len(led) + 1)
    head = (border("╭─ ") + paint(title, colour, BOLD) + border(" " + "─" * fill)
            + paint(led, colour, BOLD) + border("─╮"))
    body = [paint(layer["tag"], MUTED), ""] + key_grid(layer) + [""] + dial_strip(i, layer)
    lines = [head] + [border("│ ") + pad(b, GRID_WIDTH) + border(" │") for b in body]
    return lines + [border("╰" + "─" * inner + "╯")]


def side_by_side(blocks, widths):
    height = max(len(b) for b in blocks)
    return [GAP.join(pad(b[n] if n < len(b) else "", w) for b, w in zip(blocks, widths)) for n in range(height)]


def note_box(title, lines, w, height):
    line = lambda s: paint(s, GRID)
    lines = lines + [""] * (height - len(lines))
    label = f" {title} "
    out = [line("┌─") + paint(label, INK, BOLD) + line("─" * (w - 3 - len(label)) + "┐")]
    out += [line("│ ") + pad(text, w - 4) + line(" │") for text in lines]
    return out + [line("└" + "─" * (w - 2) + "┘")]


def hotkey(desc, keys, w=36):
    return paint(desc.ljust(w), INK) + paint(keys, MUTED)


def header():
    chain = paint(" → ", MUTED).join(paint(f"{i} {l['name']}", l["colour"], BOLD) for i, l in enumerate(LAYERS))
    return [
        paint("KB16 MEGALODON MACROPAD", INK, BOLD)
        + paint("   KeebMonkey KB16-01 · 16 keys · 3 dials · 4 layers", MUTED),
        "",
        chain + paint("  ↺ back to Base", MUTED),
        paint("The pad glows in the layer colour; keys that do nothing stay dark. Press the right small dial "
              "for the next layer, the big dial for Base.", MUTED),
        paint("⏎", RUN, BOLD) + paint(" runs it for you    ", INK)
        + paint("types", MUTED) + paint(" you check it, then Enter    ", INK)
        + paint("★", LAYERS[3]["colour"]) + paint(" bind once in Obsidian    ", INK)
        + paint("?", WARN, BOLD) + paint(" confirm in Cursor    ", INK)
        + paint("Meh", MUTED) + paint(" = Ctrl+Shift+Alt", INK),
    ]


def notes():
    w = (PAGE_WIDTH - 2 * len(GAP)) // 3
    widths = [PAGE_WIDTH - 2 * len(GAP) - 2 * w, w, w]
    contents = [
        ("Bind these in Obsidian", [
            paint("Settings → Hotkeys, search, +, press the pad key", MUTED),
            hotkey("Daily notes: open today's note", "Meh+D"),
            hotkey("Templates: insert template", "Meh+I"),
            hotkey("Toggle left sidebar", "Meh+["),
            hotkey("Toggle right sidebar", "Meh+]"),
            hotkey("Split right", "Meh+\\"),
        ]),
        ("Why the Terminal layer differs", [
            paint("Copy/paste/find use Ctrl+Shift: Ctrl+C stops", INK),
            paint("  the running command.", INK),
            paint("Save is off: Ctrl+S freezes Ptyxis (Ctrl+Q", INK),
            paint("  unfreezes it).", INK),
            paint("The big dial scrolls: Ctrl+Z would suspend.", INK),
            paint("clear is typed so Cursor's Ctrl+L can't grab it.", INK),
        ]),
        ("Check in Cursor", [
            paint("VS Code Linux defaults; if one misfires,", MUTED),
            paint("reassign it in Cursor or VIA.", MUTED),
            hotkey("Format document", "Ctrl+Shift+I", 30),
            hotkey("Toggle sidebar", "Ctrl+B", 30),
        ]),
    ]
    height = max(len(lines) for _, lines in contents)
    boxes = [note_box(title, lines, w, height) for (title, lines), w in zip(contents, widths)]
    return side_by_side(boxes, widths)


def build():
    cards = [layer_card(i, layer) for i, layer in enumerate(LAYERS)]
    lines = header() + [""]
    lines += side_by_side(cards[:2], [CARD_WIDTH] * 2) + [""]
    lines += side_by_side(cards[2:], [CARD_WIDTH] * 2) + [""]
    lines += notes()
    return "\n".join(pad(line, PAGE_WIDTH).rstrip() + RESET for line in lines) + "\n"


if __name__ == "__main__":
    OUT.write_text(build(), encoding="utf-8")
    print(f"wrote {OUT.name} ({PAGE_WIDTH} columns)")
