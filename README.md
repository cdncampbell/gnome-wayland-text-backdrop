# KB16 cheat sheet for the GNOME desktop

A GNOME Shell extension that draws my KeebMonkey Megalodon (DOIO KB16-01) layer map on the desktop of the left-most monitor, behind all windows. It's the same map as the printable cheat sheet in [keebmonkey-megaladon-kb16-01](https://github.com/cdncampbell/keebmonkey-megaladon-kb16-01), as ANSI-coloured text.

Built for GNOME Shell 50 on Wayland. Desktop-widget tools that rely on wlr-layer-shell (conky's Wayland mode, eww, nwg-wrapper) don't run on GNOME, so this lives inside the shell instead.

## What's here

| Path | What it is |
|------|------------|
| `kb16-cheat-sheet.ans` | The sheet: UTF-8 box drawing plus ANSI 24-bit colour. `cat` it in a terminal at least 164 columns wide. Generated, don't edit by hand. |
| `tools/build-sheet.py` | Holds the layer data and draws the sheet. Edit keys here. |
| `ansi.js` | Converts the ANSI colour codes to Pango markup for the desktop label. |
| `extension.js`, `stylesheet.css`, `metadata.json` | The extension. Font size, panel colour and padding are in `stylesheet.css`. |
| `tests/ansi.test.js` | Parser tests, plus a check that the shipped sheet is valid Pango markup. |

## Changing a key

1. Change it in `tools/build-sheet.py`. The layer data is duplicated from the HTML cheat sheet in the keyboard repo, so change it there too.
2. `make install` rebuilds the sheet, runs the tests, then packs and installs the extension.
3. Log out and back in. On Wayland the shell can't restart in place, so it only picks up a changed extension at login.

## Commands

```sh
make sheet     # rebuild kb16-cheat-sheet.ans
make test      # rebuild, then run the parser tests (gjs)
make install   # test, pack, install into ~/.local/share/gnome-shell/extensions
gnome-extensions enable kb16-cheatsheet@cdncampbell.github.io   # once, after the first login
```

The extension uses `Main.layoutManager._backgroundGroup` to sit under the windows. It's private shell API, so when GNOME moves to a new major version, check that first, then add the version to `shell-version` in `metadata.json`.
