UUID := text-backdrop@cdncampbell.github.io

.PHONY: sheet test pack install

sheet:
	python3 examples/kb16/build-sheet.py

test: sheet
	gjs -m tests/ansi.test.js

pack: test
	gnome-extensions pack --force --extra-source=ansi.js --extra-source=examples/kb16/kb16-cheat-sheet.ans .

install: pack
	gnome-extensions install --force $(UUID).shell-extension.zip
