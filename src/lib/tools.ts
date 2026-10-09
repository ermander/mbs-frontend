import type { AuthUser, UserRole } from '@/services/api/auth-client'

/**
 * Per-user tools (ADAPTER_STATUS §14.122). The backend gates each tool's API
 * with the same rule; here it decides the menu entries and the page guard.
 * `result_btts`: «Risultato + Goal», the Result & Both Teams To Score market
 * compared inside one bookmaker.
 */
export const TOOL_RESULT_BTTS = 'result_btts'
export type ToolKey = typeof TOOL_RESULT_BTTS

/** An admin can use every tool; a user only the ones switched on for them from the backoffice. */
export function canUseTool(
  user: Pick<AuthUser, 'role' | 'tools'> | null | undefined,
  tool: ToolKey,
): boolean {
  if (!user) return false
  if (user.role === 'ADMIN_ROLE') return true
  return Array.isArray(user.tools) && user.tools.includes(tool)
}

/**
 * Whether the user has the role a page or a card asks for; nothing asked,
 * everyone passes. The admin-only offline calculator (§14.220) is gated here.
 */
export function hasRole(
  user: Pick<AuthUser, 'role'> | null | undefined,
  role: UserRole | undefined,
): boolean {
  if (!role) return true
  return user?.role === role
}
