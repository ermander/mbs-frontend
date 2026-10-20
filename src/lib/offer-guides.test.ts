import { describe, expect, it } from 'vitest'

import {
  GUIDE_COPY,
  SAMPLE_GUIDES,
  formatLongDate,
  guideFor,
  guideMetaLine,
  richTextParts,
  stepsTitle,
} from '@/lib/offer-guides'
import { SAMPLE_OFFERS, offerById, offersListHref, parseOfferType } from '@/lib/offers-content'

describe('guide di esempio', () => {
  it('appartengono a offerte del catalogo', () => {
    for (const [id, guide] of Object.entries(SAMPLE_GUIDES)) {
      expect(guide.offerId).toBe(id)
      expect(offerById(SAMPLE_OFFERS, id), id).not.toBeNull()
    }
  })

  it('la guida Snai ha i cinque passi, le quattro domande e i sei termini del design', () => {
    const guide = guideFor('snai-30')!
    expect(guide.steps.map((s) => s.title)).toEqual([
      'Registrati su Snai',
      'Deposita 60 €',
      'Ricevi il bonus',
      'Sblocca il bonus con una puntata coperta',
      'Rendi prelevabile il deposito',
    ])
    expect(guide.faq).toHaveLength(4)
    expect(guide.terms).toHaveLength(6)
    expect(guideFor('betflag-10')).toBeNull()
  })

  it('non usa mai la parola «bookmaker»', () => {
    const texts = JSON.stringify([SAMPLE_GUIDES, GUIDE_COPY.termsTitle, GUIDE_COPY.termsNote])
    expect(texts.toLowerCase()).not.toContain('bookmaker')
  })

  it('porta i pulsanti interni a pagine che esistono', () => {
    const internal = Object.values(SAMPLE_GUIDES)
      .flatMap((g) => g.steps.flatMap((s) => s.actions ?? []))
      .filter((a) => a.kind !== 'external')
      .map((a) => a.href)
    expect(internal).toEqual(['/odds-scanner', '/calcolatori?expand=punta-banca'])
  })
})

describe('testi', () => {
  it('scrive il titolo dei passi in lettere', () => {
    expect(stepsTitle(5)).toBe('Come si fa, in cinque passi')
    expect(stepsTitle(1)).toBe('Come si fa, in un passo')
    expect(stepsTitle(12)).toBe('Come si fa, in 12 passi')
  })

  it('compone la riga sotto il titolo', () => {
    const snai = offerById(SAMPLE_OFFERS, 'snai-30')!
    expect(guideMetaLine(snai, '2026-10-18')).toBe(
      'Snai · Offerta di benvenuto · Aggiornata il 18 ottobre 2026',
    )
    const bwin = offerById(SAMPLE_OFFERS, 'bwin-multipla')!
    expect(guideMetaLine(bwin)).toBe('Bwin · Offerta ricorrente')
    expect(formatLongDate('2026-09-30')).toBe('30 settembre 2026')
  })

  it('separa il grassetto', () => {
    expect(richTextParts('in modalità **Bonus** e poi')).toEqual([
      { text: 'in modalità ', strong: false },
      { text: 'Bonus', strong: true },
      { text: ' e poi', strong: false },
    ])
    expect(richTextParts('niente')).toEqual([{ text: 'niente', strong: false }])
  })
})

describe('link fra elenco e dettaglio', () => {
  it('legge ?tipo= e torna al benvenuto se è sconosciuto', () => {
    expect(parseOfferType('ricorrenti')).toBe('ricorrenti')
    expect(parseOfferType(['esclusive', 'x'])).toBe('esclusive')
    expect(parseOfferType('altro')).toBe('benvenuto')
    expect(parseOfferType(undefined)).toBe('benvenuto')
    expect(offersListHref('esclusive')).toBe('/offerte?tipo=esclusive')
    expect(offerById(SAMPLE_OFFERS, 'non-esiste')).toBeNull()
  })
})
