UUID := text-backdrop@cdncampbell.github.io
SCHEMA := schemas/org.gnome.shell.extensions.text-backdrop.gschema.xml

.PHONY: sheet test pack install

sheet:
	python3 examples/kb16/build-sheet.py

test: sheet
	gjs -m tests/ansi.test.js
	gjs -m tests/panel.test.js
	gjs -m tests/sheets.test.js
	gjs -m tests/markdown.test.js
	glib-compile-schemas --strict --dry-run schemas

pack: test
	gnome-extensions pack --force --schema=$(SCHEMA) \
		--extra-source=ansi.js --extra-source=markdown.js --extra-source=panel.js \
		--extra-source=render.js --extra-source=sheets.js --extra-source=sheetPanel.js \
		--extra-source=prefs --extra-source=welcome.ans .

install: pack
	gnome-extensions install --force $(UUID).shell-extension.zip
