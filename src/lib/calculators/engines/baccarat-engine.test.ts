import { describe, expect, it } from 'vitest'
import {
  BACCARAT_BANCO_ODDS,
  BACCARAT_PLAYER_ODDS,
  computeBaccarat,
  type BaccaratInput,
} from './baccarat-engine'

function input(overrides: Partial<BaccaratInput> = {}): BaccaratInput {
  return { puntata: 100, bonus: 0, rimborso: 0, ...overrides }
}

describe('computeBaccarat — Player on one account, Banco on the other', () => {
  it('prices are fixed: Player 2.00, Banco 1.95 (1:1 less 5%)', () => {
    expect(BACCARAT_PLAYER_ODDS).toBe(2)
    expect(BACCARAT_BANCO_ODDS).toBeCloseTo(1.95, 12)
  })

  it('100 real: Banco 102.56, both outcomes lose about 2.57 (the 5% commission on Banco)', () => {
    const r = computeBaccarat(input())
    expect(r.puntataEffettiva).toBe(100)
    expect(r.isRimborso).toBe(false)
    expect(r.stakeBanco).toBeCloseTo(102.5641, 4)
    expect(r.stakeBancoRounded).toBe(102.56)
    expect(r.returnPlayer).toBe(200)
    expect(r.returnBanco).toBeCloseTo(199.992, 9)
    expect(r.profitIfPlayer).toBeCloseTo(-2.56, 9)
    expect(r.profitIfBanco).toBeCloseTo(-2.568, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(-2.568, 9)
    expect(r.rating).toBeCloseTo(97.4359, 4)
    expect(r.crPercent).toBeNull()
    expect(r.showSummary).toBe(true)
  })

  it('100 real + 100 bonus: Banco 205.13, the bonus converts at 94.87 either way', () => {
    const r = computeBaccarat(input({ bonus: 100 }))
    expect(r.puntataEffettiva).toBe(200)
    expect(r.stakeBancoRounded).toBe(205.13)
    expect(r.profitIfPlayer).toBeCloseTo(94.87, 9)
    expect(r.profitIfBanco).toBeCloseTo(94.8735, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(94.87, 2)
  })

  it('bonus only (no real stake): the conversion is 97.44% of the bonus, the rating', () => {
    const r = computeBaccarat(input({ puntata: null, bonus: 100 }))
    expect(r.puntataEffettiva).toBe(100)
    expect(r.stakeBancoRounded).toBe(102.56)
    expect(r.profitIfPlayer).toBeCloseTo(97.44, 9)
    expect(r.profitIfBanco).toBeCloseTo(97.432, 9)
    expect(r.showSummary).toBe(true)
  })

  it('rimborso: Banco sized on the refunded stake, both outcomes pay the same, CR% shown', () => {
    const r = computeBaccarat(input({ rimborso: 100 }))
    expect(r.isRimborso).toBe(true)
    expect(r.stakeBanco).toBeCloseTo(51.2821, 4)
    expect(r.stakeBancoRounded).toBe(51.28)
    expect(r.profitIfPlayer).toBeCloseTo(48.72, 9)
    expect(r.profitIfBanco).toBeCloseTo(48.716, 9)
    expect(r.guadagnoMinimo).toBeCloseTo(48.716, 9)
    expect(r.crPercent).toBeCloseTo(48.716, 9)
  })

  it('a refund at least as large as the Player return leaves nothing to cover', () => {
    const r = computeBaccarat(input({ rimborso: 200 }))
    expect(r.stakeBanco).toBeNull()
    expect(r.stakeBancoRounded).toBeNull()
    expect(r.guadagnoMinimo).toBeNull()
    expect(r.showSummary).toBe(false)
  })

  it('empty or negative amounts give no summary', () => {
    expect(computeBaccarat(input({ puntata: null })).showSummary).toBe(false)
    expect(computeBaccarat(input({ puntata: 0 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ puntata: -5, bonus: 10 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ bonus: -1 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ rimborso: -1 })).showSummary).toBe(false)
    expect(computeBaccarat(input({ puntata: null })).stakeBanco).toBeNull()
  })
})
