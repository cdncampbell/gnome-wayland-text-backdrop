# Text Backdrop

A GNOME Shell extension that shows a text file as part of the desktop background, behind all windows. It works like a conky text panel, but on GNOME Wayland.

Conky's Wayland mode, eww, nwg-wrapper and other desktop-widget tools rely on the wlr-layer-shell protocol, which GNOME's compositor (Mutter) doesn't implement. An extension runs inside the shell itself, so it can draw on the background layer directly.

Version 0.7.0, built for GNOME Shell 50. The version is `version-name` in `metadata.json`; it moves to 1.0.0 with the first extensions.gnome.org release.

## Your own text

Any UTF-8 text file works. Files ending in `.md` or `.markdown` are rendered as markdown: headings, bold, italic, strikethrough, inline code and code blocks, lists and task lists, quotes, links, images (as a placeholder), rules, and pipe tables with their columns re-aligned. `examples/sample.md` shows them all.

Other files are shown as text. Plain text is shown as-is. ANSI colour codes are drawn in colour, the same way `cat` shows them in a terminal:

- reset, bold, dim, strikethrough
- the 16 basic colours, 256-colour, and 24-bit colour (`ESC[38;2;r;g;bm`)

Other escape sequences, like cursor movement, are dropped. The panel uses DejaVu Sans Mono, which covers box drawing and arrows, so column layouts line up.

## Settings

Open the settings from the Extensions app, or with `gnome-extensions prefs text-backdrop@cdncampbell.github.io`. Every change applies to the desktop straight away. Each slider has a number box beside it, so a value can be dragged or typed.

The settings window has a tab for each connected monitor, left to right. Each monitor can show up to 4 sheets: **Add sheet** adds one, and the bin icon removes it. Each sheet is a collapsible row, and opening one closes the others. Click a sheet's name to rename it: Enter saves, Esc cancels, and clearing the name goes back to the file's name. Each sheet has:

| Setting | What it does |
|---------|--------------|
| Text file | The file to show. **Use built-in** goes back to the welcome text (`welcome.ans`). The desktop redraws when the file changes. If the file can't be read, a one-line note shows where the text would be, and the file is picked up once it appears (for example, when a drive mounts). |
| Font | The sheet's font, from GNOME's font chooser. It lists monospaced fonts, since box drawing, ANSI layouts and markdown tables only line up in those; turn on **Show all fonts** for proportional fonts. Pick a font that has every character your sheet uses: a missing character is drawn from another font, and if that one is wider, the rest of its line shifts. DejaVu Sans Mono, the default, covers box drawing and arrows. |
| Font size | 6–72 pt, 11 pt by default. Changing it resets Scale to 100%, so the size you pick is the size drawn. |
| Left, Top | Where the panel sits, measured from the monitor's top-left corner, in pixels. The sliders go up to that monitor's width and height. |
| Lock aspect ratio | When on, changing Width or Height changes the other to keep the current proportion. |
| Width, Height | The size of the text, in pixels, from 25% to 400% of its natural size. With the ratio unlocked, the text can be stretched wider or taller. |
| Scale | Resizes width and height together, 25–400%, keeping any stretch. |
| Background opacity | The panel behind the text, 0–100%. 0 shows the text only. |
| Padding | Space between the panel edge and the text, in pixels. |

Monitors are remembered by connector (DP-1, HDMI-1...), so a sheet stays on the same screen when monitors are rearranged. When a monitor is unplugged, its sheets are hidden until it comes back; the settings window keeps a "(not connected)" tab for it so its sheets can still be edited or removed. With no sheets at all, the welcome text shows on the left-most monitor.

All sheets are stored in one setting, `sheets`, in `schemas/org.gnome.shell.extensions.text-backdrop.gschema.xml`. Each field's label, default and range are in `sheets.js`.

## Example: KB16 macropad cheat sheet

`examples/kb16/` is the sheet this started as: the layer map of my KeebMonkey Megalodon (DOIO KB16-01) macropad, drawn with box drawing and 24-bit colour. It isn't packed into the extension; to use it, choose `examples/kb16/kb16-cheat-sheet.ans` as the Text file. See [keebmonkey-megaladon-kb16-01](https://github.com/cdncampbell/keebmonkey-megaladon-kb16-01) for the keyboard itself.

- `examples/kb16/build-sheet.py` holds the layer data and generates `kb16-cheat-sheet.ans`. Don't edit the `.ans` by hand.
- The layer data duplicates the printable cheat sheet in the keyboard repo, so a key change goes in both places.

## What's here

| Path | What it is |
|------|------------|
| `extension.js`, `stylesheet.css`, `metadata.json` | The extension. |
| `prefs.js`, `prefs/` | The settings window: a tab per monitor, a collapsible, renamable row per sheet, and text measurement for the size sliders. |
| `schemas/` | The `sheets` setting. |
| `sheets.js` | The sheets model: field defaults and ranges, validation, and which sheets show on which monitor. Shared by the shell and the settings window. |
| `sheetPanel.js` | One panel on the desktop: its label, file watch and position. |
| `ansi.js` | Converts ANSI colour codes to Pango markup for the desktop label. |
| `markdown.js` | Converts markdown to Pango markup. |
| `render.js` | Reads a sheet file and picks markdown or ANSI by its extension. Shared by the desktop and the settings window, which measures text the same way. |
| `panel.js` | Picks a monitor and builds the panel style. It has no shell imports, so it can be tested. |
| `welcome.ans` | The built-in text shown until a file is chosen. |
| `tests/` | ANSI, markdown, panel and sheets-model tests, plus checks that the welcome text, the KB16 example and the markdown sample are valid Pango markup. |
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

## License

GPL-2.0-or-later, the same terms as GNOME Shell. The full text of version 2 is in `LICENSE`.
