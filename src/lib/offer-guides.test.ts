import { describe, expect, it } from 'vitest'

import {
  GUIDE_COPY,
  formatLongDate,
  guideMetaLine,
  richTextParts,
  stepsTitle,
} from '@/lib/offer-guides'
import { offerById, offersListHref, parseOfferType } from '@/lib/offers-content'
import { SAMPLE_GUIDES, SAMPLE_OFFERS, guideFor } from '@/lib/offers-sample'

describe('guide di esempio', () => {
  it('appartengono a offerte del catalogo', () => {
    for (const id of Object.keys(SAMPLE_GUIDES)) {
      expect(offerById(SAMPLE_OFFERS, id), id).not.toBeNull()
    }
  })

  it('la guida Snai ha i cinque passi, le quattro domande e i sei termini del design', () => {
    const { guide, updatedOn } = guideFor('snai-30')!
    expect(updatedOn).toBe('2026-10-18')
    expect(guide.steps.map((s) => s.title)).toEqual([
      'Registrati su Snai',
      'Deposita 60 €',
      'Ricevi il bonus',
      'Sblocca il bonus con una puntata coperta',
      'Rendi prelevabile il deposito',
    ])
    expect(guide.faq).toHaveLength(4)
    expect(guide.terms.rows).toHaveLength(6)
    expect(guide.steps[3].blocks.map((b) => b.type)).toEqual(['paragraph', 'checklist', 'buttons'])
    expect(guideFor('betflag-10')).toBeNull()
  })

  it('non usa mai la parola «bookmaker»', () => {
    const texts = JSON.stringify([SAMPLE_GUIDES, GUIDE_COPY.termsTitle, GUIDE_COPY.termsNote])
    expect(texts.toLowerCase()).not.toContain('bookmaker')
  })

  it('porta i pulsanti interni a pagine che esistono', () => {
    const internal = Object.values(SAMPLE_GUIDES)
      .flatMap(({ guide }) => guide.steps.flatMap((s) => s.blocks))
      .flatMap((b) => (b.type === 'buttons' ? b.buttons : []))
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
