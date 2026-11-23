import type { AuthUser, UserRole } from '@/services/api/auth-client'

/**
 * Sections of the site an admin switches on or off per user from the backoffice (ADAPTER_STATUS
 * §14.366; the first one, «Risultato + Goal», since §14.122). The backend refuses the API of a
 * section switched off with the same rule; here it decides the menu entries and what a page
 * shows (`SectionGuard`). The keys are the ones of users.enabled_tools.
 */
export const SECTIONS = [
  { key: 'offers', label: 'Offerte' },
  // §14.390: la sezione è la tendina «Radar», l'Oddsmatcher e Best Odds insieme (la chiave resta).
  { key: 'oddsmatcher', label: 'Radar' },
  { key: 'result_btts', label: 'Risultato + Goal' },
  { key: 'calculators', label: 'Calcolatori' },
  { key: 'tracker', label: 'Tracker' },
  { key: 'guide', label: 'Guide' },
  { key: 'forum', label: 'Forum' },
] as const

export type SectionKey = (typeof SECTIONS)[number]['key']

/** Where each section lives, for the links of «Sezione non abilitata» (the first page of the section). */
export const SECTION_HOME: Record<SectionKey, string> = {
  offers: '/offerte',
  oddsmatcher: '/odds-scanner',
  result_btts: '/risultato-goal',
  calculators: '/calcolatori',
  // §14.367: la Dashboard non è più del tracker (/dashboard, per tutti): la sua prima pagina è Giocate.
  tracker: '/profit-tracker/giocate',
  guide: '/guide',
  forum: '/forum',
}

export function sectionLabel(key: SectionKey): string {
  return SECTIONS.find((s) => s.key === key)?.label ?? key
}

/**
 * `result_btts`: «Risultato + Goal», the Result & Both Teams To Score market compared inside one
 * bookmaker (§14.122). Kept with its old names: it was the first tool switched on per user.
 */
export const TOOL_RESULT_BTTS = 'result_btts'
export type ToolKey = SectionKey

/**
 * An admin opens every section; a user the ones switched on for them from the backoffice. On a
 * backend older than §14.366 (no `sections` in the user) every section was open to everyone but
 * «Risultato + Goal», which followed `tools`.
 */
export function canUseSection(
  user: Pick<AuthUser, 'role' | 'tools' | 'sections'> | null | undefined,
  section: SectionKey,
): boolean {
  if (!user) return false
  if (user.role === 'ADMIN_ROLE') return true
  if (Array.isArray(user.sections)) return user.sections.includes(section)
  if (section === TOOL_RESULT_BTTS) return Array.isArray(user.tools) && user.tools.includes(section)
  return true
}

/** §14.122's name for the same rule, still used by the calculators catalog. */
export const canUseTool = canUseSection

/**
 * Whether the user has the role a page or a card asks for; nothing asked,
 * everyone passes. (The offline «Risultato + Goal» calculator, admin-only in
 * §14.220, follows `canUseTool` since §14.340.)
 */
export function hasRole(
  user: Pick<AuthUser, 'role'> | null | undefined,
  role: UserRole | undefined,
): boolean {
  if (!role) return true
  return user?.role === role
}
