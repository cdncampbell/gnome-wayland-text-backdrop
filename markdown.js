// Turns Markdown into Pango markup for a monospace label. Each source line
// stays one output line (no reflow), so the file looks like it does in an
// editor, just styled: headings, emphasis, code, lists, quotes, links, rules
// and pipe tables. Anything else, raw HTML included, is shown as plain text.

import {escapeMarkup} from './ansi.js';

const HEADING_COLOURS = ['#5ccfe6', '#6c9ff0'];
const CODE = '#f39a4f';
const DIM = '#9ba7b8';
const RULE = '#56627a';

const HR = /^ {0,3}([-*_])( *\1){2,} *$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const QUOTE = /^ {0,3}> ?(.*)$/;
const TASK = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/;
const BULLET = /^(\s*)[-*+](\s+)(.*)$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const PIPE = /(?<!\\)\|/;

const colour = (c, markup) => `<span foreground="${c}">${markup}</span>`;

// Emphasis bodies step over backslash escapes so `\*` never closes a span.
const BODY = String.raw`((?:\\.|[^\\])+?)`;
const emphasis = (open, close, tag) =>
    [new RegExp(`${open}(?=\\S)${BODY}(?<=\\S)${close}`, 'g'), m => `<${tag}>${inline(m[1])}</${tag}>`];

// Each rule renders its own match; text between matches is escaped by
// inline(). Bodies that may hold more markdown recurse, everything else is
// escaped here, so every character is escaped exactly once.
const INLINE = [
    [/\\([!-/:-@[-`{-~])/g, m => escapeMarkup(m[1])],
    [/`([^`]+)`/g, m => colour(CODE, escapeMarkup(m[1]))],
    [/!\[([^\]]*)\]\(([^)\s]*)\)/g, m => colour(DIM, `[image: ${escapeMarkup(m[1])}]`)],
    [/\[([^\]]+)\]\(([^)\s]+)\)/g, m => `<u>${inline(m[1])}</u> ${colour(DIM, `(${escapeMarkup(m[2])})`)}`],
    [/<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s<>]+)>/g, m => `<u>${escapeMarkup(m[1])}</u>`],
    emphasis(String.raw`\*\*`, String.raw`\*\*`, 'b'),
    emphasis(String.raw`(?<!\w)__`, String.raw`__(?!\w)`, 'b'),
    emphasis('~~', '~~', 's'),
    // Word boundaries keep snake_case and 2*3*4 from turning italic.
    emphasis(String.raw`(?<![\w*])\*(?!\*)`, String.raw`(?<!\*)\*(?![\w*])`, 'i'),
    emphasis(String.raw`(?<![\w_])_(?!_)`, String.raw`(?<!_)_(?![\w_])`, 'i'),
];

function inline(text) {
    let out = '';
    let pos = 0;
    for (;;) {
        let best = null;
        for (const [pattern, render] of INLINE) {
            pattern.lastIndex = pos;
            const match = pattern.exec(text);
            if (match && (!best || match.index < best.match.index))
                best = {match, render};
        }
        if (!best)
            return out + escapeMarkup(text.slice(pos));
        out += escapeMarkup(text.slice(pos, best.match.index)) + best.render(best.match);
        pos = best.match.index + best.match[0].length;
    }
}

function heading(level, markup) {
    const c = HEADING_COLOURS[level - 1];
    return c ? `<span foreground="${c}" weight="bold">${markup}</span>` : `<b>${markup}</b>`;
}

function renderLine(line) {
    if (HR.test(line))
        return colour(RULE, '─'.repeat(40));
    let m = line.match(HEADING);
    if (m)
        return heading(m[1].length, inline(m[2] ?? ''));
    m = line.match(QUOTE);
    if (m)
        return `${colour(DIM, '│ ')}<i>${renderLine(m[1])}</i>`;
    m = line.match(TASK);
    if (m)
        return `${m[1]}${m[2] === ' ' ? '☐' : '☑'} ${inline(m[3])}`;
    m = line.match(BULLET);
    if (m)
        return `${m[1]}•${m[2]}${inline(m[3])}`;
    return inline(line);
}

function fencedCode(lines, start) {
    const m = lines[start].match(FENCE);
    if (!m || (m[1][0] === '`' && m[2].includes('`')))
        return null;
    const close = new RegExp(`^ {0,3}${m[1][0]}{${m[1].length},}\\s*$`);
    let end = start + 1;
    while (end < lines.length && !close.test(lines[end]))
        end++;
    const rendered = lines.slice(start + 1, end).map(l => colour(CODE, escapeMarkup(l)));
    return {rendered, next: end + 1};
}

function cells(row) {
    return row.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(PIPE).map(c => c.trim());
}

function alignment(cell) {
    const m = cell.match(/^(:?)-+(:?)$/);
    if (!m)
        return null;
    if (m[1] && m[2])
        return 'center';
    return m[2] ? 'right' : 'left';
}

// Tags never count, and an escaped entity is one character on screen.
const visibleWidth = markup => [...markup.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt);/g, '_')].length;

function pad(markup, width, align) {
    const gap = width - visibleWidth(markup);
    const left = align === 'right' ? gap : align === 'center' ? Math.floor(gap / 2) : 0;
    return ' '.repeat(left) + markup + ' '.repeat(gap - left);
}

function table(lines, start) {
    if (start + 1 >= lines.length || !PIPE.test(lines[start]) || !PIPE.test(lines[start + 1]))
        return null;
    const aligns = cells(lines[start + 1]).map(alignment);
    const header = cells(lines[start]);
    if (aligns.includes(null) || aligns.length !== header.length)
        return null;
    let end = start + 2;
    while (end < lines.length && lines[end].trim() && PIPE.test(lines[end]))
        end++;

    const head = header.map(c => `<b>${inline(c)}</b>`);
    const body = lines.slice(start + 2, end).map(cells).map(row => aligns.map((_, i) => inline(row[i] ?? '')));
    const widths = aligns.map((_, i) => Math.max(...[head, ...body].map(row => visibleWidth(row[i]))));
    const render = row => row.map((c, i) => pad(c, widths[i], aligns[i])).join(` ${colour(RULE, '│')} `);
    const rule = colour(RULE, widths.map(w => '─'.repeat(w)).join('─┼─'));
    return {rendered: [render(head), rule, ...body.map(render)], next: end};
}

export function markdownToPango(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const block = fencedCode(lines, i) ?? table(lines, i);
        if (block) {
            out.push(...block.rendered);
            i = block.next;
        } else {
            out.push(renderLine(lines[i]));
            i++;
        }
    }
    return out.join('\n');
}
