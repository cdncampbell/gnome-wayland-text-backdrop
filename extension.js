import Pango from 'gi://Pango';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ansiToPango} from './ansi.js';

const SHEET = 'kb16-cheat-sheet.ans';
const MARGIN = 48;

export default class Kb16CheatSheetExtension extends Extension {
    enable() {
        const [, bytes] = this.dir.get_child(SHEET).load_contents(null);

        this._label = new St.Label({style_class: 'kb16-cheatsheet'});
        // St.Label ellipsizes by default; the sheet is laid out to exact
        // columns, so let it take its full natural width.
        this._label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this._label.clutter_text.set_markup(ansiToPango(new TextDecoder().decode(bytes)));

        // The background group sits under every window, so the sheet reads
        // like part of the wallpaper. It's private API, but it's what the
        // desktop-widget extensions use; check it first when GNOME updates.
        Main.layoutManager._backgroundGroup.add_child(this._label);

        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => this._place());
        this._place();
    }

    disable() {
        Main.layoutManager.disconnect(this._monitorsChangedId);
        this._label.destroy();
        this._label = null;
    }

    // Pin to whichever monitor is furthest left, by position, so it stays on
    // the left screen even if the primary monitor or monitor order changes.
    _place() {
        const left = Main.layoutManager.monitors.reduce((a, b) => (b.x < a.x ? b : a));
        this._label.set_position(left.x + MARGIN, left.y + MARGIN);
    }
}
