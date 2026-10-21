// Run with `make test` (gjs -m tests/panel.test.js).
import System from 'system';

import {panelStyle, pickMonitor} from '../panel.js';

const left = {x: 0, name: 'left'};
const middle = {x: 2560, name: 'middle'};
const right = {x: 5120, name: 'right'};
// Ordered the way the shell lists them: primary first, not left to right.
const monitors = [middle, left, right];

const cases = [
    ['a valid index picks that monitor', () => pickMonitor(monitors, 2).name, 'right'],
    ['-1 (no connector, or not plugged in) falls back to left-most',
        () => pickMonitor(monitors, -1).name, 'left'],
    ['an out-of-range index falls back to left-most', () => pickMonitor(monitors, 7).name, 'left'],
    ['font, size, opacity and padding become inline CSS',
        () => panelStyle({font_family: 'DejaVu Sans Mono', font_size: 11, scale_y: 100, opacity: 86, padding: 22}),
        'font-family: "DejaVu Sans Mono", monospace; font-size: 11pt; '
        + 'background-color: rgba(15, 19, 26, 0.86); padding: 22px;'],
    ['0% opacity leaves the text with no panel',
        () => panelStyle({font_family: 'Iosevka', font_size: 10, scale_y: 100, opacity: 0, padding: 0}),
        'font-family: "Iosevka", monospace; font-size: 10pt; background-color: rgba(15, 19, 26, 0); padding: 0px;'],
    ['the scale multiplies the font size',
        () => panelStyle({font_family: 'Iosevka', font_size: 12, scale_y: 150, opacity: 0, padding: 0})
            .match(/font-size: [^;]+/)[0],
        'font-size: 18pt'],
];

let failed = 0;
for (const [name, run, expected] of cases) {
    const actual = run();
    if (actual !== expected) {
        failed++;
        print(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
    }
}

print(failed ? `${failed} failed` : `all ${cases.length} passed`);
System.exit(failed ? 1 : 0);
