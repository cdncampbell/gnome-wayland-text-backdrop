// Run with `make test` (gjs -m tests/ansi.test.js).
import Gio from 'gi://Gio';
import Pango from 'gi://Pango';
import System from 'system';

import {ansiToPango} from '../ansi.js';

const ESC = '\x1b[';

const cases = [
    ['plain text passes through', 'Copy', 'Copy'],
    ['markup characters are escaped', 'Ctrl+\\ <a> & b', 'Ctrl+\\ &lt;a&gt; &amp; b'],
    ['24-bit foreground', `${ESC}38;2;108;159;240mBase${ESC}0m`, '<span foreground="#6c9ff0">Base</span>'],
    ['bold and strike combine', `${ESC}1m${ESC}9mSave${ESC}0m`,
        '<span weight="bold" strikethrough="true">Save</span>'],
    ['reset returns to plain text', `${ESC}31mA${ESC}0mB`, '<span foreground="#cd0000">A</span>B'],
    ['an empty SGR resets too', `${ESC}1mA${ESC}mB`, '<span weight="bold">A</span>B'],
    ['bright and 256-colour codes', `${ESC}92mA${ESC}38;5;196mB`,
        '<span foreground="#00ff00">A</span><span foreground="#ff0000">B</span>'],
    ['background and dim', `${ESC}2;44mA`, '<span background="#0000ee" alpha="60%">A</span>'],
    ['non-colour escapes are dropped', `A${ESC}2KB`, 'AB'],
    ['style carries across a newline', `${ESC}32mA\nB`, '<span foreground="#00cd00">A\nB</span>'],
];

let failed = 0;
for (const [name, input, expected] of cases) {
    const actual = ansiToPango(input);
    if (actual !== expected) {
        failed++;
        print(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
    }
}

// The shipped and example sheets must convert to markup Pango accepts;
// set_markup on a label fails quietly and shows nothing, so catch it here.
const sheets = [
    'welcome.ans', 'examples/kb16/kb16-cheat-sheet.ans', 'examples/ansi-banner/banner.ans',
    'examples/gh-workflow/gh-team-workflow.ans',
];
const repo = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
for (const path of sheets) {
    const [, bytes] = repo.resolve_relative_path(path).load_contents(null);
    try {
        Pango.parse_markup(ansiToPango(new TextDecoder().decode(bytes)), -1, '\0');
    } catch (e) {
        failed++;
        print(`FAIL ${path} is not valid Pango markup: ${e.message}`);
    }
}

print(failed ? `${failed} failed` : `all ${cases.length + sheets.length} passed`);
System.exit(failed ? 1 : 0);
