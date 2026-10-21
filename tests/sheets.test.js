// Run with `make test` (gjs -m tests/sheets.test.js).
import System from 'system';

import {FIELDS, MAX_SHEETS_PER_MONITOR, layout, newSheet, normalizeSheets, packSheets} from '../sheets.js';

const sheet = (monitor, extra = {}) => ({...newSheet(monitor), ...extra});
const json = value => JSON.stringify(value);

const cases = [
    ['a new sheet uses the field defaults and the built-in text',
        () => json(newSheet('DP-1')),
        json({monitor: 'DP-1', path: '', x: FIELDS.x.default, y: FIELDS.y.default,
            opacity: FIELDS.opacity.default, padding: FIELDS.padding.default})],
    ['missing fields are filled from the defaults',
        () => json(normalizeSheets([{monitor: 'DP-2', path: '/a.ans'}])),
        json([sheet('DP-2', {path: '/a.ans'})])],
    ['out-of-range values are clamped and rounded',
        () => json(normalizeSheets([sheet('DP-1', {opacity: 140, padding: -5, x: 12.6})])),
        json([sheet('DP-1', {opacity: 100, padding: 0, x: 13})])],
    ['sheets without a monitor are dropped',
        () => normalizeSheets([{path: '/a.ans'}, sheet('')]).length,
        0],
    [`a monitor keeps at most ${MAX_SHEETS_PER_MONITOR} sheets`,
        () => normalizeSheets([...Array(6)].map(() => sheet('DP-1')).concat(sheet('DP-2'))).map(s => s.monitor).join(),
        'DP-1,DP-1,DP-1,DP-1,DP-2'],
    ['no sheets shows the built-in text on the left-most monitor',
        () => json(layout([], () => 0)),
        json([{sheet: newSheet(''), monitorIndex: -1}])],
    ['sheets on unplugged monitors are hidden',
        () => json(layout([sheet('DP-1'), sheet('HDMI-1')], connector => (connector === 'DP-1' ? 2 : -1))),
        json([{sheet: sheet('DP-1'), monitorIndex: 2}])],
    ['packing round-trips through a GVariant',
        () => json(normalizeSheets(packSheets([sheet('DP-3', {path: '/b.txt', x: 5})]).recursiveUnpack())),
        json([sheet('DP-3', {path: '/b.txt', x: 5})])],
    ['packed sheets have the setting\'s type',
        () => packSheets([]).get_type_string(),
        'aa{sv}'],
];

let failed = 0;
for (const [name, run, expected] of cases) {
    const actual = run();
    if (actual !== expected) {
        failed++;
        print(`FAIL ${name}\n  expected ${expected}\n  actual   ${actual}`);
    }
}

print(failed ? `${failed} failed` : `all ${cases.length} passed`);
System.exit(failed ? 1 : 0);
