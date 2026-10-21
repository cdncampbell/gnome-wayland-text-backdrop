import Pango from 'gi://Pango';

import {sheetMarkup, unreadableMarkup} from '../render.js';

// The size of a sheet's text at 100% scale, without padding. The settings
// window can't ask the shell, so it lays the text out the same way: same
// markup, same font and size. The read is synchronous because the sliders
// need the size straight away, and this runs in the settings window, not
// in the shell.
export function naturalSize(widget, file, sheet) {
    let markup;
    try {
        const [, bytes] = file.load_contents(null);
        markup = sheetMarkup(bytes, file.get_path());
    } catch {
        markup = unreadableMarkup(file.get_path());
    }

    const font = Pango.FontDescription.from_string(sheet.font_family);
    font.set_size(sheet.font_size * Pango.SCALE);
    const layout = widget.create_pango_layout(null);
    layout.set_font_description(font);
    layout.set_markup(markup, -1);
    const [width, height] = layout.get_pixel_size();
    return {width: Math.max(1, width), height: Math.max(1, height)};
}
