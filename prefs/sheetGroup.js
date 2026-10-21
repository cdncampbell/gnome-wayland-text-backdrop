import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {FIELDS} from '../sheets.js';

const BUILT_IN_LABEL = 'Built-in welcome text';

// The settings for one sheet: its file and four sliders. Edits change the
// sheet object in place and then call onChange() to save the whole list.
export function sheetGroup({index, sheet, monitor, window, onChange, onRemove}) {
    const group = new Adw.PreferencesGroup({title: `Sheet ${index + 1}`});

    const remove = new Gtk.Button({
        icon_name: 'user-trash-symbolic',
        tooltip_text: 'Remove this sheet',
        valign: Gtk.Align.CENTER,
        css_classes: ['flat'],
    });
    remove.connect('clicked', onRemove);
    group.set_header_suffix(remove);

    group.add(fileRow(sheet, window, onChange));

    // Left and top can't go past the monitor's own size.
    const limits = {x: monitor.width, y: monitor.height};
    for (const [name, field] of Object.entries(FIELDS)) {
        group.add(sliderRow(field, Math.min(field.max, limits[name] ?? field.max), sheet[name], value => {
            sheet[name] = value;
            onChange();
        }));
    }
    return group;
}

function fileRow(sheet, window, onChange) {
    // Paths can contain & or <, so show them as plain text, not markup.
    const row = new Adw.ActionRow({title: 'Text file', use_markup: false});
    const setPath = path => {
        sheet.path = path;
        row.subtitle = path || BUILT_IN_LABEL;
    };
    setPath(sheet.path);

    const builtIn = new Gtk.Button({label: 'Use built-in', valign: Gtk.Align.CENTER});
    builtIn.connect('clicked', () => {
        setPath('');
        onChange();
    });
    const choose = new Gtk.Button({label: 'Choose…', valign: Gtk.Align.CENTER});
    choose.connect('clicked', () => chooseFile(window, sheet.path, path => {
        setPath(path);
        onChange();
    }));
    row.add_suffix(builtIn);
    row.add_suffix(choose);
    return row;
}

function chooseFile(window, currentPath, onChosen) {
    const text = new Gtk.FileFilter({name: 'Text and ANSI files'});
    text.add_pattern('*.ans');
    text.add_pattern('*.txt');
    text.add_mime_type('text/plain');
    const all = new Gtk.FileFilter({name: 'All files'});
    all.add_pattern('*');
    const filters = new Gio.ListStore({item_type: Gtk.FileFilter});
    filters.append(text);
    filters.append(all);

    const dialog = new Gtk.FileDialog({title: 'Choose a text file', filters, default_filter: text});
    if (currentPath)
        dialog.initial_file = Gio.File.new_for_path(currentPath);

    dialog.open(window, null, (_dialog, result) => {
        try {
            onChosen(dialog.open_finish(result).get_path());
        } catch (e) {
            if (!e.matches(Gtk.DialogError, Gtk.DialogError.DISMISSED))
                console.error(e);
        }
    });
}

function sliderRow(field, max, value, onChange) {
    const scale = new Gtk.Scale({
        adjustment: new Gtk.Adjustment({lower: field.min, upper: max, value, step_increment: 1, page_increment: 10}),
        digits: 0,
        draw_value: true,
        value_pos: Gtk.PositionType.RIGHT,
        hexpand: true,
        width_request: 320,
        valign: Gtk.Align.CENTER,
    });
    scale.set_format_value_func((_scale, v) => `${Math.round(v)} ${field.unit}`);
    scale.connect('value-changed', () => onChange(Math.round(scale.get_value())));

    const row = new Adw.ActionRow({title: field.label});
    row.add_suffix(scale);
    return row;
}
