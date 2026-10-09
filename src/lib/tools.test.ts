import { describe, expect, it } from 'vitest'
import { canUseTool, hasRole } from './tools'

describe('canUseTool', () => {
  it('an admin can use every tool, whatever the array says', () => {
    expect(canUseTool({ role: 'ADMIN_ROLE', tools: [] }, 'result_btts')).toBe(true)
    expect(canUseTool({ role: 'ADMIN_ROLE' }, 'result_btts')).toBe(true)
  })
  it('a user only the tools switched on for them; none without a user or on an older backend', () => {
    expect(canUseTool({ role: 'USER_ROLE', tools: ['result_btts'] }, 'result_btts')).toBe(true)
    expect(canUseTool({ role: 'USER_ROLE', tools: [] }, 'result_btts')).toBe(false)
    expect(canUseTool({ role: 'USER_ROLE' }, 'result_btts')).toBe(false)
    expect(canUseTool(null, 'result_btts')).toBe(false)
    expect(canUseTool(undefined, 'result_btts')).toBe(false)
  })
})

describe('hasRole', () => {
  it('an admin-only card: the admin sees it, a user or a missing user does not', () => {
    expect(hasRole({ role: 'ADMIN_ROLE' }, 'ADMIN_ROLE')).toBe(true)
    expect(hasRole({ role: 'USER_ROLE' }, 'ADMIN_ROLE')).toBe(false)
    expect(hasRole(null, 'ADMIN_ROLE')).toBe(false)
    expect(hasRole(undefined, 'ADMIN_ROLE')).toBe(false)
  })
  it('a card for everyone: no role asked, anyone passes, the missing user too', () => {
    expect(hasRole({ role: 'USER_ROLE' }, undefined)).toBe(true)
    expect(hasRole(null, undefined)).toBe(true)
  })
})
