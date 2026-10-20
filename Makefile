UUID := text-backdrop@cdncampbell.github.io
SCHEMA := schemas/org.gnome.shell.extensions.text-backdrop.gschema.xml

.PHONY: sheet test pack install

sheet:
	python3 examples/kb16/build-sheet.py

test: sheet
	gjs -m tests/ansi.test.js
	gjs -m tests/panel.test.js
	glib-compile-schemas --strict --dry-run schemas

pack: test
	gnome-extensions pack --force --schema=$(SCHEMA) \
		--extra-source=ansi.js --extra-source=panel.js --extra-source=examples/kb16/kb16-cheat-sheet.ans .

install: pack
	gnome-extensions install --force $(UUID).shell-extension.zip
