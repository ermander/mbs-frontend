import { describe, expect, it } from 'vitest'
import {
  CALCULATOR_TOOLS,
  CALCULATORS_WITHOUT_SAVE,
  GUEST_CALCULATORS,
  calculatorAccess,
  calculatorGroups,
  isCalculatorSlug,
  openCalculator,
  type CalculatorViewer,
} from './catalog'

const ADMIN: CalculatorViewer = { role: 'ADMIN_ROLE', tools: [] }
const USER: CalculatorViewer = { role: 'USER_ROLE', tools: [] }
const ENABLED: CalculatorViewer = { role: 'USER_ROLE', tools: ['result_btts'] }
const OLD_BACKEND: CalculatorViewer = { role: 'USER_ROLE' }
const GUEST: CalculatorViewer = null

const outline = (viewer: CalculatorViewer) =>
  calculatorGroups(viewer).map((g) => [g.name, g.tools.map((t) => t.name)])

const access = (viewer: CalculatorViewer) =>
  Object.fromEntries(CALCULATOR_TOOLS.map((t) => [t.slug, calculatorAccess(t, viewer)]))

describe('calculatorGroups', () => {
  it('an admin and a user enabled from the backoffice see Risultato + Goal too', () => {
    for (const viewer of [ADMIN, ENABLED]) {
      expect(outline(viewer)).toEqual([
        [
          'Sport',
          [
            'Punta-Banca',
            'Punta-Punta',
            'Tri-Punta',
            'Multipla',
            'Condizionato',
            'Risultato + Goal',
          ],
        ],
        ['Casinò', ['Baccarat', 'Roulette europea', 'Target fun bonus']],
      ])
    }
  })

  it('a user without the tool, an older backend and a guest never see Risultato + Goal', () => {
    for (const viewer of [USER, OLD_BACKEND, GUEST, undefined]) {
      expect(outline(viewer)).toEqual([
        ['Sport', ['Punta-Banca', 'Punta-Punta', 'Tri-Punta', 'Multipla', 'Condizionato']],
        ['Casinò', ['Baccarat', 'Roulette europea', 'Target fun bonus']],
      ])
    }
  })
})

describe('calculatorAccess', () => {
  it('a guest uses the seven free calculators, the others ask to sign up, Risultato + Goal is hidden', () => {
    expect(access(GUEST)).toEqual({
      'punta-banca': 'open',
      'punta-punta': 'open',
      'tri-punta': 'open',
      multipla: 'open',
      condizionato: 'open',
      'risultato-goal': 'hidden',
      baccarat: 'open',
      roulette: 'open',
      'fun-bonus': 'members',
    })
  })

  it('the free list is exactly the one of the task', () => {
    expect([...GUEST_CALCULATORS].sort()).toEqual(
      [
        'baccarat',
        'condizionato',
        'multipla',
        'punta-banca',
        'punta-punta',
        'roulette',
        'tri-punta',
      ].sort(),
    )
  })

  it('a logged-in user uses every calculator they can see', () => {
    expect(Object.values(access(USER)).filter((a) => a === 'members')).toEqual([])
    expect(access(USER)['risultato-goal']).toBe('hidden')
    expect(access(ENABLED)['risultato-goal']).toBe('open')
    expect(access(ADMIN)['risultato-goal']).toBe('open')
  })
})

describe('openCalculator', () => {
  it('opens a known slug, the old URLs included', () => {
    expect(openCalculator('punta-banca', USER)?.name).toBe('Punta-Banca')
    expect(openCalculator('fun-bonus', USER)?.name).toBe('Target fun bonus')
    expect(openCalculator('multipla', GUEST)?.group).toBe('sport')
    expect(openCalculator('condizionato', GUEST)?.name).toBe('Condizionato')
  })

  it('a members-only calculator still opens for a guest (the panel shows the sign-up prompt)', () => {
    expect(openCalculator('fun-bonus', GUEST)?.name).toBe('Target fun bonus')
  })

  it('keeps Risultato + Goal closed for whoever does not have it enabled', () => {
    expect(openCalculator('risultato-goal', ADMIN)?.name).toBe('Risultato + Goal')
    expect(openCalculator('risultato-goal', ENABLED)?.name).toBe('Risultato + Goal')
    expect(openCalculator('risultato-goal', USER)).toBeNull()
    expect(openCalculator('risultato-goal', OLD_BACKEND)).toBeNull()
    expect(openCalculator('risultato-goal', GUEST)).toBeNull()
  })

  it('ignores an unknown or missing slug', () => {
    expect(openCalculator('multi-tool', ADMIN)).toBeNull()
    expect(openCalculator(null, ADMIN)).toBeNull()
  })
})

describe('catalog', () => {
  it('has unique slugs that isCalculatorSlug recognises', () => {
    const slugs = CALCULATOR_TOOLS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.every((s) => isCalculatorSlug(s))).toBe(true)
    expect(isCalculatorSlug('target-fun-bonus')).toBe(false)
  })

  it('leaves the save action out only where there is no bet to save', () => {
    expect([...CALCULATORS_WITHOUT_SAVE]).toEqual(['fun-bonus'])
  })
})
