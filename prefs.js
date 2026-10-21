import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {sheetRow} from './prefs/sheetRow.js';
import {BUILT_IN_SHEET} from './render.js';
import {FIELDS, MAX_SHEETS_PER_MONITOR, newSheet, readSheets, writeSheets} from './sheets.js';

export default class TextBackdropPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        // The window edits this list and saves all of it on every change.
        const sheets = readSheets(settings);
        const save = () => writeSheets(settings, sheets);

        for (const monitor of listMonitors(sheets))
            window.add(monitorPage(monitor, sheets, save, window, this.dir.get_child(BUILT_IN_SHEET)));
    }
}

// The settings window runs in its own GTK process, away from the shell, so it
// lists monitors through Gdk. Connector names (DP-1...) match the shell's.
// Monitors that aren't plugged in but still have sheets are listed too, so
// their sheets can be edited or removed.
function listMonitors(sheets) {
    const list = Gdk.Display.get_default().get_monitors();
    const monitors = [];
    for (let i = 0; i < list.get_n_items(); i++) {
        const monitor = list.get_item(i);
        const {x, width, height} = monitor.get_geometry();
        monitors.push({
            connector: monitor.get_connector(),
            description: monitor.get_description(),
            connected: true,
            x, width, height,
        });
    }
    monitors.sort((a, b) => a.x - b.x);

    for (const connector of new Set(sheets.map(sheet => sheet.monitor))) {
        if (!monitors.some(monitor => monitor.connector === connector))
            monitors.push({connector, description: null, connected: false, width: FIELDS.x.max, height: FIELDS.y.max});
    }
    return monitors;
}

function monitorPage(monitor, sheets, save, window, builtInFile) {
    const page = new Adw.PreferencesPage({
        name: monitor.connector,
        title: monitor.connected ? monitor.connector : `${monitor.connector} (not connected)`,
        icon_name: 'video-display-symbolic',
    });

    const add = new Gtk.Button({label: 'Add sheet', valign: Gtk.Align.CENTER, css_classes: ['suggested-action']});
    const about = monitor.connected
        ? `${monitor.description ?? 'Monitor'} · ${monitor.width}×${monitor.height}`
        : 'Not connected. Its sheets show again when it is plugged back in.';
    const header = new Adw.PreferencesGroup({title: monitor.connector});
    header.set_header_suffix(add);
    page.add(header);
    const list = new Adw.PreferencesGroup({title: 'Sheets'});
    page.add(list);

    // Rows are added and removed one at a time, so the others (and whichever
    // one is open) stay as they are.
    const rows = [];
    const refresh = () => {
        list.visible = rows.length > 0;
        add.sensitive = rows.length < MAX_SHEETS_PER_MONITOR;
        add.tooltip_text = add.sensitive ? '' : `A monitor can show up to ${MAX_SHEETS_PER_MONITOR} sheets`;
        header.description = rows.length === 0 ? `${about}\nNo sheets on this monitor.` : about;
    };

    const addRow = sheet => {
        const row = sheetRow({
            sheet, monitor, window, builtInFile,
            onChange: save,
            onRemove: () => {
                sheets.splice(sheets.indexOf(sheet), 1);
                save();
                rows.splice(rows.indexOf(row), 1);
                list.remove(row);
                refresh();
            },
        });
        // An accordion: opening one sheet closes the others on this monitor.
        row.connect('notify::expanded', () => {
            if (!row.expanded)
                return;
            for (const other of rows) {
                if (other !== row)
                    other.expanded = false;
            }
        });
        rows.push(row);
        list.add(row);
        return row;
    };

    for (const sheet of sheets.filter(s => s.monitor === monitor.connector))
        addRow(sheet);
    refresh();

    add.connect('clicked', () => {
        if (rows.length >= MAX_SHEETS_PER_MONITOR)
            return;
        const sheet = newSheet(monitor.connector);
        sheets.push(sheet);
        save();
        addRow(sheet).expanded = true;
        refresh();
    });
    return page;
}
