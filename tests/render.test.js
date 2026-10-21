// Run with `make test` (gjs -m tests/render.test.js).
import System from 'system';

import {sheetMarkup, unreadableMarkup} from '../render.js';

const bytes = text => new TextEncoder().encode(text);

const cases = [
    ['.md files are rendered as markdown', () => sheetMarkup(bytes('**hi**'), '/a/notes.md'), '<b>hi</b>'],
    ['.markdown counts too, in any case', () => sheetMarkup(bytes('**hi**'), '/a/NOTES.Markdown'), '<b>hi</b>'],
    ['other files keep markdown as plain text', () => sheetMarkup(bytes('**hi**'), '/a/notes.txt'), '**hi**'],
    ['ANSI colour codes are rendered', () => sheetMarkup(bytes('\x1b[1mhi\x1b[0m'), '/a/b.ans'),
        '<span weight="bold">hi</span>'],
    ['an unreadable file becomes an escaped note', () => unreadableMarkup('/a/<b>&.ans'),
        'Text Backdrop: can\'t read /a/&lt;b&gt;&amp;.ans'],
];

let failed = 0;
for (const [name, run, expected] of cases) {
    const actual = run();
    if (actual !== expected) {
        failed++;
        print(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
    }
}

print(failed ? `${failed} failed` : `all ${cases.length} passed`);
System.exit(failed ? 1 : 0);
