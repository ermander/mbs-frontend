import { roundStake } from '@/lib/calculators/stake-step'

/**
 * Rimborso condizionato: il book rimborsa la qualificante (in bonus) solo se perde E si verifica
 * una condizione (supplementari, un rigore, un under…). La qualificante sta su un esito che
 * esclude la condizione, quindi gli scenari sono: vince la qualificante (condizione no), perde la
 * qualificante con la condizione, perde la qualificante senza la condizione.
 *
 * Due coperture indipendenti:
 *   - la qualificante si copre come in un punta-banca senza rimborso: ogni gamba deve restituire,
 *     quando decide, la vincita lorda della qualificante S·Q;
 *   - la condizione si copre «contro»: ogni gamba deve valere, fra «condizione no» e «condizione
 *     sì», esattamente il rimborso R, così il rimborso pareggia la copertura persa.
 *
 * Una gamba in Banca (exchange) ha puntata T / (quota − c), una in Punta (book) T / quota, con T il
 * bersaglio della sua sezione (S·Q o R) e c la commissione in frazione. Vale anche con due gambe:
 * in Banca sono le bancate dei due esiti che compongono l'evento (la qualificante su un esito
 * doppio, la condizione fatta di due risultati), in Punta le punte dei due esiti opposti.
 *
 * Le puntate si arrotondano a 0,05 € (§14.229) prima di responsabilità e profitti, come quelle che
 * l'utente piazza; il rimborso vale il suo importo pieno, come nel Punta-Banca con rimborso.
 */

export type CoverMode = 'banca' | 'punta'

export interface CoverLegInput {
  odds: number | null
  /** Commissione dell'exchange in percento (4.5 = 4,5 %); letta solo in Banca. */
  commissionPercent: number | null
}

export interface CoverSectionInput {
  mode: CoverMode
  /** Una o due gambe. */
  legs: CoverLegInput[]
}

export interface CondizionatoInput {
  /** Puntata della qualificante, €. */
  stake: number | null
  /** Quota della qualificante. */
  odds: number | null
  /** Rimborso promesso se la qualificante perde e la condizione si verifica, €. */
  refund: number | null
  qualifier: CoverSectionInput
  condition: CoverSectionInput
}

export interface CoverLegResult {
  mode: CoverMode
  odds: number
  /** Commissione in percento; 0 in Punta. */
  commissionPercent: number
  /** Puntata esatta (bancata o contropuntata). */
  stakeExact: number
  /** La stessa a multipli di 0,05 €: quella da piazzare. */
  stake: number
  /** Quanto si rischia: la responsabilità in Banca, la puntata in Punta. */
  liability: number
  /** Profitto della gamba quando vince (netto della commissione in Banca). */
  win: number
  /** Profitto della gamba quando perde (negativo). */
  lose: number
}

/** Chi decide la parte «qualificante» di uno scenario. */
export interface QualifierOutcome {
  wins: boolean
  /**
   * La gamba di copertura che decide: in Punta quella che vince quando la qualificante perde, in
   * Banca quella che perde quando la qualificante vince; null quando decidono tutte insieme.
   */
  leg: number | null
}

/** Chi decide la parte «condizione» di uno scenario. */
export interface ConditionOutcome {
  happens: boolean
  /**
   * La gamba di copertura che decide: in Punta quella che vince quando la condizione non si
   * verifica, in Banca quella che perde quando si verifica; null quando decidono tutte insieme.
   */
  leg: number | null
}

export interface CondizionatoScenario {
  id: string
  qualifier: QualifierOutcome
  condition: ConditionOutcome
  /** Profitto della qualificante, senza il rimborso. */
  qualifierProfit: number
  /** Profitto di ogni gamba della copertura della qualificante. */
  qualifierCovers: number[]
  /** Profitto di ogni gamba della copertura della condizione. */
  conditionCovers: number[]
  /** Il rimborso, quando lo scenario lo paga; altrimenti 0. */
  refund: number
  total: number
}

export interface CondizionatoResult {
  qualifierCovers: CoverLegResult[]
  conditionCovers: CoverLegResult[]
  scenarios: CondizionatoScenario[]
  /** Il guadagno garantito: il peggiore degli scenari. */
  minProfit: number
  maxProfit: number
  /** Esborso: la puntata più quanto rischiano tutte le coperture. */
  outlay: number
  /** CR: guadagno minimo sul rimborso, in percento. */
  crPercent: number
}

function positive(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 0
}

function validOdds(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n) && n > 1
}

