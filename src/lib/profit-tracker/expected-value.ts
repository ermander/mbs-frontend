import type { BetLeg } from '@/types/profit-tracker'

/**
 * Valore atteso di una gamba dalla quota reale (fair) (§14.337).
 *
 * La probabilità vera dell'esito è 1 / quota reale. Il valore atteso pesa con quella
 * probabilità i due esiti come li liquida il backend (`calcolaMovimentoPerStato`):
 * - punta vinta: puntata reale × (q − 1), più bonus × q o freebet × (q − 1), al netto della
 *   commissione; punta persa: − puntata reale;
 * - banca vinta (l'esito non esce): bancata × (1 − commissione); banca persa: − bancata × (q − 1).
 * Il rimborso non entra, come non entra nel guadagno della gamba. Con una puntata reale senza
 * bonus e senza commissione si riduce alla formula di sempre: puntata × (q / quota reale − 1).
 */

export type ExpectedValueLeg = Pick<
  BetLeg,
  'metodo' | 'stake' | 'quota' | 'tipoBonus' | 'bonusValore' | 'commissionePercentuale'
> & { quotaReale?: number | null }

const validOdds = (q: number | null | undefined): q is number =>
  q != null && Number.isFinite(q) && q > 1

export function valoreAttesoGamba(leg: ExpectedValueLeg): number | null {
  const { quota, quotaReale, stake } = leg
  if (!validOdds(quota) || !validOdds(quotaReale) || !Number.isFinite(stake) || stake < 0) {
    return null
  }
  const p = 1 / quotaReale
  const netto = 1 - (leg.commissionePercentuale ?? 0) / 100
  if (leg.metodo === 'banca') {
    return (1 - p) * stake * netto - p * stake * (quota - 1)
  }
  const extra = leg.bonusValore ?? 0
  let vincita = stake * (quota - 1)
  if (leg.tipoBonus === 'bonus') vincita += extra * quota
  else if (leg.tipoBonus === 'freebet') vincita += extra * (quota - 1)
  return p * vincita * netto - (1 - p) * stake
}

/**
 * Il vantaggio della quota giocata sulla quota reale: +5 % vuol dire che la quota paga il 5 %
 * più del giusto. Sulla banca il segno si gira: bancare sotto la quota reale è valore.
 */
export function vantaggioPercentuale(
  quota: number,
  quotaReale: number | null | undefined,
  metodo: BetLeg['metodo'] = 'punta',
): number | null {
  if (!validOdds(quota) || !validOdds(quotaReale)) return null
  const v = metodo === 'banca' ? quotaReale / quota - 1 : quota / quotaReale - 1
  return v * 100
}

/**
 * La somma dei valori attesi delle gambe con la quota reale, senza le annullate (la puntata
 * torna indietro). Null se nessuna gamba ha la quota reale.
 */
export function valoreAttesoGiocata(legs: (ExpectedValueLeg & Pick<BetLeg, 'statoEvento'>)[]) {
  let totale: number | null = null
  for (const l of legs) {
    if (l.statoEvento === 'annullato') continue
    const ev = valoreAttesoGamba(l)
    if (ev != null) totale = (totale ?? 0) + ev
  }
  return totale
}
