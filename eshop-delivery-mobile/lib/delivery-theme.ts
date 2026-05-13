import type { DeliveryThemeMode } from './delivery-context.types'

export function isDarkTheme(themeMode: DeliveryThemeMode) {
    return themeMode === 'dark'
}

export function getDeliveryPalette(themeMode: DeliveryThemeMode) {
    const dark = isDarkTheme(themeMode)

    return {
        dark,
        statusBar: dark ? ('light' as const) : ('dark' as const),
        background: dark ? '#08110d' : '#f5f7f6',
        backgroundMuted: dark ? '#0f1d17' : '#eef4f0',
        card: dark ? '#101b16' : '#ffffff',
        cardMuted: dark ? '#14241c' : '#f3f6f4',
        cardStrong: dark ? '#0b1410' : '#050505',
        border: dark ? '#22352b' : '#dde5df',
        borderSoft: dark ? '#1a2a21' : '#edf1ee',
        text: dark ? '#f3f7f4' : '#111827',
        textMuted: dark ? '#94a39a' : '#6f7a8e',
        textSoft: dark ? '#738277' : '#9aa4b4',
        accent: '#19cf6f',
        accentSoft: dark ? '#123b27' : '#e5faf0',
        danger: '#ef4444',
        dangerSoft: dark ? '#301516' : '#fff1ef',
        shadow: dark ? 'rgba(0,0,0,0.3)' : 'rgba(15,23,42,0.12)',
        overlay: dark ? 'rgba(255,255,255,0.06)' : 'rgba(5,5,5,0.05)',
        buttonTextOnAccent: '#05110b',
        buttonTextOnDark: '#ffffff',
    }
}
