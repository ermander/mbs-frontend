import { QUICK_METHODS } from '@/lib/profit-tracker/categories'
import type { QuickBet } from '@/types/profit-tracker'

/**
 * Giocate rapide dal design «OddWise Giocate rapide»: nome del metodo, importo scritto
 * all'italiana, data di registrazione e filtri. Filtri, ricerca e ordinamento li applica il
 * backend sulla rotta paginata (§14.293).
 */

const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  QUICK_METHODS.map((m) => [m.value, m.label]),
)

export function quickMethodLabel(method: string): string {
  return METHOD_LABEL[method] ?? method.replace(/_/g, ' ')
}

/**
 * Il movimento scritto nel campo: «25», «−15», «-8,34», «1.250,50». Il punto è il separatore
 * delle migliaia solo quando c'è anche la virgola, così «8.34» resta 8,34. Null se non è un
 * numero.
 */
export function parseMovimento(text: string): number | null {
  let s = text.trim().replace(/−/g, '-').replace(/\s+/g, '')
  if (s === '') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

const p2 = (n: number) => String(n).padStart(2, '0')

/** Il giorno locale «2026-10-28» di una data ISO (il «Registrata il» della modale). */
export function localYmd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

/**
 * La cella «Registrata il»: il giorno scelto nella modale e, sotto, l'ora di inserimento. La
 * modale salva la mezzanotte del giorno, quindi l'ora vera è quella di `createdAt`; se la
 * giocata è stata inserita un altro giorno lo dice («inserita il 29/10 alle 09:12»).
 */
export function registeredLabel(bet: Pick<QuickBet, 'dataRegistrazione' | 'createdAt'>): {
  date: string
  caption: string
} {
  const d = new Date(bet.dataRegistrazione)
  const date = Number.isNaN(d.getTime())
    ? '—'
    : `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`
  const c = bet.createdAt ? new Date(bet.createdAt) : null
  if (!c || Number.isNaN(c.getTime())) return { date, caption: '' }
  const time = `${p2(c.getHours())}:${p2(c.getMinutes())}`
  const sameDay = localYmd(bet.dataRegistrazione) === localYmd(bet.createdAt as string)
  return {
    date,
    caption: sameDay
      ? `alle ${time}`
      : `inserita il ${p2(c.getDate())}/${p2(c.getMonth() + 1)} alle ${time}`,
  }
}

/** Il valore del filtro Tag per le giocate senza tag. */
export const NO_TAG = '__none__'

export interface QuickBetFilters {
  accountId: string
  metodo: string
  tag: string
  /** «2026-10-21», giorno di registrazione compreso. */
  dal: string
  al: string
}

export const EMPTY_QUICK_FILTERS: QuickBetFilters = {
  accountId: '',
  metodo: '',
  tag: '',
  dal: '',
  al: '',
}

export type QuickBetSort = 'data' | 'alto' | 'basso'
