import { describe, expect, it } from 'vitest'

import { bookmakerLogoSrc } from '@/lib/bookmakers'
import {
  ALL_BOOKS,
  OFFERS_COPY,
  OFFER_TYPES,
  SAMPLE_OFFERS,
  activeCount,
  bookOptions,
  emptyTitle,
  formatOfferDate,
  offerBadge,
  offerHref,
  offerSections,
  type Offer,
} from '@/lib/offers-content'

const offer = (over: Partial<Offer>): Offer => ({
  id: 'x',
  type: 'benvenuto',
  group: 'Singola',
  bookSlug: 'snai',
  bookName: 'Snai',
  title: 'Titolo',
  profit: 10,
  difficulty: 'Facile',
  ...over,
})

describe('catalogo', () => {
  it('ha id unici e un logo per ogni sito', () => {
    const ids = SAMPLE_OFFERS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const o of SAMPLE_OFFERS) expect(bookmakerLogoSrc(o.bookSlug), o.id).not.toBeNull()
  })

  it('conta le attive per tipo come il design (12, 8, 3)', () => {
    expect(OFFER_TYPES.map((t) => activeCount(SAMPLE_OFFERS, t.value))).toEqual([12, 8, 3])
  })

  it('non usa mai la parola «bookmaker» nei testi', () => {
    const texts = [
      ...Object.values(OFFERS_COPY),
      ...OFFER_TYPES.flatMap((t) => [t.label, t.description]),
    ]
    for (const text of texts) expect(text.toLowerCase()).not.toContain('bookmaker')
  })
})

describe('offerSections', () => {
  it('ordina i gruppi del benvenuto e mette le scadute in fondo', () => {
    const sections = offerSections(SAMPLE_OFFERS, 'benvenuto', ALL_BOOKS)
    expect(sections.map((s) => s.title)).toEqual([
      'Singola',
      'Multipla',
      'Rollover',
      'Rimborso',
      'Casinò',
      'Scadute',
    ])
    expect(sections[1].countLabel).toBe('6 offerte')
    expect(sections[2].countLabel).toBe('1 offerta')
    expect(sections.at(-1)).toMatchObject({
      expired: true,
      countLabel: '2 offerte · le guide restano leggibili',
    })
    const shown = sections.flatMap((s) => s.offers).length
    expect(shown).toBe(SAMPLE_OFFERS.filter((o) => o.type === 'benvenuto').length)
  })

  it('raccoglie le esclusive in una sezione sola con la nota', () => {
    const sections = offerSections(SAMPLE_OFFERS, 'esclusive', ALL_BOOKS)
    expect(sections.map((s) => s.title)).toEqual(['Segnalate dagli utenti', 'Scadute'])
    expect(sections[0].countLabel).toMatch(/^3 offerte · offerte personali/)
  })

  it('filtra per sito', () => {
    const sections = offerSections(SAMPLE_OFFERS, 'ricorrenti', 'Bet365')
    expect(sections.map((s) => [s.title, s.offers.map((o) => o.id)])).toEqual([
      ['Quando disponibili', ['bet365-maggiorate']],
      ['Scadute', ['bet365-venezia']],
    ])
  })

  it('non scarta un gruppo sconosciuto: va in coda prima delle scadute', () => {
    const sections = offerSections(
      [
        offer({ id: 'a', group: 'Nuovo' }),
        offer({ id: 'b' }),
        offer({ id: 'c', expiredOn: '2026-10-01' }),
      ],
      'benvenuto',
      ALL_BOOKS,
    )
    expect(sections.map((s) => s.title)).toEqual(['Singola', 'Nuovo', 'Scadute'])
  })

  it('senza offerte non crea sezioni', () => {
    expect(offerSections(SAMPLE_OFFERS, 'esclusive', 'Snai')).toEqual([])
  })
})

describe('bookOptions', () => {
  it('elenca i siti del tipo in ordine alfabetico dopo «Tutti i siti»', () => {
    expect(bookOptions(SAMPLE_OFFERS, 'esclusive').map((o) => o.label)).toEqual([
      'Tutti i siti',
      '888sport',
      'Betpassion',
      'LeoVegas',
      'Netbet',
    ])
  })
})

describe('offerBadge', () => {
  it('segue la precedenza del design', () => {
    expect(offerBadge(offer({ expiredOn: '2026-10-16', isNew: true }))).toEqual({
      tone: 'loss',
      label: 'Scaduta',
    })
    expect(offerBadge(offer({ expiresInDays: 2, isNew: true }))).toEqual({
      tone: 'warning',
      label: 'Scade tra 2 giorni',
    })
    expect(offerBadge(offer({ expiresInDays: 1 })).label).toBe('Scade tra 1 giorno')
    expect(offerBadge(offer({ isNew: true }))).toEqual({ tone: 'accent', label: 'Nuova' })
    expect(offerBadge(offer({}))).toEqual({ tone: 'brand', label: 'Attiva' })
  })
})

describe('testi', () => {
  it('formatta le date e lo stato vuoto', () => {
    expect(formatOfferDate('2026-10-16')).toBe('16 ottobre')
    expect(formatOfferDate('2026-09-30')).toBe('30 settembre')
    expect(emptyTitle('benvenuto', ALL_BOOKS)).toBe('Nessuna offerta di tipo benvenuto da mostrare')
    expect(emptyTitle('esclusive', 'Snai')).toBe('Nessuna offerta di tipo esclusive per Snai')
    expect(offerHref(offer({ id: 'snai-30' }))).toBe('/offerte/snai-30')
  })
})
