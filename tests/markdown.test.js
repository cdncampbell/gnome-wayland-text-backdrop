// Run with `gjs -m tests/markdown.test.js`.
import Gio from 'gi://Gio';
import Pango from 'gi://Pango';
import System from 'system';

import {markdownToPango} from '../markdown.js';

const RULE = `<span foreground="#56627a">${'─'.repeat(40)}</span>`;
const BAR = ' <span foreground="#56627a">│</span> ';
const QUOTE = '<span foreground="#9ba7b8">│ </span>';

const cases = [
    ['plain text passes through', 'Copy', 'Copy'],
    ['markup characters are escaped', 'a <div> & b', 'a &lt;div&gt; &amp; b'],
    ['raw html is shown as text', '<div class="x">hi</div>', '&lt;div class="x"&gt;hi&lt;/div&gt;'],
    ['line structure and indentation are kept', 'a\n\n    b', 'a\n\n    b'],

    ['h1 is bright cyan and bold', '# Title', '<span foreground="#5ccfe6" weight="bold">Title</span>'],
    ['h2 is blue and bold', '## Sub', '<span foreground="#6c9ff0" weight="bold">Sub</span>'],
    ['h3 is bold only', '### Third', '<b>Third</b>'],
    ['h6 drops closing hashes', '###### Six ##', '<b>Six</b>'],
    ['hash without a space is text', '#tag', '#tag'],
    ['headings parse inline markup', '# Use `ls`',
        '<span foreground="#5ccfe6" weight="bold">Use <span foreground="#f39a4f">ls</span></span>'],

    ['bold with stars and underscores', 'a **b** __c__', 'a <b>b</b> <b>c</b>'],
    ['italic with stars and underscores', '*a* _b_', '<i>a</i> <i>b</i>'],
    ['italic nests in bold', '**bold _and italic_**', '<b>bold <i>and italic</i></b>'],
    ['snake_case is not italic', 'snake_case_words', 'snake_case_words'],
    ['arithmetic is not italic', '2*3*4', '2*3*4'],
    ['strikethrough', '~~old~~ new', '<s>old</s> new'],
    ['inline code is verbatim and escaped', 'run `a **b** <c> & d`',
        'run <span foreground="#f39a4f">a **b** &lt;c&gt; &amp; d</span>'],
    ['unmatched markers stay literal', '**open and `tick and [link', '**open and `tick and [link'],
    ['markers next to spaces stay literal', 'a ** b ** c', 'a ** b ** c'],
    ['backslash escapes a marker', '\\*not italic\\*', '*not italic*'],
    ['brackets without a url stay literal', '[text] (not a link)', '[text] (not a link)'],

    ['link shows text and dim url', '[docs](https://x.org/?a=1&b=2)',
        '<u>docs</u> <span foreground="#9ba7b8">(https://x.org/?a=1&amp;b=2)</span>'],
    ['link text parses inline markup', '[**go**](u)', '<u><b>go</b></u> <span foreground="#9ba7b8">(u)</span>'],
    ['image becomes a dim placeholder', '![a <logo>](a.png)',
        '<span foreground="#9ba7b8">[image: a &lt;logo&gt;]</span>'],
    ['autolink is underlined', '<https://a.org/x?y&z>', '<u>https://a.org/x?y&amp;z</u>'],

    ['bullets become dots and keep indentation', '- one\n  * two\n    + three', '• one\n  • two\n    • three'],
    ['ordered items are kept', '1. first\n2) **second**', '1. first\n2) <b>second</b>'],
    ['task items become boxes', '- [ ] todo\n  - [x] done', '☐ todo\n  ☑ done'],

    ['blockquote is barred and italic', '> quoted & text', `${QUOTE}<i>quoted &amp; text</i>`],
    ['blockquotes nest', '> > deep', `${QUOTE}<i>${QUOTE}<i>deep</i></i>`],
    ['blockquote holds a list item', '> - item', `${QUOTE}<i>• item</i>`],

    ['horizontal rules', '---\n***\n___\n- - -', [RULE, RULE, RULE, RULE].join('\n')],

    ['fenced code is verbatim, fences dropped', '```sh\necho "<hi>" && **x**\n```\nafter',
        '<span foreground="#f39a4f">echo "&lt;hi&gt;" &amp;&amp; **x**</span>\nafter'],
    ['tilde fence keeps blank lines', '~~~\na\n\n~~~',
        '<span foreground="#f39a4f">a</span>\n<span foreground="#f39a4f"></span>'],
    ['a fence only closes on its own marker', '```\n~~~\n# no\n```',
        '<span foreground="#f39a4f">~~~</span>\n<span foreground="#f39a4f"># no</span>'],
    ['an unclosed fence runs to the end', '```\n*a*', '<span foreground="#f39a4f">*a*</span>'],

    ['table aligns columns by visible width',
        '| Key | Action |\n|---|:---:|\n| **Ctrl**+C | Copy |\n| Esc | Cancel & close |',
        [
            `<b>Key</b>   ${BAR}    <b>Action</b>    `,
            `<span foreground="#56627a">${'─'.repeat(6)}─┼─${'─'.repeat(14)}</span>`,
            `<b>Ctrl</b>+C${BAR}     Copy     `,
            `Esc   ${BAR}Cancel &amp; close`,
        ].join('\n')],
    ['table right-aligns and fills short rows', 'a | b\n--:|---\n100 |',
        [
            `  <b>a</b>${BAR}<b>b</b>`,
            '<span foreground="#56627a">────┼──</span>',
            `100${BAR} `,
        ].join('\n')],
    ['table cells escape markup and pipes', '| x |\n|---|\n| a\\|b <c> |',
        ['<b>x</b>      ', '<span foreground="#56627a">───────</span>', 'a|b &lt;c&gt;'].join('\n')],
    ['a rule under a piped line is not a table', 'a | b\n---', `a | b\n${RULE}`],
];

let failed = 0;
for (const [name, input, expected] of cases) {
    const actual = markdownToPango(input);
    if (actual !== expected) {
        failed++;
        print(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
    }
}

// Overlapping and unmatched markers must still give balanced markup;
// set_markup on a label fails quietly and shows nothing, so catch it here.
const tricky = [
    '**a *b** c*', '`a **b` c**', '[a **b](c)**', '~~a **b~~ c**', '_a *b_ c*', '<b>', '&amp; &',
    '| **a | b** |\n|---|---|\n| `x | y` |', '> **a\n> b**', '![**x**](y) [`a`](<b>)',
];
const repo = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent();
const [, bytes] = repo.resolve_relative_path('examples/sample.md').load_contents(null);
const inputs = [...tricky, new TextDecoder().decode(bytes)];
for (const input of inputs) {
    try {
        Pango.parse_markup(markdownToPango(input), -1, '\0');
    } catch (e) {
        failed++;
        print(`FAIL ${JSON.stringify(input.slice(0, 40))} is not valid Pango markup: ${e.message}`);
    }
}

print(failed ? `${failed} failed` : `all ${cases.length + inputs.length} passed`);
System.exit(failed ? 1 : 0);
