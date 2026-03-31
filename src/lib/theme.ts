export const THEME_STORAGE_KEY = 'mbs-theme'

export type ThemeId = 'neon' | 'neon-warm' | 'neon-oled' | 'light-clean'

const ALL_THEME_IDS: ThemeId[] = ['neon', 'neon-warm', 'neon-oled', 'light-clean']

export const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: 'neon', label: 'Neon (default)' },
  { id: 'neon-warm', label: 'Neon caldo' },
  { id: 'neon-oled', label: 'Neon OLED (nero puro)' },
  { id: 'light-clean', label: 'Light pulito' },
]

export const DARK_THEME_OPTIONS = THEME_OPTIONS.slice(0, 3)
export const LIGHT_THEME_OPTIONS = THEME_OPTIONS.slice(3, 4)

export const DEFAULT_THEME: ThemeId = 'neon'

export function isValidThemeId(value: string): value is ThemeId {
  return ALL_THEME_IDS.includes(value as ThemeId)
}
