import { describe, expect, it } from 'vitest'

import {
  cleanInput,
  computeExpiry,
  emptyGuide,
  emptyInput,
  expiryLabel,
  inputFromAdmin,
  moveItem,
  newBlock,
  offerFromCard,
  previewOffer,
  removeAt,
  replaceAt,
  romeToday,
  slugify,
  suggestedSlug,
  validateInput,
} from '@/lib/offer-editor'
import { guideFor } from '@/lib/offer-guides'
import { isExpired, offerBadge } from '@/lib/offers-content'
import type { OfferAdmin, OfferCardApi, OfferInput } from '@/types/offers'

const valid = (): OfferInput => ({
  ...emptyInput(),
  slug: 'snai-30',
  bookmakerSlug: 'snai',
  bookmakerName: 'Snai',
  title: 'Deposita 60 €, ricevi 30 € di bonus',
  guide: guideFor('snai-30')!.guide,
})

describe('slug', () => {
  it('toglie accenti e simboli e tiene lettere, numeri e trattini', () => {
    expect(slugify('Casinò: 100% fino a 50 €!')).toBe('casino-100-fino-a-50')
    expect(slugify('  --Più  spazi--  ')).toBe('piu-spazi')
    expect(suggestedSlug('snai', 'Deposita 60 €, ricevi 30 €')).toBe('snai-deposita-60-ricevi-30')
    expect(slugify('a'.repeat(79) + ' b')).toBe('a'.repeat(79))
  })
})

