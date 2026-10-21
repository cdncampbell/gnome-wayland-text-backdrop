import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';

import {FIELDS, MAX_NAME_LENGTH, clamp, displayName} from '../sheets.js';
import {naturalSize} from './measure.js';

const BUILT_IN_LABEL = 'Built-in welcome text';

// One sheet as an accordion row: its name and file in the header, and its
// file, position, size and look inside. Edits change the sheet object in
// place and then call onChange() to save the whole list.
export function sheetRow({sheet, monitor, window, builtInFile, onChange, onRemove}) {
    const row = new Adw.ExpanderRow();
    const header = headerLabels(sheet, onChange);
    row.add_prefix(header.box);

    const remove = new Gtk.Button({
        icon_name: 'user-trash-symbolic',
        tooltip_text: 'Remove this sheet',
        valign: Gtk.Align.CENTER,
        css_classes: ['flat'],
    });
    remove.connect('clicked', onRemove);
    row.add_suffix(remove);

    const measure = () => naturalSize(window, sheet.path ? Gio.File.new_for_path(sheet.path) : builtInFile);
    const size = sizeRows(sheet, measure, onChange);

    row.add_row(fileRow(sheet, window, () => {
        size.remeasure();
        header.refresh();
        onChange();
    }));

    // Left and top can't go past the monitor's own size.
    row.add_row(fieldSlider(sheet, 'x', monitor.width, onChange).row);
    row.add_row(fieldSlider(sheet, 'y', monitor.height, onChange).row);
    for (const sizeRow of size.rows)
        row.add_row(sizeRow);
    row.add_row(fieldSlider(sheet, 'opacity', FIELDS.opacity.max, onChange).row);
    row.add_row(fieldSlider(sheet, 'padding', FIELDS.padding.max, onChange).row);
    return row;
}

// The header: the sheet's name, which can be renamed by clicking it, over its
// file. A cleared name goes back to the file's name.
function headerLabels(sheet, onChange) {
    const name = new Gtk.EditableLabel({text: displayName(sheet), xalign: 0, css_classes: ['heading']});
    name.get_delegate().max_length = MAX_NAME_LENGTH;
    // Paths shorten in the middle, so the file name itself stays visible.
    const file = new Gtk.Label({
        xalign: 0,
        ellipsize: Pango.EllipsizeMode.MIDDLE,
        max_width_chars: 48,
        css_classes: ['dim-label', 'caption'],
    });
    const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, valign: Gtk.Align.CENTER, spacing: 2});
    box.append(name);
    box.append(file);

    // The row opens and closes on any click in its header. Claiming the click
    // here starts the rename instead, and keeps the row as it is.
    const click = new Gtk.GestureClick();
    click.connect('pressed', () => {
        click.set_state(Gtk.EventSequenceState.CLAIMED);
        name.start_editing();
    });
    name.add_controller(click);

    name.connect('notify::editing', () => {
        if (name.editing)
            return;
        const typed = name.text.trim();
        const renamed = typed === displayName({...sheet, name: ''}) ? '' : typed;
        name.text = displayName({...sheet, name: renamed});
        if (renamed === sheet.name)
            return;
        sheet.name = renamed;
        onChange();
    });

    const refresh = () => {
        name.text = displayName(sheet);
        file.label = sheet.path || BUILT_IN_LABEL;
    };
    refresh();
    return {box, refresh};
}

