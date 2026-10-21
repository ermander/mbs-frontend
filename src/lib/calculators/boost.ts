import { formatOdds } from '@/lib/landing-format'

/**
 * Maggiorazione di una quota (§14.274): il sito aumenta della percentuale la vincita netta, non la
 * quota intera, quindi la quota effettiva è 1 + (q − 1) × (1 + m/100), a tre decimali come la quota
 * delle gambe nel tracker (NUMERIC(8,3)): calcolo e giocata salvata coincidono. I calcolatori la usano
 * al posto della quota scritta (bancate, coperture, rating, profitti) e la salvano nella giocata; la
 * quota di partenza e la percentuale vanno nella nota.
 */

/** Interruttore e percentuale scritta di una gamba. */
export interface BoostInput {
  on: boolean
  percent: string
}

export const NO_BOOST: BoostInput = { on: false, percent: '' }

/** La percentuale in vigore: 0 a interruttore spento, campo vuoto o valore non valido o negativo. */
export function boostPercent(boost: BoostInput): number {
  if (!boost.on || boost.percent.trim() === '') return 0
  const n = Number.parseFloat(boost.percent.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** La quota effettiva a tre decimali; senza maggiorazione (o senza quota valida) quella di partenza. */
export function boostedOdds(odds: number | null, percent: number): number | null {
  if (odds == null || !Number.isFinite(odds)) return odds
  if (percent <= 0 || odds <= 1) return odds
  return Math.round((1 + (odds - 1) * (1 + percent / 100)) * 1000) / 1000
}

const effectiveFormat = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
})

/** "2,155", "2,20": la quota effettiva con il terzo decimale quando c'è. */
export function formatBoostedOdds(value: number): string {
  return effectiveFormat.format(value)
}

export interface BoostNoteEntry {
  /** Di quale gamba si tratta: «Punta», «Punta 2», «Over su Sisal». */
  label: string
  /** La quota scritta, prima della maggiorazione. */
  odds: number | null
  percent: number
}

const percentFormat = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })

/**
 * La nota della giocata per le gambe maggiorate, «Quota maggiorata: Punta 2,05 +10 % → 2,155», più
 * gambe separate da « · »; undefined quando nessuna gamba è maggiorata.
 */
export function boostNote(entries: BoostNoteEntry[]): string | undefined {
  const parts = entries
    .filter((e) => e.percent > 0 && e.odds != null && e.odds > 1)
    .map((e) => {
      const effective = boostedOdds(e.odds, e.percent) as number
      return `${e.label} ${formatOdds(e.odds as number)} +${percentFormat.format(e.percent)} % → ${formatBoostedOdds(effective)}`
    })
  return parts.length > 0 ? `Quota maggiorata: ${parts.join(' · ')}` : undefined
}