describe('liste', () => {
  it('sposta, toglie e sostituisce senza toccare l’originale', () => {
    const list = ['a', 'b', 'c']
    expect(moveItem(list, 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(list, 2, -1)).toEqual(['a', 'c', 'b'])
    expect(moveItem(list, 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(list, 2, 1)).toEqual(['a', 'b', 'c'])
    expect(removeAt(list, 1)).toEqual(['a', 'c'])
    expect(replaceAt(list, 1, 'x')).toEqual(['a', 'x', 'c'])
    expect(list).toEqual(['a', 'b', 'c'])
  })
})

describe('pulizia e controlli', () => {
  it('la guida Snai d’esempio passa i controlli', () => {
    expect(validateInput(cleanInput(valid()))).toEqual([])
  })

  it('una carta nuova vuota dice cosa manca', () => {
    const errors = validateInput(cleanInput(emptyInput()))
    expect(errors).toContain('Il titolo è obbligatorio.')
    expect(errors).toContain('Scegli il sito di scommesse.')
    expect(errors.some((e) => e.startsWith('Lo slug'))).toBe(true)
  })

  it('pulisce testi, voci vuote, gruppo e link vuoti', () => {
    const input = valid()
    input.groupLabel = '   '
    input.title = '  Titolo  '
    input.guide = {
      ...emptyGuide(),
      signup: { label: ' ', url: '' },
      steps: [{ title: ' Passo ', blocks: [{ type: 'checklist', items: [' uno ', '', '  '] }] }],
      terms: { rows: [], verifiedOn: '', url: '  ', linkLabel: '' },
    } as unknown as OfferInput['guide']
    const clean = cleanInput(input)
    expect(clean.groupLabel).toBeNull()
    expect(clean.title).toBe('Titolo')
    expect(clean.guide?.signup).toBeNull()
    expect(clean.guide?.steps[0]).toEqual({
      title: 'Passo',
      blocks: [{ type: 'checklist', items: ['uno'] }],
    })
    expect(clean.guide?.terms).toEqual({ rows: [], verifiedOn: null, url: null, linkLabel: '' })
  })

  it('rifiuta i link pericolosi o nel posto sbagliato', () => {
    const withButton = (kind: 'external' | 'link' | 'oddsmatcher', href: string) => {
      const input = valid()
      input.guide = {
        ...emptyGuide(),
        steps: [
          { title: 'P', blocks: [{ type: 'buttons', buttons: [{ kind, label: 'x', href }] }] },
        ],
      }
      return validateInput(cleanInput(input))
    }
    expect(withButton('external', 'javascript:alert(1)')).toHaveLength(1)
    expect(withButton('external', '/odds-scanner')).toHaveLength(1)
    expect(withButton('link', 'https://evil.example')).toHaveLength(1)
    expect(withButton('link', '//evil.example')).toHaveLength(1)
    expect(withButton('oddsmatcher', '/odds-scanner')).toEqual([])
    expect(withButton('external', 'https://www.snai.it/promo')).toEqual([])
  })

  it('immagini: https o percorso del sito', () => {
    const withImage = (src: string) => {
      const input = valid()
      input.guide = {
        ...emptyGuide(),
        steps: [{ title: 'P', blocks: [{ type: 'image', src, alt: '', caption: '' }] }],
      }
      return validateInput(cleanInput(input))
    }
    expect(withImage('/uploads/offers/a.png')).toEqual([])
    expect(withImage('https://cdn.example.com/a.png')).toEqual([])
    expect(withImage('data:image/png;base64,AA')).toHaveLength(1)
    expect(withImage('')).toHaveLength(1)
  })

  it('blocchi vuoti, passi senza titolo, domande e termini a metà', () => {
    const input = valid()
    input.guide = {
      ...emptyGuide(),
      steps: [
        { title: '', blocks: [newBlock('paragraph'), newBlock('checklist'), newBlock('callout')] },
      ],
      faq: [{ question: 'Q?', answer: '' }],
      terms: { rows: [{ label: '', value: 'v' }], verifiedOn: null, url: 'ftp://x', linkLabel: '' },
    }
    expect(validateInput(cleanInput(input))).toEqual([
      'Passo 1: manca il titolo.',
      'Passo 1, blocco 1 (Paragrafo): il testo è vuoto.',
      'Passo 1, blocco 2 (Checklist): serve almeno una voce.',
      'Passo 1, blocco 3 (Riquadro): il testo è vuoto.',
      'Domanda 1: servono domanda e risposta.',
      'Termine 1: servono voce e valore.',
      'Il link ai termini deve iniziare con https://.',
    ])
  })
})

describe('scadenza', () => {
  it('oggi a Roma, non in UTC', () => {
    expect(romeToday(new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-21')
    expect(romeToday(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
  })

  it('stesso calcolo del backend', () => {
    expect(computeExpiry('2026-10-20', null, '2026-10-18')).toEqual({ expired: false, daysLeft: 2 })
    expect(computeExpiry('2026-10-20', null, '2026-10-20')).toEqual({ expired: false, daysLeft: 0 })
    expect(computeExpiry('2026-10-20', null, '2026-10-21')).toEqual({
      expired: true,
      daysLeft: null,
    })
    expect(computeExpiry('2026-10-20', 'active', '2026-10-25')).toEqual({
      expired: false,
      daysLeft: null,
    })
    expect(computeExpiry('2026-12-31', 'expired', '2026-10-18')).toEqual({
      expired: true,
      daysLeft: null,
    })
    expect(computeExpiry(null, null, '2030-01-01')).toEqual({ expired: false, daysLeft: null })
    // Il passaggio all'ora solare non sposta il conto dei giorni.
    expect(computeExpiry('2026-10-26', null, '2026-10-24')).toEqual({ expired: false, daysLeft: 2 })
  })
})

describe('dalla carta dell’API alla pagina pubblica', () => {
  const card: OfferCardApi = {
    slug: 'snai-30',
    type: 'benvenuto',
    groupLabel: 'Singola',
    bookmakerSlug: 'snai',
    bookmakerName: 'Snai',
    title: 'T',
    profit: 25,
    difficulty: 'Facile',
    isNew: false,
    expiresOn: '2026-10-20',
    expired: false,
    daysLeft: 5,
    hasGuide: true,
    sortOrder: 0,
  }

  it('in scadenza solo negli ultimi tre giorni', () => {
    expect(offerBadge(offerFromCard(card)).label).toBe('Attiva')
    expect(offerBadge(offerFromCard({ ...card, daysLeft: 3 })).label).toBe('Scade tra 3 giorni')
    expect(offerBadge(offerFromCard({ ...card, daysLeft: 0 })).label).toBe('Scade tra 0 giorni')
  })

  it('scaduta con la data, o forzata senza data', () => {
    const expired = offerFromCard({ ...card, expired: true, daysLeft: null })
    expect(isExpired(expired) && expired.expiredOn === '2026-10-20').toBe(true)
    const forced = offerFromCard({ ...card, expiresOn: null, expired: true, daysLeft: null })
    expect(isExpired(forced) && forced.expiredOn === undefined).toBe(true)
    expect(offerBadge(forced).label).toBe('Scaduta')
  })

  it('l’anteprima mette un titolo e un sito di ripiego finché sono vuoti', () => {
    const preview = previewOffer(emptyInput(), '2026-10-20')
    expect(preview.title).toBe('Titolo dell’offerta')
    expect(preview.bookName).toBe('Sito di scommesse')
    expect(isExpired(previewOffer({ ...valid(), expiresOn: '2026-10-19' }, '2026-10-20'))).toBe(
      true,
    )
  })
})

describe('riga del backoffice', () => {
  it('torna al contenuto da modificare e ha lo stato in parole', () => {
    const admin = {
      ...valid(),
      id: 'x',
      visibility: 'published',
      publishedAt: null,
      createdAt: '',
      updatedAt: '',
      expired: false,
      daysLeft: 2,
      hasGuide: true,
    } as OfferAdmin
    expect(inputFromAdmin(admin)).toEqual(valid())
    expect(expiryLabel(admin)).toBe('Attiva, scade tra 2 gg')
    expect(expiryLabel({ ...admin, daysLeft: 0 })).toBe('Ultimo giorno')
    expect(
      expiryLabel({ ...admin, expired: true, daysLeft: null, expiryOverride: 'expired' }),
    ).toBe('Scaduta (forzata)')
    expect(expiryLabel({ ...admin, daysLeft: null, expiryOverride: 'active' })).toBe(
      'Attiva (forzata)',
    )
  })
})
