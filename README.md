# Text Backdrop

A GNOME Shell extension that shows a text file as part of the desktop background, behind all windows. It works like a conky text panel, but on GNOME Wayland.

Conky's Wayland mode, eww, nwg-wrapper and other desktop-widget tools rely on the wlr-layer-shell protocol, which GNOME's compositor (Mutter) doesn't implement. An extension runs inside the shell itself, so it can draw on the background layer directly.

Built for GNOME Shell 50.

## Your own text

Any UTF-8 text file works. Plain text is shown as-is. ANSI colour codes are drawn in colour, the same way `cat` shows them in a terminal:

- reset, bold, dim, strikethrough
- the 16 basic colours, 256-colour, and 24-bit colour (`ESC[38;2;r;g;bm`)

Other escape sequences, like cursor movement, are dropped. The panel uses DejaVu Sans Mono, which covers box drawing and arrows, so column layouts line up.

## Example: KB16 macropad cheat sheet

`examples/kb16/` is the sheet this started as: the layer map of my KeebMonkey Megalodon (DOIO KB16-01) macropad, drawn with box drawing and 24-bit colour. It's the bundled default. See [keebmonkey-megaladon-kb16-01](https://github.com/cdncampbell/keebmonkey-megaladon-kb16-01) for the keyboard itself.

- `examples/kb16/build-sheet.py` holds the layer data and generates `kb16-cheat-sheet.ans`. Don't edit the `.ans` by hand.
- The layer data duplicates the printable cheat sheet in the keyboard repo, so a key change goes in both places.

## What's here

| Path | What it is |
|------|------------|
| `extension.js`, `stylesheet.css`, `metadata.json` | The extension. |
| `ansi.js` | Converts ANSI colour codes to Pango markup for the desktop label. |
| `tests/ansi.test.js` | Parser tests, plus a check that the bundled example is valid Pango markup. |
| `examples/kb16/` | The KB16 example sheet and its generator. |

## Commands

```sh
make sheet     # rebuild the KB16 example sheet
make test      # rebuild, then run the tests (gjs)
make install   # test, pack, install into ~/.local/share/gnome-shell/extensions
gnome-extensions enable text-backdrop@cdncampbell.github.io   # once, after the first login
```

On Wayland the shell can't restart in place, so it only picks up a new or changed extension at login.

The extension uses `Main.layoutManager._backgroundGroup` to sit under the windows. It's private shell API, so when GNOME moves to a new major version, check that first, then add the version to `shell-version` in `metadata.json`.
