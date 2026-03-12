'use client'

import { useCallback, useEffect, useState } from 'react'
import { THEME_STORAGE_KEY, DEFAULT_THEME, isValidThemeId, type ThemeId } from '@/lib/theme'

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored && isValidThemeId(stored) ? (stored as ThemeId) : DEFAULT_THEME
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
  }, [])

  return { theme, setTheme, mounted }
}
