import { describe, expect, it } from 'vitest'
import {
  ageLabel,
  ageSeconds,
  ageTone,
  isLayLeg,
  marketLabel,
  matchTypeLabel,
  matcherRowKey,
  outcomeName,
} from './format'

describe('marketLabel', () => {
  it('writes line, handicap, team and period the way §14.76 wants', () => {
    expect(marketLabel('over_under', 2.5, { periodScope: 'first_half' })).toBe('O/U 2.5 · 1° tempo')
    expect(marketLabel('handicap_european', null, { handicap: -1 })).toBe('Handicap EU -1')
    expect(marketLabel('handicap_asian', null, { handicap: 0.5 })).toBe('Handicap AS +0.5')
    expect(marketLabel('btts', null, { periodScope: 'full_time' })).toBe('GG/NG')
    expect(marketLabel('corners_1x2', null)).toBe('corners_1x2')
  })
})

describe('outcomes and match types', () => {
  it('strips the BACK/LAY prefix and recognises the lay leg', () => {
    expect(outcomeName({ outcomeLabel: 'LAY Over' })).toBe('Over')
    expect(outcomeName({ outcomeLabel: 'BACK 1' })).toBe('1')
    expect(outcomeName({ outcomeLabel: 'X' })).toBe('X')
    expect(isLayLeg({ outcomeLabel: 'LAY Over' })).toBe(true)
    expect(isLayLeg({ outcomeLabel: 'BACK Over' })).toBe(false)
  })

  it('labels the match types', () => {
    expect(matchTypeLabel('back_lay')).toBe('Punta/Banca')
    expect(matchTypeLabel('dutch_2way')).toBe('Dutch 2W')
    expect(matchTypeLabel('dutch_3way')).toBe('Dutch 3W')
  })
})

describe('ages', () => {
  it('formats seconds, minutes and hours', () => {
    expect(ageLabel(45)).toBe('45 s')
    expect(ageLabel(90)).toBe('1 min')
    expect(ageLabel(3600)).toBe('1 h')
    expect(ageLabel(3660)).toBe('1 h 1 min')
  })

  it('never goes negative', () => {
    const now = Date.parse('2026-09-13T12:00:00Z')
    expect(ageSeconds('2026-09-13T12:00:30Z', now)).toBe(0)
    expect(ageSeconds('2026-09-13T11:59:00Z', now)).toBe(60)
  })

  it('applies the 3 and 10 minute thresholds, scaled by the event tolerance', () => {
    expect(ageTone(100)).toBe('fresh')
    expect(ageTone(200)).toBe('aging')
    expect(ageTone(700)).toBe('old')
    expect(ageTone(1000, 7200)).toBe('fresh')
    expect(ageTone(2000, 7200)).toBe('aging')
    expect(ageTone(5000, 7200)).toBe('old')
    expect(ageTone(200, 900)).toBe('aging')
  })
})

describe('matcherRowKey', () => {
  const row = {
    eventId: 'ev',
    canonicalMarketId: 'mk',
    marketTypeKey: 'over_under',
    line: 2.5,
    matchType: 'dutch_2way' as const,
    legs: [
      { bookmakerSlug: 'sisal', outcomeKey: 'over' },
      { bookmakerSlug: 'bwin', outcomeKey: 'under' },
    ],
  }

  it('is stable and tells rows with the same legs in another order apart', () => {
    expect(matcherRowKey(row)).toBe(matcherRowKey({ ...row }))
    expect(matcherRowKey(row)).not.toBe(matcherRowKey({ ...row, legs: [row.legs[1], row.legs[0]] }))
    expect(matcherRowKey({ ...row, canonicalMarketId: null })).toContain('over_under:2.5')
  })
})
