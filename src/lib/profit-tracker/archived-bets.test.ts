import { describe, expect, it } from 'vitest'

import {
  EMPTY_ARCHIVED_FILTERS,
  archivedCaption,
  archivedListParams,
  eventDateLabel,
} from './archived-bets'

describe('eventDateLabel', () => {
  it('scrive giorno, mese, anno a due cifre e ora locali', () => {
    expect(eventDateLabel('2026-10-27T23:00:00')).toBe('27/10/26 23:00')
    expect(eventDateLabel('2026-01-05T08:05:00')).toBe('05/01/26 08:05')
  })
  it('una data non valida diventa un trattino', () => {
    expect(eventDateLabel('')).toBe('—')
  })
})

describe('archivedCaption', () => {
  it('dice il giorno di archiviazione', () => {
    expect(archivedCaption('2026-10-28T09:10:00')).toBe('archiviata il 28/10')
  })
  it('resta vuota senza data', () => {
    expect(archivedCaption(null)).toBe('')
    expect(archivedCaption('x')).toBe('')
  })
})

describe('archivedListParams', () => {
  it('pagina da 1, ricerca senza spazi, filtri e ordinamento', () => {
    expect(
      archivedListParams(
        2,
        25,
        '  roma ',
        { ...EMPTY_ARCHIVED_FILTERS, esito: 'void', dal: '2026-10-01' },
        'profitto',
      ),
    ).toEqual({
      page: 3,
      limit: 25,
      q: 'roma',
      sport: '',
      accountId: '',
      modalitaSaldo: '',
      esito: 'void',
      tag: '',
      tipo: '',
      dal: '2026-10-01',
      al: '',
      sort: 'profitto',
    })
  })
})
