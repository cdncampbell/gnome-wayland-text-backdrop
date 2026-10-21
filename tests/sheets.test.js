// Run with `make test` (gjs -m tests/sheets.test.js).
import System from 'system';

import {
    FIELDS, MAX_NAME_LENGTH, MAX_SHEETS_PER_MONITOR, displayName, layout, newSheet, normalizeSheets, packSheets,
} from '../sheets.js';

const sheet = (monitor, extra = {}) => ({...newSheet(monitor), ...extra});
const json = value => JSON.stringify(value);

const cases = [
    ['a new sheet uses the field defaults and the built-in text',
        () => json(newSheet('DP-1')),
        json({monitor: 'DP-1', path: '', name: '', lock_ratio: true, x: FIELDS.x.default, y: FIELDS.y.default,
            opacity: FIELDS.opacity.default, padding: FIELDS.padding.default,
            scale_x: FIELDS.scale_x.default, scale_y: FIELDS.scale_y.default})],
    ['missing fields are filled from the defaults',
        () => json(normalizeSheets([{monitor: 'DP-2', path: '/a.ans'}])),
        json([sheet('DP-2', {path: '/a.ans'})])],
    ['out-of-range values are clamped and rounded',
        () => json(normalizeSheets([sheet('DP-1', {opacity: 140, padding: -5, x: 12.6})])),
        json([sheet('DP-1', {opacity: 100, padding: 0, x: 13})])],
    ['scales are clamped to 25-400%',
        () => json(normalizeSheets([sheet('DP-1', {scale_x: 1000, scale_y: 3})]).map(s => [s.scale_x, s.scale_y])),
        json([[400, 25]])],
    ['a lock_ratio that is not a boolean falls back to locked',
        () => normalizeSheets([sheet('DP-1', {lock_ratio: 'no'})])[0].lock_ratio,
        true],
    ['names are trimmed and capped',
        () => json(normalizeSheets([sheet('DP-1', {name: `  ${'n'.repeat(100)}  `})]).map(s => s.name.length)),
        json([MAX_NAME_LENGTH])],
    ['a name that is not a string falls back to empty',
        () => normalizeSheets([sheet('DP-1', {name: 7})])[0].name,
        ''],
    ['a custom name is shown as-is',
        () => displayName(sheet('DP-1', {name: 'Shortcuts', path: '/a/b.ans'})),
        'Shortcuts'],
    ['without a name, the file name is shown without its extension',
        () => displayName(sheet('DP-1', {path: '/home/me/kb16-cheat-sheet.ans'})),
        'kb16-cheat-sheet'],
    ['a dotted file name keeps all but its last extension',
        () => displayName(sheet('DP-1', {path: '/notes/v1.2.notes.md'})),
        'v1.2.notes'],
    ['a dotfile keeps its whole name',
        () => displayName(sheet('DP-1', {path: '/home/me/.notes'})),
        '.notes'],
    ['the built-in sheet is called Welcome text',
        () => displayName(sheet('DP-1')),
        'Welcome text'],
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
        () => json(normalizeSheets(packSheets([sheet('DP-3', {path: '/b.txt', name: 'B', x: 5, scale_x: 150,
            lock_ratio: false})]).recursiveUnpack())),
        json([sheet('DP-3', {path: '/b.txt', name: 'B', x: 5, scale_x: 150, lock_ratio: false})])],
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
