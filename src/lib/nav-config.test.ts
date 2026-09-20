import { describe, expect, it } from 'vitest'
import { accountNavItem, authNavSections, isActiveHref, visibleNavSections } from './nav-config'

const outline = (user: Parameters<typeof visibleNavSections>[0]) =>
  visibleNavSections(user).map((s) => [s.label, s.items.map((i) => i.label)])

describe('visibleNavSections', () => {
  it('an admin sees every group, Risultato + Goal and Backoffice included', () => {
    const sections = outline({ role: 'ADMIN_ROLE', tools: [] })
    expect(sections.map(([label]) => label)).toEqual([
      'Strumenti',
      'Profit Tracker',
      'Altro',
      'Backoffice',
    ])
    expect(sections[0][1]).toEqual(['Odds Scanner', 'Risultato + Goal', 'Calcolatori'])
    expect(sections[3][1]).toHaveLength(13)
  })
  it('a user with the tool sees Risultato + Goal but not Backoffice', () => {
    const sections = outline({ role: 'USER_ROLE', tools: ['result_btts'] })
    expect(sections.map(([label]) => label)).toEqual(['Strumenti', 'Profit Tracker', 'Altro'])
    expect(sections[0][1]).toEqual(['Odds Scanner', 'Risultato + Goal', 'Calcolatori'])
  })
  it('a plain user sees neither; so does a missing user', () => {
    for (const user of [{ role: 'USER_ROLE' as const, tools: [] }, null, undefined]) {
      const sections = outline(user)
      expect(sections.map(([label]) => label)).toEqual(['Strumenti', 'Profit Tracker', 'Altro'])
      expect(sections[0][1]).toEqual(['Odds Scanner', 'Calcolatori'])
    }
  })
  it('does not mutate the config', () => {
    visibleNavSections({ role: 'USER_ROLE', tools: [] })
    expect(authNavSections[0].items).toHaveLength(3)
  })
})

describe('authNavSections', () => {
  it('every href is absolute and unique, the profile page included', () => {
    const hrefs = [
      ...authNavSections.flatMap((s) => s.items.map((i) => i.href)),
      accountNavItem.href,
    ]
    expect(hrefs.every((h) => h.startsWith('/'))).toBe(true)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
  it('the Strumenti group is the only one shown as direct links', () => {
    expect(authNavSections.filter((s) => s.display === 'links').map((s) => s.label)).toEqual([
      'Strumenti',
    ])
  })
})

describe('isActiveHref', () => {
  it('matches the page and its sub-pages, not a sibling with the same prefix', () => {
    expect(isActiveHref('/calcolatori', '/calcolatori')).toBe(true)
    expect(isActiveHref('/calcolatori/punta-banca', '/calcolatori')).toBe(true)
    expect(isActiveHref('/calcolatori-x', '/calcolatori')).toBe(false)
    expect(isActiveHref('/profit-tracker/dashboard', '/backoffice/dashboard')).toBe(false)
  })
  it('the root only on itself; nothing without a pathname', () => {
    expect(isActiveHref('/', '/')).toBe(true)
    expect(isActiveHref('/guide', '/')).toBe(false)
    expect(isActiveHref(null, '/guide')).toBe(false)
    expect(isActiveHref(undefined, '/guide')).toBe(false)
  })
})
