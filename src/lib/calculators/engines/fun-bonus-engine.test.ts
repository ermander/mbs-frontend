import { describe, expect, it } from 'vitest'
import { computeFunBonus, type FunBonusInput } from './fun-bonus-engine'

function input(overrides: Partial<FunBonusInput> = {}): FunBonusInput {
  return {
    bonus: 100,
    rollover: 35,
    contribuzionePercent: 100,
    rtpPercent: 95,
    giaGiocato: 0,
    bonusMassimo: null,
    ...overrides,
  }
}

describe('computeFunBonus', () => {
  it('100 € wag 35x, RTP 95%: 3500 € da giocare, 175 € di perdita, target 275 €', () => {
    const r = computeFunBonus(input())
    expect(r.rolloverEffettivo).toBe(35)
    expect(r.wagTotale).toBe(3500)
    expect(r.wagResiduo).toBe(3500)
    expect(r.perditaAttesa).toBeCloseTo(175, 6)
    expect(r.bonusConvertibile).toBe(100)
    expect(r.target).toBeCloseTo(275, 6)
  })

  it('contribuzione 50% raddoppia il rollover effettivo (35x → 70x)', () => {
    const r = computeFunBonus(input({ contribuzionePercent: 50 }))
    expect(r.rolloverEffettivo).toBe(70)
    expect(r.wagTotale).toBe(7000)
    expect(r.target).toBeCloseTo(100 + 7000 * 0.05, 6)
  })

  it('la somma già giocata riduce il residuo e la perdita attesa', () => {
    const r = computeFunBonus(input({ contribuzionePercent: 50, giaGiocato: 500 }))
    expect(r.wagResiduo).toBe(6500)
    expect(r.perditaAttesa).toBeCloseTo(325, 6)
    expect(r.target).toBeCloseTo(425, 6)
  })

  it('già giocato oltre il wag: residuo zero, target = bonus convertibile', () => {
    const r = computeFunBonus(input({ giaGiocato: 9999 }))
    expect(r.wagResiduo).toBe(0)
    expect(r.perditaAttesa).toBe(0)
    expect(r.target).toBe(100)
  })

  it('esempio del sito: 100 € x50, RTP 96%, massimo 100 € → 5000 € e target 300 €', () => {
    const r = computeFunBonus(input({ rollover: 50, rtpPercent: 96, bonusMassimo: 100 }))
    expect(r.wagTotale).toBe(5000)
    expect(r.target).toBeCloseTo(300, 6)
  })

  it('bonus massimo ottenibile diverso dal bonus erogato entra nel target, non nel wag', () => {
    const r = computeFunBonus(input({ bonusMassimo: 50 }))
    expect(r.wagTotale).toBe(3500)
    expect(r.bonusConvertibile).toBe(50)
    expect(r.target).toBeCloseTo(225, 6)
  })

  it('input incompleti o fuori scala: nessun risultato', () => {
    expect(computeFunBonus(input({ bonus: null })).target).toBeNull()
    expect(computeFunBonus(input({ rollover: 0 })).target).toBeNull()
    expect(computeFunBonus(input({ contribuzionePercent: 0 })).target).toBeNull()
    expect(computeFunBonus(input({ contribuzionePercent: 150 })).target).toBeNull()
    expect(computeFunBonus(input({ rtpPercent: 101 })).target).toBeNull()
    expect(computeFunBonus(input({ rtpPercent: null })).target).toBeNull()
  })
})
