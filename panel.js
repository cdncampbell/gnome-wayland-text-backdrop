// Where the panel goes and how it looks, kept free of shell imports so the
// tests can run it under plain gjs.

// The panel colour from the original stylesheet; only its opacity is a setting.
const PANEL_RGB = '15, 19, 26';

// The monitor at preferredIndex, or the left-most one when the index is -1.
export function pickMonitor(monitors, preferredIndex) {
    if (preferredIndex >= 0 && preferredIndex < monitors.length)
        return monitors[preferredIndex];
    return monitors.reduce((a, b) => (b.x < a.x ? b : a));
}

// The monospace fallback keeps columns aligned if the chosen font is missing.
export function panelStyle(sheet) {
    return `font-family: "${sheet.font_family}", monospace; font-size: ${sheet.font_size * sheet.scale_y / 100}pt; `
        + `background-color: rgba(${PANEL_RGB}, ${sheet.opacity / 100}); padding: ${sheet.padding}px;`;
}
