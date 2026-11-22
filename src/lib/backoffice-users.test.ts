import { describe, expect, it } from 'vitest'
import { sectionsSummary } from './backoffice-users'

describe('sectionsSummary (§14.366)', () => {
  it('names what is missing when little is, what is there when little is', () => {
    const all = ['offers', 'oddsmatcher', 'result_btts', 'calculators', 'tracker', 'guide', 'forum']
    expect(sectionsSummary(all)).toBe('Tutte')
    expect(sectionsSummary(all.filter((s) => s !== 'result_btts'))).toBe(
      'Tutte tranne Risultato + Goal',
    )
    expect(sectionsSummary(['offers', 'oddsmatcher', 'calculators', 'tracker', 'guide'])).toBe(
      'Tutte tranne Risultato + Goal e Forum',
    )
    expect(sectionsSummary(['calculators', 'offers'])).toBe('Solo Offerte e Calcolatori')
    expect(sectionsSummary(['offers', 'tracker', 'forum', 'guide'])).toBe('4 su 7')
  })
  it('nothing, or an older backend without the field: «Nessuna»', () => {
    expect(sectionsSummary([])).toBe('Nessuna')
    expect(sectionsSummary(undefined)).toBe('Nessuna')
  })
  it('ignores keys it does not know', () => {
    expect(sectionsSummary(['boh', 'offers'])).toBe('Solo Offerte')
  })
})
