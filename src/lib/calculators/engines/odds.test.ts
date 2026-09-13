import { describe, expect, it } from 'vitest'
import { backLayRating, dutchRating, grossOdds, netOdds, parseNum, round2 } from './odds'

describe('net and gross prices', () => {
  it('nets the winnings by the commission and leaves a bookmaker price alone', () => {
    expect(netOdds(2, 4.5)).toBeCloseTo(1.955, 6)
    expect(netOdds(3.9, 4.5)).toBeCloseTo(3.7695, 6)
    expect(netOdds(2.5, 0)).toBe(2.5)
  })

  it('grossOdds inverts netOdds', () => {
    expect(grossOdds(netOdds(3.9, 4.5), 4.5)).toBeCloseTo(3.9, 9)
    expect(grossOdds(1.955, 4.5)).toBeCloseTo(2, 9)
    expect(grossOdds(2, 0)).toBe(2)
  })
})

describe('ratings as the store computes them', () => {
  it('dutch: 100 / Σ(1/q)', () => {
    expect(dutchRating([2, 2])).toBeCloseTo(100, 9)
    expect(dutchRating([1.3, 3.7695])).toBeCloseTo(96.66, 2)
    expect(dutchRating([2.1, 3.4, 3.6])).toBeCloseTo(95.41, 2)
    expect(dutchRating([2, 0])).toBeNull()
    expect(dutchRating([])).toBeNull()
  })

  it('back/lay: back·(1−c)/(lay−c)·100', () => {
    expect(backLayRating(1.3, 1.38, 4.5)).toBeCloseTo(93.0, 1)
    expect(backLayRating(2, 2, 0)).toBeCloseTo(100, 9)
    expect(backLayRating(2, 0.04, 4.5)).toBeNull()
    expect(backLayRating(0, 2, 4.5)).toBeNull()
  })
})

describe('numbers', () => {
  it('round2 rounds to the cent, parseNum accepts the decimal comma', () => {
    expect(round2(102.5641)).toBe(102.56)
    expect(round2(97.432)).toBe(97.43)
    expect(parseNum('1,5')).toBe(1.5)
    expect(parseNum(' 2.25 ')).toBe(2.25)
    expect(parseNum('')).toBeNull()
    expect(parseNum('abc')).toBeNull()
  })
})
