import { describe, expect, it } from 'vitest'
import {
  CALCULATOR_TOOLS,
  CALCULATORS_WITHOUT_SAVE,
  calculatorGroups,
  isCalculatorSlug,
  openCalculator,
} from './catalog'

const outline = (role: Parameters<typeof calculatorGroups>[0]) =>
  calculatorGroups(role).map((g) => [g.name, g.tools.map((t) => t.name)])

describe('calculatorGroups', () => {
  it('an admin sees both groups in the design order, Risultato + Goal included', () => {
    expect(outline('ADMIN_ROLE')).toEqual([
      ['Sport', ['Punta-Banca', 'Punta-Punta', 'Tri-Punta', 'Multipla', 'Risultato + Goal']],
      ['Casinò', ['Baccarat', 'Roulette europea', 'Target fun bonus']],
    ])
  })

  it('a normal user and a missing user do not see the admin-only tool', () => {
    for (const role of ['USER_ROLE', undefined] as const) {
      expect(outline(role)[0][1]).toEqual(['Punta-Banca', 'Punta-Punta', 'Tri-Punta', 'Multipla'])
      expect(outline(role)[1][1]).toHaveLength(3)
    }
  })
})

describe('openCalculator', () => {
  it('opens a known slug, the old URLs included', () => {
    expect(openCalculator('punta-banca', 'USER_ROLE')?.name).toBe('Punta-Banca')
    expect(openCalculator('fun-bonus', 'USER_ROLE')?.name).toBe('Target fun bonus')
    expect(openCalculator('multipla', undefined)?.group).toBe('sport')
  })

  it('keeps the admin-only tool closed for the other roles', () => {
    expect(openCalculator('risultato-goal', 'ADMIN_ROLE')?.name).toBe('Risultato + Goal')
    expect(openCalculator('risultato-goal', 'USER_ROLE')).toBeNull()
    expect(openCalculator('risultato-goal', undefined)).toBeNull()
  })

  it('ignores an unknown or missing slug', () => {
    expect(openCalculator('multi-tool', 'ADMIN_ROLE')).toBeNull()
    expect(openCalculator(null, 'ADMIN_ROLE')).toBeNull()
  })
})

describe('catalog', () => {
  it('has unique slugs that isCalculatorSlug recognises', () => {
    const slugs = CALCULATOR_TOOLS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.every((s) => isCalculatorSlug(s))).toBe(true)
    expect(isCalculatorSlug('target-fun-bonus')).toBe(false)
  })

  it('gives the wide column only to the tools already redesigned', () => {
    expect(CALCULATOR_TOOLS.filter((t) => t.wide).map((t) => t.slug)).toEqual([
      'punta-banca',
      'punta-punta',
      'tri-punta',
    ])
  })

  it('leaves the save action out only where there is no bet to save', () => {
    expect([...CALCULATORS_WITHOUT_SAVE]).toEqual(['fun-bonus'])
  })
})
