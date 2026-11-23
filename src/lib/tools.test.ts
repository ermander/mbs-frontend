import { describe, expect, it } from 'vitest'
import { SECTIONS, SECTION_HOME, canUseSection, canUseTool, hasRole } from './tools'

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

// §14.366: ogni sezione del sito si accende o si spegne per utente.
describe('canUseSection', () => {
  it('a user with `sections` opens exactly those', () => {
    const user = { role: 'USER_ROLE' as const, sections: ['offers', 'tracker'] }
    expect(canUseSection(user, 'offers')).toBe(true)
    expect(canUseSection(user, 'tracker')).toBe(true)
    expect(canUseSection(user, 'oddsmatcher')).toBe(false)
    expect(canUseSection(user, 'result_btts')).toBe(false)
  })
  it('an admin opens every section, whatever is stored', () => {
    for (const { key } of SECTIONS) {
      expect(canUseSection({ role: 'ADMIN_ROLE', sections: [] }, key)).toBe(true)
    }
  })
  it('a backend before §14.366 (no `sections`): everything open but Risultato + Goal, which follows `tools`', () => {
    for (const { key } of SECTIONS) {
      expect(canUseSection({ role: 'USER_ROLE', tools: [] }, key)).toBe(key !== 'result_btts')
    }
    expect(canUseSection({ role: 'USER_ROLE', tools: ['result_btts'] }, 'result_btts')).toBe(true)
  })
  it('nothing without a user', () => {
    expect(canUseSection(null, 'offers')).toBe(false)
  })
  it('every section has a home page and a label, in the order of the top bar', () => {
    expect(SECTIONS.map((s) => s.label)).toEqual([
      'Offerte',
      // §14.391: la sezione dell'Oddsmatcher è la tendina «Radar», con Best Odds.
      'Radar',
      'Risultato + Goal',
      'Calcolatori',
      'Tracker',
      'Guide',
      'Forum',
    ])
    for (const { key } of SECTIONS) expect(SECTION_HOME[key]).toMatch(/^\/[a-z-]+/)
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
