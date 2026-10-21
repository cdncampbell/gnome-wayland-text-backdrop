import Pango from 'gi://Pango';

import {BASE_FONT_PX, FONT_FAMILY} from '../panel.js';
import {sheetMarkup} from '../render.js';

// The size of a sheet's text at 100%, without padding. The settings window
// can't ask the shell, so it lays the text out the same way: same markup,
// same font and size.
export function naturalSize(widget, file) {
    const font = Pango.FontDescription.from_string(FONT_FAMILY);
    font.set_absolute_size(BASE_FONT_PX * Pango.SCALE);
    const layout = widget.create_pango_layout(null);
    layout.set_font_description(font);
    layout.set_markup(sheetMarkup(file), -1);
    const [width, height] = layout.get_pixel_size();
    return {width: Math.max(1, width), height: Math.max(1, height)};
}
