import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {panelStyle} from './panel.js';
import {sheetMarkup} from './render.js';

// Editors save in bursts of events; redraw this long after the last one, so one save is one redraw.
const RELOAD_DELAY_MS = 200;

// One text panel on the desktop: its label, the file it shows, and the watch
// that redraws it when that file changes.
export class SheetPanel {
    constructor(builtInFile) {
        this._builtInFile = builtInFile;

        this._label = new St.Label({style_class: 'text-backdrop'});
        // St.Label ellipsizes by default; text laid out in columns needs its
        // full natural width.
        this._label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        // The background group sits under every window, so the text reads
        // like part of the wallpaper. It's private API, but it's what the
        // desktop-widget extensions use; check it first when GNOME updates.
        Main.layoutManager._backgroundGroup.add_child(this._label);
    }

    // Called on every settings change, including each step of a slider drag,
    // so the file is only re-read when the path itself changes.
    update(sheet, monitor) {
        if (sheet.path !== this._path) {
            this._path = sheet.path;
            this._watchSheet();
        }
        // The font size carries the vertical scale, so locked scaling stays
        // sharp. Any extra width is a sideways stretch of the drawn label.
        this._label.set_style(panelStyle(sheet.opacity, sheet.padding, sheet.scale_y));
        this._label.set_scale(sheet.scale_x / sheet.scale_y, 1);
        this._label.set_position(monitor.x + sheet.x, monitor.y + sheet.y);
    }

    destroy() {
        this._unwatchSheet();
        this._label.destroy();
        this._label = null;
    }

    // Watching a path that doesn't exist yet is fine: GIO keeps checking, so
    // a file on a drive that mounts after login shows up once it's there.
    _watchSheet() {
        this._unwatchSheet();
        this._sheet = this._path ? Gio.File.new_for_path(this._path) : this._builtInFile;
        this._sheetMonitor = this._sheet.monitor_file(Gio.FileMonitorFlags.NONE, null);
        this._sheetChangedId = this._sheetMonitor.connect('changed', () => this._scheduleReload());
        this._loadSheet();
    }

    _unwatchSheet() {
        if (this._reloadId) {
            GLib.Source.remove(this._reloadId);
            this._reloadId = 0;
        }
        if (this._sheetMonitor) {
            this._sheetMonitor.disconnect(this._sheetChangedId);
            this._sheetMonitor.cancel();
            this._sheetMonitor = null;
        }
        this._sheet = null;
    }

    _scheduleReload() {
        if (this._reloadId)
            GLib.Source.remove(this._reloadId);
        this._reloadId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, RELOAD_DELAY_MS, () => {
            this._reloadId = 0;
            this._loadSheet();
            return GLib.SOURCE_REMOVE;
        });
    }

    _loadSheet() {
        this._label.clutter_text.set_markup(sheetMarkup(this._sheet));
    }
}
