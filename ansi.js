// Turns text with ANSI colour codes (SGR escapes) into Pango markup, so the
// same .ans file that `cat` shows in colour can be drawn by a Clutter label.
// Supports reset, bold, dim, strikethrough, and 16, 256 and 24-bit colour.
// Any other escape sequence, like cursor movement, is dropped.

const CSI = /\x1b\[([0-9;?]*)([A-Za-z])/g;

// xterm's default 16-colour palette.
const BASIC = [
    '#000000', '#cd0000', '#00cd00', '#cdcd00', '#0000ee', '#cd00cd', '#00cdcd', '#e5e5e5',
    '#7f7f7f', '#ff0000', '#00ff00', '#ffff00', '#5c5cff', '#ff00ff', '#00ffff', '#ffffff',
];

const PLAIN = {fg: null, bg: null, bold: false, dim: false, strike: false};

const byte = v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0');
const hex = (r, g, b) => `#${byte(r)}${byte(g)}${byte(b)}`;

function xterm256(n) {
    if (n < 16)
        return BASIC[n];
    if (n < 232) {
        const level = v => (v === 0 ? 0 : 55 + v * 40);
        n -= 16;
        return hex(level(Math.floor(n / 36)), level(Math.floor(n / 6) % 6), level(n % 6));
    }
    const grey = 8 + (n - 232) * 10;
    return hex(grey, grey, grey);
}

function applySgr(state, params) {
    const codes = params === '' ? [0] : params.split(';').map(Number);
    for (let i = 0; i < codes.length; i++) {
        const c = codes[i];
        if (c === 0)
            Object.assign(state, PLAIN);
        else if (c === 1)
            state.bold = true;
        else if (c === 2)
            state.dim = true;
        else if (c === 22)
            state.bold = state.dim = false;
        else if (c === 9)
            state.strike = true;
        else if (c === 29)
            state.strike = false;
        else if (c >= 30 && c <= 37)
            state.fg = BASIC[c - 30];
        else if (c >= 90 && c <= 97)
            state.fg = BASIC[c - 90 + 8];
        else if (c === 39)
            state.fg = null;
        else if (c >= 40 && c <= 47)
            state.bg = BASIC[c - 40];
        else if (c >= 100 && c <= 107)
            state.bg = BASIC[c - 100 + 8];
        else if (c === 49)
            state.bg = null;
        else if (c === 38 || c === 48) {
            // Extended colour: 38;5;n (256-colour) or 38;2;r;g;b (24-bit).
            const target = c === 38 ? 'fg' : 'bg';
            if (codes[i + 1] === 5 && codes[i + 2] >= 0 && codes[i + 2] <= 255) {
                state[target] = xterm256(codes[i + 2]);
                i += 2;
            } else if (codes[i + 1] === 2) {
                state[target] = hex(codes[i + 2], codes[i + 3], codes[i + 4]);
                i += 4;
            }
        }
    }
}

const escapeMarkup = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function span(state, text) {
    const attrs = [];
    if (state.fg)
        attrs.push(`foreground="${state.fg}"`);
    if (state.bg)
        attrs.push(`background="${state.bg}"`);
    if (state.bold)
        attrs.push('weight="bold"');
    if (state.dim)
        attrs.push('alpha="60%"');
    if (state.strike)
        attrs.push('strikethrough="true"');
    const body = escapeMarkup(text);
    return attrs.length ? `<span ${attrs.join(' ')}>${body}</span>` : body;
}

export function ansiToPango(input) {
    const state = {...PLAIN};
    let out = '';
    let last = 0;
    for (const match of input.matchAll(CSI)) {
        if (match.index > last)
            out += span(state, input.slice(last, match.index));
        if (match[2] === 'm')
            applySgr(state, match[1]);
        last = match.index + match[0].length;
    }
    if (last < input.length)
        out += span(state, input.slice(last));
    return out;
}
