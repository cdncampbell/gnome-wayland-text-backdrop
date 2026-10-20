// Where the panel goes and how it looks, kept free of shell imports so the
// tests can run it under plain gjs.

// The panel colour from the original stylesheet; only its opacity is a setting.
const PANEL_RGB = '15, 19, 26';

// The monitor at preferredIndex, or the left-most one when the index is -1
// (no connector chosen, or that connector isn't plugged in).
export function pickMonitor(monitors, preferredIndex) {
    if (preferredIndex >= 0 && preferredIndex < monitors.length)
        return monitors[preferredIndex];
    return monitors.reduce((a, b) => (b.x < a.x ? b : a));
}

export function panelStyle(opacityPercent, padding) {
    return `background-color: rgba(${PANEL_RGB}, ${opacityPercent / 100}); padding: ${padding}px;`;
}
