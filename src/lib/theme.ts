export const THEME_STORAGE_KEY = 'mbs-theme'

export type ThemeId = 'slate' | 'warm' | 'oled' | 'light-slate' | 'light-warm' | 'light-pure'

const ALL_THEME_IDS: ThemeId[] = [
  'slate',
  'warm',
  'oled',
  'light-slate',
  'light-warm',
  'light-pure',
]

export const THEME_OPTIONS: { id: ThemeId; label: string }[] = [
  { id: 'slate', label: 'Dark neutro (grigio / slate)' },
  { id: 'warm', label: 'Dark caldo (warm / sepia)' },
  { id: 'oled', label: 'Dark OLED (quasi nero)' },
  { id: 'light-slate', label: 'Light neutro (grigio / slate)' },
  { id: 'light-warm', label: 'Light caldo (warm / sepia)' },
  { id: 'light-pure', label: 'Light puro (alto contrasto)' },
]

export const DARK_THEME_OPTIONS = THEME_OPTIONS.slice(0, 3)
export const LIGHT_THEME_OPTIONS = THEME_OPTIONS.slice(3, 6)

export const DEFAULT_THEME: ThemeId = 'slate'

export function isValidThemeId(value: string): value is ThemeId {
  return ALL_THEME_IDS.includes(value as ThemeId)
}
