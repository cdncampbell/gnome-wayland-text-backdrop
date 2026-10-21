import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {sheetGroup} from './prefs/sheetGroup.js';
import {FIELDS, MAX_SHEETS_PER_MONITOR, newSheet, readSheets, writeSheets} from './sheets.js';

export default class TextBackdropPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        // The window edits this list and saves all of it on every change.
        const sheets = readSheets(settings);
        const save = () => writeSheets(settings, sheets);

        for (const monitor of listMonitors(sheets))
            window.add(monitorPage(monitor, sheets, save, window));
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
        monitors.push({connector: monitor.get_connector(), description: monitor.get_description(), connected: true, x, width, height});
    }
    monitors.sort((a, b) => a.x - b.x);

    for (const connector of new Set(sheets.map(sheet => sheet.monitor))) {
        if (!monitors.some(monitor => monitor.connector === connector))
            monitors.push({connector, description: null, connected: false, width: FIELDS.x.max, height: FIELDS.y.max});
    }
    return monitors;
}

function monitorPage(monitor, sheets, save, window) {
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

    let groups = [];
    const render = () => {
        for (const group of groups)
            page.remove(group);
        const mine = sheets.filter(sheet => sheet.monitor === monitor.connector);
        groups = mine.map((sheet, index) => sheetGroup({
            index, sheet, monitor, window,
            onChange: save,
            onRemove: () => {
                sheets.splice(sheets.indexOf(sheet), 1);
                save();
                render();
            },
        }));
        for (const group of groups)
            page.add(group);

        add.sensitive = mine.length < MAX_SHEETS_PER_MONITOR;
        add.tooltip_text = add.sensitive ? '' : `A monitor can show up to ${MAX_SHEETS_PER_MONITOR} sheets`;
        header.description = mine.length === 0 ? `${about}\nNo sheets on this monitor.` : about;
    };

    add.connect('clicked', () => {
        if (sheets.filter(sheet => sheet.monitor === monitor.connector).length >= MAX_SHEETS_PER_MONITOR)
            return;
        sheets.push(newSheet(monitor.connector));
        save();
        render();
    });
    render();
    return page;
}
