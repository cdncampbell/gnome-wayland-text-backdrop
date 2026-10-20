import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ansiToPango} from './ansi.js';
import {panelStyle, pickMonitor} from './panel.js';

const BUILT_IN_SHEET = 'kb16-cheat-sheet.ans';
// Editors save in bursts of events; wait this long so one save is one redraw.
const RELOAD_DELAY_MS = 200;

export default class TextBackdropExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._label = new St.Label({style_class: 'text-backdrop'});
        // St.Label ellipsizes by default; text laid out in columns needs its
        // full natural width.
        this._label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

        // The background group sits under every window, so the text reads
        // like part of the wallpaper. It's private API, but it's what the
        // desktop-widget extensions use; check it first when GNOME updates.
        Main.layoutManager._backgroundGroup.add_child(this._label);

        this._settingsChangedId = this._settings.connect('changed',
            (_settings, key) => this._onSettingChanged(key));
        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => this._place());

        this._style();
        this._watchSheet();
        this._place();
    }

    disable() {
        this._settings.disconnect(this._settingsChangedId);
        Main.layoutManager.disconnect(this._monitorsChangedId);
        this._unwatchSheet();
        this._label.destroy();
        this._label = null;
        this._settings = null;
    }

    _onSettingChanged(key) {
        if (key === 'sheet-path')
            this._watchSheet();
        else if (key === 'background-opacity' || key === 'padding')
            this._style();
        else
            this._place();
    }

    // The chosen monitor is stored by connector name (DP-2...), so it means
    // the same screen even when the shell reorders its monitor list.
    _place() {
        const connector = this._settings.get_string('monitor-connector');
        const preferred = connector
            ? global.backend.get_monitor_manager().get_monitor_for_connector(connector)
            : -1;
        const monitor = pickMonitor(Main.layoutManager.monitors, preferred);
        this._label.set_position(
            monitor.x + this._settings.get_int('margin-x'),
            monitor.y + this._settings.get_int('margin-y'));
    }

    _style() {
        this._label.set_style(panelStyle(
            this._settings.get_int('background-opacity'),
            this._settings.get_int('padding')));
    }

    // Watching a path that doesn't exist yet is fine: GIO keeps checking, so
    // a file on a drive that mounts after login shows up once it's there.
    _watchSheet() {
        this._unwatchSheet();
        const path = this._settings.get_string('sheet-path');
        this._sheet = path ? Gio.File.new_for_path(path) : this.dir.get_child(BUILT_IN_SHEET);
        this._sheetMonitor = this._sheet.monitor_file(Gio.FileMonitorFlags.NONE, null);
        this._sheetMonitor.connect('changed', () => this._scheduleReload());
        this._loadSheet();
    }

    _unwatchSheet() {
        if (this._reloadId) {
            GLib.source_remove(this._reloadId);
            this._reloadId = 0;
        }
        this._sheetMonitor?.cancel();
        this._sheetMonitor = null;
    }

    _scheduleReload() {
        if (this._reloadId)
            return;
        this._reloadId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, RELOAD_DELAY_MS, () => {
            this._reloadId = 0;
            this._loadSheet();
            return GLib.SOURCE_REMOVE;
        });
    }

    _loadSheet() {
        let text;
        try {
            const [, bytes] = this._sheet.load_contents(null);
            text = new TextDecoder().decode(bytes);
        } catch {
            text = `Text Backdrop: can't read ${this._sheet.get_path()}`;
        }
        this._label.clutter_text.set_markup(ansiToPango(text));
    }
}
