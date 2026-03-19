'use client'

import { useCallback, useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, DEFAULT_THEME, isValidThemeId, type ThemeId } from '@/lib/theme'
import { authClient } from '@/services/api/auth-client'

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored && isValidThemeId(stored) ? (stored as ThemeId) : DEFAULT_THEME
}

/** Writes server-provided theme to localStorage + DOM (for pre-hydration script). */
export function syncThemeToLocalStorage(theme: ThemeId) {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(getInitialTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    localStorage.setItem(THEME_STORAGE_KEY, id)
    document.documentElement.setAttribute('data-theme', id)
    authClient.updateSettings({ theme: id }).catch(() => {})
  }, [])

  return { theme, setTheme, mounted }
}
