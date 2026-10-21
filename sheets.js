// The `sheets` setting: a list of
// {monitor, path, name, font_family, lock_ratio, x, y, opacity, padding,
//  scale_x, scale_y, font_size}.
// Used by both the shell and the settings window, so it imports only GLib.
// GSettings can't range-check fields inside a dictionary, so the limits live
// here and every read and write goes through normalizeSheets().

import GLib from 'gi://GLib';

export const MAX_SHEETS_PER_MONITOR = 4;
export const MAX_NAME_LENGTH = 60;

// DejaVu Sans Mono covers box drawing and arrows, so column layouts line up.
export const DEFAULT_FONT_FAMILY = 'DejaVu Sans Mono';

// x and y are capped again by the monitor's size in the settings window.
// scale_x and scale_y size the text against its natural size, so a sheet
// keeps its proportions when the file's content changes.
export const FIELDS = {
    x: {label: 'Left', unit: 'px', default: 48, min: 0, max: 8192},
    y: {label: 'Top', unit: 'px', default: 48, min: 0, max: 8192},
    opacity: {label: 'Background opacity', unit: '%', default: 86, min: 0, max: 100},
    padding: {label: 'Padding', unit: 'px', default: 22, min: 0, max: 200},
    scale_x: {label: 'Horizontal scale', unit: '%', default: 100, min: 25, max: 400},
    scale_y: {label: 'Scale', unit: '%', default: 100, min: 25, max: 400},
    // The size the scales multiply, in points like other GNOME font settings.
    font_size: {label: 'Font size', unit: 'pt', default: 11, min: 6, max: 72},
};

// An empty path means the built-in welcome text, and an empty name means
// the sheet is called after its file (see displayName).
export function newSheet(monitor) {
    const sheet = {monitor, path: '', name: '', font_family: DEFAULT_FONT_FAMILY, lock_ratio: true};
    for (const [name, field] of Object.entries(FIELDS))
        sheet[name] = field.default;
    return sheet;
}

export function clamp(value, field) {
    if (!Number.isFinite(value))
        return field.default;
    return Math.min(field.max, Math.max(field.min, Math.round(value)));
}

export function normalizeSheets(sheets) {
    const perMonitor = new Map();
    const normalized = [];
    for (const sheet of sheets) {
        if (typeof sheet.monitor !== 'string' || !sheet.monitor)
            continue;
        const count = perMonitor.get(sheet.monitor) ?? 0;
        if (count >= MAX_SHEETS_PER_MONITOR)
            continue;
        perMonitor.set(sheet.monitor, count + 1);

        const clean = newSheet(sheet.monitor);
        if (typeof sheet.path === 'string')
            clean.path = sheet.path;
        if (typeof sheet.name === 'string')
            clean.name = sheet.name.trim().slice(0, MAX_NAME_LENGTH);
        if (typeof sheet.font_family === 'string')
            clean.font_family = cleanFontFamily(sheet.font_family);
        if (typeof sheet.lock_ratio === 'boolean')
            clean.lock_ratio = sheet.lock_ratio;
        for (const [name, field] of Object.entries(FIELDS))
            clean[name] = clamp(sheet[name], field);
        normalized.push(clean);
    }
    return normalized;
}

// The family goes into the panel's CSS inside quotes, so anything that could
// end the string or the rule is dropped.
function cleanFontFamily(family) {
    return family.replace(/["\\;{}]/g, '').trim() || DEFAULT_FONT_FAMILY;
}

export function packSheets(sheets) {
    return new GLib.Variant('aa{sv}', normalizeSheets(sheets).map(sheet => {
        const packed = {
            monitor: new GLib.Variant('s', sheet.monitor),
            path: new GLib.Variant('s', sheet.path),
            name: new GLib.Variant('s', sheet.name),
            font_family: new GLib.Variant('s', sheet.font_family),
            lock_ratio: new GLib.Variant('b', sheet.lock_ratio),
        };
        for (const name of Object.keys(FIELDS))
            packed[name] = new GLib.Variant('i', sheet[name]);
        return packed;
    }));
}

export function displayName(sheet) {
    if (sheet.name)
        return sheet.name;
    if (!sheet.path)
        return 'Welcome text';
    const file = sheet.path.split('/').pop();
    const dot = file.lastIndexOf('.');
    return dot > 0 ? file.slice(0, dot) : file;
}

export function readSheets(settings) {
    return normalizeSheets(settings.get_value('sheets').recursiveUnpack());
}

export function writeSheets(settings, sheets) {
    settings.set_value('sheets', packSheets(sheets));
}

// Which sheets to draw, each with the index of its monitor. A sheet whose
// monitor isn't plugged in is left out until it comes back. With nothing
// configured, the built-in text goes on the left-most monitor (index -1).
export function layout(sheets, monitorIndexFor) {
    if (sheets.length === 0)
        return [{sheet: newSheet(''), monitorIndex: -1}];
    return sheets
        .map(sheet => ({sheet, monitorIndex: monitorIndexFor(sheet.monitor)}))
        .filter(({monitorIndex}) => monitorIndex >= 0);
}
