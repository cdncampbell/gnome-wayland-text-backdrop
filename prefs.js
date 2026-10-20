import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const BUILT_IN_LABEL = 'Built-in example (KB16 macropad cheat sheet)';

export default class TextBackdropPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        page.add(displayGroup(settings));
        page.add(sheetGroup(settings, window));
        page.add(appearanceGroup(settings));
        window.add(page);
    }
}

// Titles, subtitles and ranges come from the schema, so they live in one place.
function schemaKey(settings, key) {
    return settings.settings_schema.get_key(key);
}

// The settings window runs in its own GTK process, away from the shell, so it
// lists monitors through Gdk. Connector names (DP-1...) match the shell's.
function displayGroup(settings) {
    const saved = settings.get_string('monitor-connector');
    const list = Gdk.Display.get_default().get_monitors();
    const monitors = [];
    for (let i = 0; i < list.get_n_items(); i++)
        monitors.push(list.get_item(i));
    monitors.sort((a, b) => a.get_geometry().x - b.get_geometry().x);

    const connectors = [''];
    const labels = ['Auto (left-most)'];
    for (const monitor of monitors) {
        const {x, width, height} = monitor.get_geometry();
        const name = [monitor.get_connector(), monitor.get_description(), `${width}×${height} at x=${x}`];
        connectors.push(monitor.get_connector());
        labels.push(name.filter(Boolean).join(' · '));
    }
    // Keep a saved choice that's unplugged right now, rather than losing it.
    if (saved && !connectors.includes(saved)) {
        connectors.push(saved);
        labels.push(`${saved} (not connected)`);
    }

    const key = schemaKey(settings, 'monitor-connector');
    const row = new Adw.ComboRow({
        title: key.get_summary(),
        subtitle: 'Auto, or an unplugged choice, uses the left-most monitor',
        model: Gtk.StringList.new(labels),
        selected: connectors.indexOf(saved),
    });
    row.connect('notify::selected', () => settings.set_string('monitor-connector', connectors[row.selected]));

    const group = new Adw.PreferencesGroup({title: 'Display'});
    group.add(row);
    return group;
}

function sheetGroup(settings, window) {
    // Paths can contain & or <, so show them as plain text, not markup.
    const row = new Adw.ActionRow({
        title: schemaKey(settings, 'sheet-path').get_summary(),
        use_markup: false,
    });
    const showPath = () => {
        row.subtitle = settings.get_string('sheet-path') || BUILT_IN_LABEL;
    };
    settings.connect('changed::sheet-path', showPath);
    showPath();

    const reset = new Gtk.Button({label: 'Use built-in', valign: Gtk.Align.CENTER});
    reset.connect('clicked', () => settings.reset('sheet-path'));
    const choose = new Gtk.Button({label: 'Choose…', valign: Gtk.Align.CENTER});
    choose.connect('clicked', () => chooseFile(settings, window));
    row.add_suffix(reset);
    row.add_suffix(choose);

    const group = new Adw.PreferencesGroup({
        title: 'Text',
        description: 'Plain text, or text with ANSI colour codes. The desktop redraws when the file changes.',
    });
    group.add(row);
    return group;
}

function chooseFile(settings, window) {
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
    const current = settings.get_string('sheet-path');
    if (current)
        dialog.initial_file = Gio.File.new_for_path(current);

    dialog.open(window, null, (_dialog, result) => {
        try {
            settings.set_string('sheet-path', dialog.open_finish(result).get_path());
        } catch (e) {
            if (!e.matches(Gtk.DialogError, Gtk.DialogError.DISMISSED))
                console.error(e);
        }
    });
}

function appearanceGroup(settings) {
    const group = new Adw.PreferencesGroup({title: 'Appearance'});
    for (const name of ['background-opacity', 'padding', 'margin-x', 'margin-y']) {
        const key = schemaKey(settings, name);
        const [, [lower, upper]] = key.get_range().recursiveUnpack();
        const row = Adw.SpinRow.new_with_range(lower, upper, 1);
        row.title = key.get_summary();
        row.subtitle = key.get_description();
        settings.bind(name, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(row);
    }
    return group;
}
