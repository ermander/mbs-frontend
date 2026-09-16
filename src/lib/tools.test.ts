import { describe, expect, it } from 'vitest'
import { canUseTool } from './tools'

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
