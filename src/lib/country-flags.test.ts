import { describe, expect, it } from 'vitest'
import { getCountryFlagUrl, resolveCompetitionFlag } from './country-flags'

describe('resolveCompetitionFlag', () => {
  it('uses the ISO code first, then the nation name', () => {
    expect(resolveCompetitionFlag('IT', 'Italy', 'Serie A')).toEqual({ url: 'https://flagcdn.com/it.svg', label: 'Italy' })
    expect(resolveCompetitionFlag(null, 'Spagna', 'La Liga')).toEqual({ url: 'https://flagcdn.com/es.svg', label: 'Spagna' })
    expect(getCountryFlagUrl('Europa')).toBe('https://flagcdn.com/eu.svg')
  })

  it('shows the European flag for UEFA competitions filed under «World»', () => {
    for (const name of [
      'UEFA Champions League',
      'UEFA Europa League',
      'UEFA Europa Conference League',
      'UEFA Nations League',
      'UEFA Super Cup',
      'UEFA Youth League',
      'Euro Championship',
      'Euro Championship - Qualification',
      'World Cup - Qualification Europe',
      'Europa League',
      'Conference League',
    ]) {
      expect(resolveCompetitionFlag(null, 'World', name), name).toEqual({ url: 'https://flagcdn.com/eu.svg', label: 'Europa' })
    }
  })

  it('leaves the other international competitions without a flag', () => {
    for (const name of [
      'CONMEBOL Libertadores',
      'AFC Champions League',
      'CAF Champions League',
      'CONCACAF Champions League',
      'Champions League',
      'World Cup',
      'World Cup - Qualification Asia',
      'Friendlies',
      'FIFA Club World Cup',
    ]) {
      expect(resolveCompetitionFlag(null, 'World', name), name).toBeNull()
    }
    expect(resolveCompetitionFlag(null, null, null)).toBeNull()
  })
})
