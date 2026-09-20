'use client'

import * as React from 'react'

import { visibleNavSections } from '@/lib/nav-config'
import { useAuthStore } from '@/stores/auth-store'

/** I gruppi di navigazione visibili all'utente loggato (ruolo e strumenti abilitati). */
export function useNavSections() {
  const user = useAuthStore((s) => s.user)
  return React.useMemo(() => visibleNavSections(user), [user])
}
