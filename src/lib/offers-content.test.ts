import { describe, expect, it } from 'vitest'

import { bookmakerLogoSrc } from '@/lib/bookmakers'
import {
  ALL_BOOKS,
  OFFERS_COPY,
  OFFER_TYPES,
  bookOptions,
  emptyTitle,
  formatOfferDate,
  isExpired,
  offerBadge,
  offerHref,
  offersListHref,
  pageSections,
  parseOfferBook,
  parseOffersPage,
  type Offer,
} from '@/lib/offers-content'
import { SAMPLE_OFFERS } from '@/lib/offers-sample'
import type { OfferSectionApi } from '@/types/offers'

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
    const active = (type: string) =>
      SAMPLE_OFFERS.filter((o) => o.type === type && !isExpired(o)).length
    expect(OFFER_TYPES.map((t) => active(t.value))).toEqual([12, 8, 3])
  })

  it('non usa mai la parola «bookmaker» nei testi', () => {
    const texts = [
      ...Object.values(OFFERS_COPY),
      ...OFFER_TYPES.flatMap((t) => [t.label, t.description]),
    ]
    for (const text of texts) expect(text.toLowerCase()).not.toContain('bookmaker')
  })
})

// §14.345: una pagina del backend, con le sezioni dell'elenco intero.
const section = (group: string | null, count: number, expired = false): OfferSectionApi => ({
  group,
  expired,
  count,
})

describe('pageSections', () => {
  it("divide le carte della pagina nelle sezioni del backend, col numero dell'intera sezione", () => {
    const sections = pageSections(
      [
        offer({ id: 'm1', group: 'Multipla' }),
        offer({ id: 'm2', group: 'Multipla' }),
        offer({ id: 'r1', group: 'Rimborso' }),
        offer({ id: 'e1', group: 'Singola', expiredOn: '2026-10-01' }),
        offer({ id: 'e2', group: 'Multipla', expired: true }),
      ],
      [
        section('Singola', 12),
        section('Multipla', 6),
        section('Rimborso', 1),
        section(null, 4, true),
      ],
    )
    // Singola sta tutta nelle pagine prima: niente sezione vuota.
    expect(sections.map((s) => [s.title, s.countLabel, s.offers.map((o) => o.id)])).toEqual([
      ['Multipla', '6 offerte', ['m1', 'm2']],
      ['Rimborso', '1 offerta', ['r1']],
      ['Scadute', '4 offerte · le guide restano leggibili', ['e1', 'e2']],
    ])
    expect(sections.at(-1)).toMatchObject({ key: 'scadute', expired: true })
  })

  it('raccoglie le esclusive (senza gruppo) in una sezione sola con la nota', () => {
    const sections = pageSections(
      [offer({ id: 'x1', type: 'esclusive', group: null })],
      [section(null, 3)],
    )
    expect(sections.map((s) => s.title)).toEqual(['Segnalate dagli utenti'])
    expect(sections[0].countLabel).toMatch(/^3 offerte · offerte personali/)
  })

  it('una scaduta non finisce nel suo gruppo e una attiva non finisce fra le scadute', () => {
    const sections = pageSections(
      [offer({ id: 'a' }), offer({ id: 'b', expiredOn: '2026-10-01' })],
      [section('Singola', 1), section(null, 1, true)],
    )
    expect(sections.map((s) => s.offers.map((o) => o.id))).toEqual([['a'], ['b']])
  })

  it('senza offerte non crea sezioni', () => {
    expect(pageSections([], [])).toEqual([])
  })
})

describe('bookOptions', () => {
  it('mette «Tutti i siti» prima dei siti del backend', () => {
    expect(bookOptions(['888sport', 'Betpassion']).map((o) => o.label)).toEqual([
      'Tutti i siti',
      '888sport',
      'Betpassion',
    ])
    expect(bookOptions([])[0]).toEqual({ value: ALL_BOOKS, label: 'Tutti i siti' })
  })

  it('tiene fra le voci il sito scelto anche se non ha più offerte', () => {
    expect(bookOptions(['Snai'], 'Admiral').map((o) => o.value)).toEqual([
      ALL_BOOKS,
      'Snai',
      'Admiral',
    ])
    expect(bookOptions(['Snai'], 'Snai')).toHaveLength(2)
  })
})

describe("indirizzo dell'elenco (§14.345)", () => {
  it('legge sito e pagina con dei valori di riserva', () => {
    expect(parseOfferBook('Snai')).toBe('Snai')
    expect(parseOfferBook([' Bet365 ', 'x'])).toBe('Bet365')
    expect(parseOfferBook('')).toBe(ALL_BOOKS)
    expect(parseOfferBook(undefined)).toBe(ALL_BOOKS)
    expect(parseOffersPage('3')).toBe(3)
    expect(parseOffersPage(['2', '5'])).toBe(2)
    for (const bad of [undefined, '', '0', '-1', '1.5', 'due', '9999999']) {
      expect(parseOffersPage(bad), String(bad)).toBe(1)
    }
  })

  it('scrive tipo, sito e pagina, lasciando fuori «Tutti i siti» e la pagina 1', () => {
    expect(offersListHref('benvenuto')).toBe('/offerte?tipo=benvenuto')
    expect(offersListHref('benvenuto', ALL_BOOKS, 1)).toBe('/offerte?tipo=benvenuto')
    expect(offersListHref('ricorrenti', ALL_BOOKS, 3)).toBe('/offerte?tipo=ricorrenti&pagina=3')
    expect(offersListHref('benvenuto', 'Snai', 2)).toBe(
      '/offerte?tipo=benvenuto&sito=Snai&pagina=2',
    )
    expect(offersListHref('benvenuto', 'Better Lottomatica')).toBe(
      '/offerte?tipo=benvenuto&sito=Better+Lottomatica',
    )
    const query = new URLSearchParams(offersListHref('esclusive', 'A&B', 4).split('?')[1])
    expect([query.get('tipo'), query.get('sito'), query.get('pagina')]).toEqual([
      'esclusive',
      'A&B',
      '4',
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
    expect(offerBadge(offer({ expiresInDays: 1 })).label).toBe('Scade domani')
    expect(offerBadge(offer({ expiresInDays: 0 })).label).toBe('Scade oggi')
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
