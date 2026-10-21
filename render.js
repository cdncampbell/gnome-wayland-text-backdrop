// Turns a sheet file into Pango markup. The desktop panel draws it, and the
// settings window measures it, so both see exactly the same text.

import {ansiToPango} from './ansi.js';
import {markdownToPango} from './markdown.js';

// Shown until a sheet has a file of its own.
export const BUILT_IN_SHEET = 'welcome.ans';

const MARKDOWN = /\.(md|markdown)$/i;

// A file that can't be read becomes a one-line note in its place, so a
// missing sheet (say, on a drive that isn't mounted yet) is visible.
export function sheetMarkup(file) {
    let text;
    try {
        const [, bytes] = file.load_contents(null);
        text = new TextDecoder().decode(bytes);
    } catch {
        return ansiToPango(`Text Backdrop: can't read ${file.get_path()}`);
    }
    return MARKDOWN.test(file.get_path()) ? markdownToPango(text) : ansiToPango(text);
}
