import { describe, expect, it } from 'vitest'
import { boostNote, boostPercent, boostedOdds } from './boost'

describe('boostPercent', () => {
  it('reads the percentage only with the switch on', () => {
    expect(boostPercent({ on: true, percent: '10' })).toBe(10)
    expect(boostPercent({ on: true, percent: '12,5' })).toBe(12.5)
    expect(boostPercent({ on: false, percent: '10' })).toBe(0)
  })

  it('treats an empty, invalid or negative field as no boost', () => {
    expect(boostPercent({ on: true, percent: '' })).toBe(0)
    expect(boostPercent({ on: true, percent: 'abc' })).toBe(0)
    expect(boostPercent({ on: true, percent: '-5' })).toBe(0)
  })
})

describe('boostedOdds', () => {
  it('boosts the net win, not the whole price', () => {
    // 2,05 con +10 %: 1 + 1,05 × 1,10 = 2,155.
    expect(boostedOdds(2.05, 10)).toBeCloseTo(2.155, 9)
    expect(boostedOdds(3, 50)).toBeCloseTo(4, 9)
  })

  it('rounds to three decimals, as the tracker stores the price', () => {
    // 2,05 con +12,5 %: 2,18125 → 2,181.
    expect(boostedOdds(2.05, 12.5)).toBe(2.181)
  })

  it('leaves the price alone without a boost or without a valid price', () => {
    expect(boostedOdds(2.05, 0)).toBe(2.05)
    expect(boostedOdds(null, 10)).toBeNull()
    expect(boostedOdds(1, 10)).toBe(1)
  })
})

describe('boostNote', () => {
  it('lists the boosted legs with the price typed and the price played', () => {
    expect(
      boostNote([
        { label: 'Punta', odds: 2.05, percent: 10 },
        { label: 'Banca', odds: 2.02, percent: 0 },
      ]),
    ).toBe('Quota maggiorata: Punta 2,05 +10 % → 2,155')
    expect(
      boostNote([
        { label: 'Punta 1', odds: 2.3, percent: 25 },
        { label: 'Punta 2', odds: 2.5, percent: 12.5 },
      ]),
    ).toBe('Quota maggiorata: Punta 1 2,30 +25 % → 2,625 · Punta 2 2,50 +12,5 % → 2,688')
  })

  it('is undefined when no leg is boosted', () => {
    expect(boostNote([{ label: 'Punta', odds: 2.05, percent: 0 }])).toBeUndefined()
    expect(boostNote([{ label: 'Punta', odds: null, percent: 10 }])).toBeUndefined()
  })
})
