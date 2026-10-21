// Where the panel goes and how it looks, kept free of shell imports so the
// tests can run it under plain gjs.

// The panel colour from the original stylesheet; only its opacity is a setting.
const PANEL_RGB = '15, 19, 26';

// The settings window measures sheets with the same font, so these live here
// rather than in stylesheet.css. DejaVu Sans Mono covers box drawing and
// arrows, so column layouts line up.
export const FONT_FAMILY = 'DejaVu Sans Mono';
export const BASE_FONT_PX = 15;

// The monitor at preferredIndex, or the left-most one when the index is -1.
export function pickMonitor(monitors, preferredIndex) {
    if (preferredIndex >= 0 && preferredIndex < monitors.length)
        return monitors[preferredIndex];
    return monitors.reduce((a, b) => (b.x < a.x ? b : a));
}

export function panelStyle(opacityPercent, padding, scalePercent) {
    return `font-family: "${FONT_FAMILY}", monospace; font-size: ${BASE_FONT_PX * scalePercent / 100}px; `
        + `background-color: rgba(${PANEL_RGB}, ${opacityPercent / 100}); padding: ${padding}px;`;
}