// Width, Height and Scale are three views of scale_x and scale_y against the
// text's natural size, so changing one moves the others. Their own updates
// would echo back as edits, which the syncing flag ignores.
function sizeRows(sheet, measure, onChange) {
    const {scale_x: fieldX, scale_y: fieldY} = FIELDS;
    let natural = measure();
    let syncing = false;

    const edit = apply => {
        if (syncing)
            return;
        apply();
        sync();
        onChange();
    };

    // With the ratio locked, width and height keep their current proportion,
    // the way image editors do.
    const width = slider({label: 'Width', unit: 'px'}, value => edit(() => {
        const ratio = sheet.scale_y / sheet.scale_x;
        if (!sheet.lock_ratio) {
            sheet.scale_x = clamp(value / natural.width * 100, fieldX);
            return;
        }
        sheet.scale_x = clampTogether(value / natural.width * 100, fieldX, ratio, fieldY);
        sheet.scale_y = clamp(sheet.scale_x * ratio, fieldY);
    }));
    const height = slider({label: 'Height', unit: 'px'}, value => edit(() => {
        const ratio = sheet.scale_x / sheet.scale_y;
        if (!sheet.lock_ratio) {
            sheet.scale_y = clamp(value / natural.height * 100, fieldY);
            return;
        }
        sheet.scale_y = clampTogether(value / natural.height * 100, fieldY, ratio, fieldX);
        sheet.scale_x = clamp(sheet.scale_y * ratio, fieldX);
    }));
    // Scale resizes both and keeps any stretch, locked or not.
    const scale = slider({label: fieldY.label, unit: fieldY.unit}, value => edit(() => {
        const ratio = sheet.scale_x / sheet.scale_y;
        sheet.scale_y = clampTogether(value, fieldY, ratio, fieldX);
        sheet.scale_x = clamp(sheet.scale_y * ratio, fieldX);
    }));

    const sync = () => {
        syncing = true;
        width.scale.adjustment.configure(natural.width * sheet.scale_x / 100,
            natural.width * fieldX.min / 100, natural.width * fieldX.max / 100, 1, 10, 0);
        height.scale.adjustment.configure(natural.height * sheet.scale_y / 100,
            natural.height * fieldY.min / 100, natural.height * fieldY.max / 100, 1, 10, 0);
        scale.scale.adjustment.configure(sheet.scale_y, fieldY.min, fieldY.max, 1, 10, 0);
        syncing = false;
    };
    sync();

    const lock = new Adw.SwitchRow({title: 'Lock aspect ratio', active: sheet.lock_ratio});
    lock.connect('notify::active', () => {
        sheet.lock_ratio = lock.active;
        onChange();
    });

    return {
        rows: [lock, width.row, height.row, scale.row],
        remeasure: () => {
            natural = measure();
            sync();
        },
    };
}

// Clamps a scale so that the other one, at the given ratio, also stays in
// its range. Otherwise the ratio would quietly change at the limits.
function clampTogether(value, field, ratio, otherField) {
    const lower = Math.max(field.min, otherField.min / ratio);
    const upper = Math.min(field.max, otherField.max / ratio);
    return clamp(Math.min(upper, Math.max(lower, value)), field);
}

function fileRow(sheet, window, onPathChanged) {
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
        onPathChanged();
    });
    const choose = new Gtk.Button({label: 'Choose…', valign: Gtk.Align.CENTER});
    choose.connect('clicked', () => chooseFile(window, sheet.path, path => {
        setPath(path);
        onPathChanged();
    }));
    row.add_suffix(builtIn);
    row.add_suffix(choose);
    return row;
}

function chooseFile(window, currentPath, onChosen) {
    const text = new Gtk.FileFilter({name: 'Text, ANSI and Markdown files'});
    for (const pattern of ['*.ans', '*.txt', '*.md', '*.markdown'])
        text.add_pattern(pattern);
    text.add_mime_type('text/plain');
    text.add_mime_type('text/markdown');
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

function fieldSlider(sheet, name, max, onChange) {
    const field = FIELDS[name];
    return slider(field, value => {
        sheet[name] = value;
        onChange();
    }, {value: sheet[name], lower: field.min, upper: Math.min(field.max, max)});
}

// The range is set before the handler is connected, so building the window
// doesn't fire a change for every slider.
function slider({label, unit}, onChange, range = {value: 0, lower: 0, upper: 1}) {
    const scale = new Gtk.Scale({
        // Gtk.Adjustment.new sets value and limits together; as construct
        // properties, value can be clamped against the default upper of 0.
        adjustment: Gtk.Adjustment.new(range.value, range.lower, range.upper, 1, 10, 0),
        digits: 0,
        draw_value: true,
        value_pos: Gtk.PositionType.RIGHT,
        hexpand: true,
        width_request: 320,
        valign: Gtk.Align.CENTER,
    });
    scale.set_format_value_func((_scale, value) => `${Math.round(value)} ${unit}`);
    scale.connect('value-changed', () => onChange(Math.round(scale.get_value())));

    const row = new Adw.ActionRow({title: label});
    row.add_suffix(scale);
    return {row, scale};
}
