import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {pickMonitor} from './panel.js';
import {SheetPanel} from './sheetPanel.js';
import {layout, readSheets} from './sheets.js';

const BUILT_IN_SHEET = 'welcome.ans';

export default class TextBackdropExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._panels = [];

        this._settingsChangedId = this._settings.connect('changed::sheets', () => this._sync());
        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => this._sync());
        this._sync();
    }

    disable() {
        this._settings.disconnect(this._settingsChangedId);
        Main.layoutManager.disconnect(this._monitorsChangedId);
        for (const panel of this._panels)
            panel.destroy();
        this._panels = null;
        this._settings = null;
    }

    // Matches the panels to the current sheets and monitors. Existing panels
    // are updated in place, so dragging a slider doesn't rebuild anything.
    // Monitors are looked up by connector name (DP-1...), which stays the same
    // when the shell reorders its monitor list.
    _sync() {
        const monitorManager = global.backend.get_monitor_manager();
        const shown = layout(readSheets(this._settings),
            connector => monitorManager.get_monitor_for_connector(connector));

        while (this._panels.length > shown.length)
            this._panels.pop().destroy();
        while (this._panels.length < shown.length)
            this._panels.push(new SheetPanel(this.dir.get_child(BUILT_IN_SHEET)));

        shown.forEach(({sheet, monitorIndex}, i) =>
            this._panels[i].update(sheet, pickMonitor(Main.layoutManager.monitors, monitorIndex)));
    }
}