/** Una gamba con bersaglio `target`: null se la quota o la commissione non sono valide. */
export function coverLeg(
  mode: CoverMode,
  leg: CoverLegInput,
  target: number,
): CoverLegResult | null {
  if (!validOdds(leg.odds)) return null
  const commissionPercent = mode === 'banca' ? (leg.commissionPercent ?? 0) : 0
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent >= 100) {
    return null
  }
  const c = commissionPercent / 100
  const stakeExact = target / (leg.odds - c)
  if (!Number.isFinite(stakeExact) || stakeExact < 0) return null
  const stake = roundStake(stakeExact)
  if (mode === 'banca') {
    const liability = stake * (leg.odds - 1)
    return {
      mode,
      odds: leg.odds,
      commissionPercent,
      stakeExact,
      stake,
      liability,
      win: stake * (1 - c),
      lose: -liability,
    }
  }
  return {
    mode,
    odds: leg.odds,
    commissionPercent,
    stakeExact,
    stake,
    liability: stake,
    win: stake * (leg.odds - 1),
    lose: -stake,
  }
}

function sectionLegs(section: CoverSectionInput, target: number): CoverLegResult[] | null {
  if (section.legs.length < 1 || section.legs.length > 2) return null
  const legs: CoverLegResult[] = []
  for (const input of section.legs) {
    const leg = coverLeg(section.mode, input, target)
    if (!leg) return null
    legs.push(leg)
  }
  return legs
}

/**
 * Gli esiti di una sezione dal punto di vista dell'evento che copre (la qualificante vince, la
 * condizione si verifica): per ognuno, se l'evento c'è, la gamba che decide e il profitto di ogni
 * gamba.
 */
function sectionOutcomes(mode: CoverMode, legs: CoverLegResult[]) {
  const all = (pick: (leg: CoverLegResult) => number) => legs.map(pick)
  const single = legs.length === 1
  if (mode === 'banca') {
    // Bancate degli esiti dell'evento: se l'evento c'è perde la bancata di quell'esito e vincono
    // le altre; se non c'è vincono tutte.
    return [
      ...legs.map((_, j) => ({
        event: true,
        leg: single ? null : j,
        profits: legs.map((leg, k) => (k === j ? leg.lose : leg.win)),
      })),
      { event: false, leg: null, profits: all((leg) => leg.win) },
    ]
  }
  // Punte degli esiti opposti: se l'evento c'è perdono tutte; se non c'è vince la punta
  // dell'esito uscito e perdono le altre.
  return [
    { event: true, leg: null, profits: all((leg) => leg.lose) },
    ...legs.map((_, k) => ({
      event: false,
      leg: single ? null : k,
      profits: legs.map((leg, i) => (i === k ? leg.win : leg.lose)),
    })),
  ]
}

export function computeCondizionato(input: CondizionatoInput): CondizionatoResult | null {
  const { stake, odds, refund } = input
  if (!positive(stake) || !validOdds(odds) || !positive(refund)) return null

  const qualifierCovers = sectionLegs(input.qualifier, stake * odds)
  const conditionCovers = sectionLegs(input.condition, refund)
  if (!qualifierCovers || !conditionCovers) return null

  const qualifierSide = sectionOutcomes(input.qualifier.mode, qualifierCovers)
  const conditionSide = sectionOutcomes(input.condition.mode, conditionCovers)

  const scenarios: CondizionatoScenario[] = []
  for (const q of qualifierSide) {
    const wins = q.event
    for (const c of conditionSide) {
      // La qualificante sta su un esito che esclude la condizione: se vince, la condizione no.
      if (wins && c.event) continue
      const qualifierProfit = wins ? stake * (odds - 1) : -stake
      const paid = !wins && c.event ? refund : 0
      const total =
        qualifierProfit +
        q.profits.reduce((s, p) => s + p, 0) +
        c.profits.reduce((s, p) => s + p, 0) +
        paid
      scenarios.push({
        id: `q${wins ? 'w' : 'l'}${q.leg ?? ''}-c${c.event ? 'y' : 'n'}${c.leg ?? ''}`,
        qualifier: { wins, leg: q.leg },
        condition: { happens: c.event, leg: c.leg },
        qualifierProfit,
        qualifierCovers: q.profits,
        conditionCovers: c.profits,
        refund: paid,
        total,
      })
    }
  }

  const totals = scenarios.map((s) => s.total)
  const minProfit = Math.min(...totals)
  const maxProfit = Math.max(...totals)
  const outlay =
    stake +
    qualifierCovers.reduce((s, leg) => s + leg.liability, 0) +
    conditionCovers.reduce((s, leg) => s + leg.liability, 0)

  return {
    qualifierCovers,
    conditionCovers,
    scenarios,
    minProfit,
    maxProfit,
    outlay,
    crPercent: (minProfit / refund) * 100,
  }
}
