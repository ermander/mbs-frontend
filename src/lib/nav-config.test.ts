import { describe, expect, it } from 'vitest'
import { SECTIONS } from './tools'
import {
  NAV_ITEM_SECTIONS,
  OFFERS_NAV_ITEMS,
  RADAR_NAV_ITEMS,
  accountNavItem,
  authNavSections,
  isActiveHref,
  isNavItemActive,
  visibleNavSections,
} from './nav-config'

const outline = (user: Parameters<typeof visibleNavSections>[0]) =>
  visibleNavSections(user).map((s) => [s.label, s.items.map((i) => i.label)])

describe('visibleNavSections', () => {
  it('an admin sees every group, Risultato + Goal and Backoffice included', () => {
    const sections = outline({ role: 'ADMIN_ROLE', tools: [] })
    expect(sections.map(([label]) => label)).toEqual([
      'Sezioni',
      'Tracker',
      'Community',
      'Backoffice',
    ])
    // §14.367: la Dashboard delle scorciatoie è la prima voce, fuori dal menu Tracker.
    expect(sections[0][1]).toEqual([
      'Dashboard',
      'Guide',
      'Offerte',
      'Radar',
      'Risultato + Goal',
      'Calcolatori',
    ])
    expect(sections[1][1]).toHaveLength(6)
    expect(sections[1][1]).not.toContain('Dashboard')
    expect(sections[2][1]).toEqual(['Forum'])
    // 13 dal §14.262: «Offerte», l'editor delle guide.
    expect(sections[3][1]).toHaveLength(13)
    expect(sections[3][1]).toContain('Offerte')
  })
  it('a user with the tool sees Risultato + Goal but not Backoffice', () => {
    const sections = outline({ role: 'USER_ROLE', tools: ['result_btts'] })
    expect(sections.map(([label]) => label)).toEqual(['Sezioni', 'Tracker', 'Community'])
    expect(sections[0][1]).toContain('Risultato + Goal')
    // §14.347: «Rimborso 0-0» (§14.288) is out of the menu, even with the tool switch on.
    expect(sections[0][1]).not.toContain('Rimborso 0-0')
  })
  it('a plain user sees neither; so does a missing user', () => {
    for (const user of [{ role: 'USER_ROLE' as const, tools: [] }, null, undefined]) {
      const sections = outline(user)
      expect(sections.map(([label]) => label)).toEqual(['Sezioni', 'Tracker', 'Community'])
      expect(sections[0][1]).toEqual(['Dashboard', 'Guide', 'Offerte', 'Radar', 'Calcolatori'])
    }
  })
  // §14.366: ogni voce è una sezione che l'admin accende o spegne per utente.
  it('a user sees only the sections switched on for them', () => {
    const sections = outline({ role: 'USER_ROLE', sections: ['offers', 'calculators'] })
    // La Dashboard non è una sezione (§14.367): resta per tutti, come prima voce.
    expect(sections).toEqual([['Sezioni', ['Dashboard', 'Offerte', 'Calcolatori']]])
  })
  it('the Tracker group follows the tracker section, Forum the forum one', () => {
    const sections = outline({
      role: 'USER_ROLE',
      sections: ['oddsmatcher', 'result_btts', 'tracker', 'forum'],
    })
    expect(sections.map(([label]) => label)).toEqual(['Sezioni', 'Tracker', 'Community'])
    expect(sections[0][1]).toEqual(['Dashboard', 'Radar', 'Risultato + Goal'])
  })
  it('no section at all: only the Dashboard; an admin with no section stored still sees everything', () => {
    expect(outline({ role: 'USER_ROLE', sections: [] })).toEqual([['Sezioni', ['Dashboard']]])
    expect(outline({ role: 'ADMIN_ROLE', sections: [] }).map(([label]) => label)).toEqual([
      'Sezioni',
      'Tracker',
      'Community',
      'Backoffice',
    ])
  })
  it('every section but the Tracker group has its bar entry, and every mapped href is an entry', () => {
    const hrefs = authNavSections.flatMap((s) => s.items.map((i) => i.href))
    for (const href of Object.keys(NAV_ITEM_SECTIONS)) expect(hrefs).toContain(href)
    const mapped = [
      ...Object.values(NAV_ITEM_SECTIONS),
      ...authNavSections.flatMap((s) => (s.requiresSection ? [s.requiresSection] : [])),
    ]
    expect([...mapped].sort()).toEqual(SECTIONS.map((s) => s.key).sort())
  })
  it('does not mutate the config', () => {
    visibleNavSections({ role: 'USER_ROLE', tools: [] })
    expect(authNavSections[0].items).toHaveLength(6)
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
  it('the bar reads as the design, with the Dashboard first (§14.367) and Radar where the Oddsmatcher was (§14.390): Dashboard, Guide, Offerte, Radar, Calcolatori, Tracker, Forum', () => {
    // §14.275: i gruppi «links» sono voci dirette, i «menu» (Tracker, Backoffice) tendine.
    const bar = visibleNavSections({ role: 'USER_ROLE', tools: [] }).flatMap((s) =>
      s.display === 'links' ? s.items.map((i) => i.label) : [s.label],
    )
    expect(bar).toEqual([
      'Dashboard',
      'Guide',
      'Offerte',
      'Radar',
      'Calcolatori',
      'Tracker',
      'Forum',
    ])
  })
  it('only the Dashboard shrinks to its icon on narrow bars (§14.367), and it leads to /dashboard', () => {
    const items = authNavSections.flatMap((s) => s.items)
    expect(items.filter((i) => i.compact).map((i) => i.href)).toEqual(['/dashboard'])
  })
})

// §14.358 (ClickUp «Dividere sezioni offerte»): Offerte apre le tre pagine dei tipi.
describe('Offerte', () => {
  it('has the three offer pages under it, for every user', () => {
    for (const user of [{ role: 'USER_ROLE' as const, tools: [] }, null]) {
      const offers = visibleNavSections(user)[0].items.find((i) => i.label === 'Offerte')
      expect(offers?.href).toBe('/offerte')
      expect(offers?.children?.map((c) => [c.label, c.href])).toEqual([
        ['Benvenuto', '/offerte/benvenuto'],
        ['Ricorrenti', '/offerte/ricorrenti'],
        ['Esclusive', '/offerte/esclusive'],
      ])
    }
    expect(OFFERS_NAV_ITEMS.every((i) => i.icon)).toBe(true)
  })
  it('the section stays active on the type pages and on an offer, each page only on itself', () => {
    for (const path of ['/offerte/benvenuto', '/offerte/esclusive', '/offerte/snai-30']) {
      expect(isActiveHref(path, '/offerte')).toBe(true)
    }
    expect(OFFERS_NAV_ITEMS.filter((i) => isActiveHref('/offerte/ricorrenti', i.href))).toEqual([
      OFFERS_NAV_ITEMS[1],
    ])
    expect(OFFERS_NAV_ITEMS.some((i) => isActiveHref('/offerte/snai-30', i.href))).toBe(false)
  })
})

// §14.390 (ClickUp «Best Odds»): Radar apre l'Oddsmatcher e Best Odds.
describe('Radar', () => {
  const radar = () => visibleNavSections({ role: 'USER_ROLE', tools: [] })[0].items[3]
  it('holds the Oddsmatcher and Best Odds, in this order, where the Oddsmatcher was', () => {
    expect(radar().label).toBe('Radar')
    expect(radar().children?.map((c) => [c.label, c.href])).toEqual([
      ['Oddsmatcher', '/odds-scanner'],
      ['Best Odds', '/best-odds'],
    ])
    expect(RADAR_NAV_ITEMS.every((i) => i.icon)).toBe(true)
    // No other entry of the bar is called Oddsmatcher any more.
    const labels = authNavSections.flatMap((s) => s.items.map((i) => i.label))
    expect(labels).not.toContain('Oddsmatcher')
    expect(labels).not.toContain('Best Odds')
  })
  it('follows the oddsmatcher section: off, the whole menu goes', () => {
    expect(NAV_ITEM_SECTIONS[radar().href]).toBe('oddsmatcher')
    const without = visibleNavSections({ role: 'USER_ROLE', sections: ['offers', 'result_btts'] })
    expect(without[0].items.map((i) => i.label)).toEqual([
      'Dashboard',
      'Offerte',
      'Risultato + Goal',
    ])
  })
  it('is active on both of its pages, each page only on itself', () => {
    expect(isNavItemActive('/odds-scanner', radar())).toBe(true)
    expect(isNavItemActive('/best-odds', radar())).toBe(true)
    expect(isNavItemActive('/risultato-goal', radar())).toBe(false)
    expect(isNavItemActive(null, radar())).toBe(false)
    expect(RADAR_NAV_ITEMS.filter((i) => isActiveHref('/best-odds', i.href))).toEqual([
      RADAR_NAV_ITEMS[1],
    ])
  })
  it('an entry without pages under it is active as before', () => {
    expect(isNavItemActive('/guide/primi-passi', { href: '/guide' })).toBe(true)
    expect(
      isNavItemActive('/offerte/snai-30', { href: '/offerte', children: OFFERS_NAV_ITEMS }),
    ).toBe(true)
    expect(isNavItemActive('/forum', { href: '/guide' })).toBe(false)
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
