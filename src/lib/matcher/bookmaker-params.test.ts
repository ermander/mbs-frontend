import { describe, expect, it } from 'vitest'
import { bookmakersParam, coverBookmakersParam } from './bookmaker-params'

const BOOKS = ['sisal', 'bwin', 'betsson']
const EXCHANGES = ['betfair']

describe('coverBookmakersParam', () => {
  it('is absent when neither cover books nor exchanges are selected', () => {
    expect(coverBookmakersParam([], [], BOOKS, EXCHANGES)).toBeUndefined()
  })
  it('cover books selected: those books plus every exchange', () => {
    expect(coverBookmakersParam(['bwin'], [], BOOKS, EXCHANGES)).toBe('betfair,bwin')
  })
  it('exchanges selected: every book plus those exchanges', () => {
    expect(coverBookmakersParam([], ['betfair'], BOOKS, ['betfair', 'smarkets'])).toBe(
      'betfair,betsson,bwin,sisal',
    )
  })
  it('both selected: sorted union without duplicates', () => {
    expect(coverBookmakersParam(['sisal', 'bwin', 'sisal'], ['betfair'], BOOKS, EXCHANGES)).toBe(
      'betfair,bwin,sisal',
    )
  })
})

describe('bookmakersParam', () => {
  it('is absent with no selection and sorted otherwise', () => {
    expect(bookmakersParam([])).toBeUndefined()
    expect(bookmakersParam(['sisal', 'bwin', 'sisal'])).toBe('bwin,sisal')
  })
})
