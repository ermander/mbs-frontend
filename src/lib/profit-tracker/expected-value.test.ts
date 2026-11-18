import { describe, expect, it } from 'vitest'

import { valoreAttesoGamba, valoreAttesoGiocata, vantaggioPercentuale } from './expected-value'
import type { ExpectedValueLeg } from './expected-value'

const punta = (o: Partial<ExpectedValueLeg>): ExpectedValueLeg => ({
  metodo: 'punta',
  stake: 100,
  quota: 2.1,
  quotaReale: 1.95,
  tipoBonus: 'none',
  ...o,
})

describe('valore atteso di una gamba (§14.337)', () => {
  it('punta reale: puntata × (quota / quota reale − 1)', () => {
    expect(valoreAttesoGamba(punta({}))).toBeCloseTo(100 * (2.1 / 1.95 - 1), 10)
    expect(valoreAttesoGamba(punta({}))).toBeCloseTo(7.69, 2)
  })
  it('quota giocata sotto la quota reale: valore atteso negativo', () => {
    expect(valoreAttesoGamba(punta({ quota: 1.8, quotaReale: 2 }))).toBeCloseTo(-10, 10)
  })
  it('quota giusta: zero', () => {
    expect(valoreAttesoGamba(punta({ quota: 2, quotaReale: 2 }))).toBeCloseTo(0, 10)
  })
  it('senza quota reale, con quote impossibili o importo negativo: null', () => {
    expect(valoreAttesoGamba(punta({ quotaReale: undefined }))).toBeNull()
    expect(valoreAttesoGamba(punta({ quotaReale: null }))).toBeNull()
    expect(valoreAttesoGamba(punta({ quotaReale: 1 }))).toBeNull()
    expect(valoreAttesoGamba(punta({ quota: 1 }))).toBeNull()
    expect(valoreAttesoGamba(punta({ stake: -5 }))).toBeNull()
  })
  it('bonus: come lo liquida il backend, vinto = reale × (q − 1) + bonus × q', () => {
    // 0 € reali + 50 € bonus a 3, quota reale 2,5: 0,4 × 150 = 60.
    const ev = valoreAttesoGamba(
      punta({ stake: 0, quota: 3, quotaReale: 2.5, tipoBonus: 'bonus', bonusValore: 50 }),
    )
    expect(ev).toBeCloseTo(60, 10)
  })
  it('freebet: vinto = (reale + freebet) × (q − 1), la freebet non torna', () => {
    // 0 € reali + 10 € freebet a 3, quota reale 3: 1/3 × 20.
    const ev = valoreAttesoGamba(
      punta({ stake: 0, quota: 3, quotaReale: 3, tipoBonus: 'freebet', bonusValore: 10 }),
    )
    expect(ev).toBeCloseTo(20 / 3, 10)
  })
  it('rimborso: non entra, come nel guadagno della gamba', () => {
    const base = valoreAttesoGamba(punta({}))
    expect(valoreAttesoGamba(punta({ tipoBonus: 'rimborso', bonusValore: 0 }))).toBeCloseTo(
      base ?? NaN,
      10,
    )
  })
  it('commissione sulla vincita della punta', () => {
    // 100 € a 2, quota reale 2, commissione 5 %: 0,5 × 95 − 0,5 × 100 = −2,5.
    expect(
      valoreAttesoGamba(punta({ quota: 2, quotaReale: 2, commissionePercentuale: 5 })),
    ).toBeCloseTo(-2.5, 10)
  })
  it('banca: vince se l esito non esce, perde la responsabilità se esce', () => {
    // Bancata 100 a 2, quota reale 2,2, commissione 0: (1 − 1/2,2) × 100 − 1/2,2 × 100.
    const ev = valoreAttesoGamba({
      metodo: 'banca',
      stake: 100,
      quota: 2,
      quotaReale: 2.2,
      tipoBonus: 'none',
      commissionePercentuale: 0,
    })
    expect(ev).toBeCloseTo((1 - 1 / 2.2) * 100 - (1 / 2.2) * 100, 10)
    expect(ev).toBeGreaterThan(0)
  })
})

describe('vantaggio sulla quota reale', () => {
  it('punta: quota / quota reale − 1, in percentuale', () => {
    expect(vantaggioPercentuale(2.1, 1.95)).toBeCloseTo(7.6923, 3)
    expect(vantaggioPercentuale(1.8, 2)).toBeCloseTo(-10, 10)
  })
  it('banca: il segno si gira', () => {
    expect(vantaggioPercentuale(2, 2.2, 'banca')).toBeCloseTo(10, 10)
  })
  it('senza quota reale: null', () => {
    expect(vantaggioPercentuale(2, undefined)).toBeNull()
    expect(vantaggioPercentuale(2, null)).toBeNull()
  })
})

describe('valore atteso della giocata', () => {
  it('somma le gambe con la quota reale, salta le annullate', () => {
    const legs = [
      { ...punta({}), statoEvento: 'in_corso' as const },
      { ...punta({ quota: 1.8, quotaReale: 2 }), statoEvento: 'bozza' as const },
      { ...punta({ quotaReale: undefined }), statoEvento: 'in_corso' as const },
      { ...punta({ quota: 5, quotaReale: 2 }), statoEvento: 'annullato' as const },
    ]
    expect(valoreAttesoGiocata(legs)).toBeCloseTo(100 * (2.1 / 1.95 - 1) - 10, 10)
  })
  it('nessuna gamba con la quota reale: null', () => {
    expect(
      valoreAttesoGiocata([{ ...punta({ quotaReale: undefined }), statoEvento: 'bozza' }]),
    ).toBe(null)
  })
})
