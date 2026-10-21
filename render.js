// Turns a sheet file's contents into Pango markup. The desktop panel draws
// it, and the settings window measures it, so both see exactly the same
// text. Reading the file is left to each caller: the shell reads
// asynchronously, so it never blocks the desktop.

import {ansiToPango} from './ansi.js';
import {markdownToPango} from './markdown.js';

// Shown until a sheet has a file of its own.
export const BUILT_IN_SHEET = 'welcome.ans';

const MARKDOWN = /\.(md|markdown)$/i;

export function sheetMarkup(bytes, path) {
    const text = new TextDecoder().decode(bytes);
    return MARKDOWN.test(path) ? markdownToPango(text) : ansiToPango(text);
}

// A file that can't be read becomes a one-line note in its place, so a
// missing sheet (say, on a drive that isn't mounted yet) is visible.
export function unreadableMarkup(path) {
    return ansiToPango(`Text Backdrop: can't read ${path}`);
}
