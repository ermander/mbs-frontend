import { QUICK_METHODS } from '@/lib/profit-tracker/categories'
import type { QuickBet } from '@/types/profit-tracker'

/**
 * Giocate rapide dal design «OddWise Giocate rapide»: nome del metodo, importo scritto
 * all'italiana, data di registrazione, filtri e ordinamento della lista.
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

/** Il giorno locale «2026-10-28» di una data ISO, quello che si confronta coi filtri dal/al. */
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

function timeOf(value?: string) {
  const t = value ? new Date(value).getTime() : Number.NaN
  return Number.isNaN(t) ? 0 : t
}

/**
 * Più recente prima: data di registrazione, poi orario di inserimento, poi id. È lo stesso
 * criterio dell'ORDER BY del backend, così l'elenco non cambia ordine tra una giocata appena
 * salvata e il ricaricamento della pagina.
 */
export function compareNewestFirst(a: QuickBet, b: QuickBet): number {
  return (
    timeOf(b.dataRegistrazione) - timeOf(a.dataRegistrazione) ||
    timeOf(b.createdAt) - timeOf(a.createdAt) ||
    b.id.localeCompare(a.id)
  )
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

/**
 * Ricerca (tutte le parole, su conto, metodo, nota e tag), filtri e ordinamento: «data» è il più
 * recente prima, «alto»/«basso» il movimento, a pari importo il più recente prima.
 */
export function filterQuickBets(
  list: QuickBet[],
  q: string,
  f: QuickBetFilters,
  sort: QuickBetSort,
  accountLabel: (accountId: string) => string,
): QuickBet[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  const rows = list.filter((b) => {
    if (f.accountId && b.accountId !== f.accountId) return false
    if (f.metodo && b.quickMethod !== f.metodo) return false
    if (f.tag === NO_TAG ? !!b.tag : f.tag && (b.tag ?? '') !== f.tag) return false
    const day = localYmd(b.dataRegistrazione)
    if (f.dal && day < f.dal) return false
    if (f.al && day > f.al) return false
    if (words.length === 0) return true
    const hay = [accountLabel(b.accountId), quickMethodLabel(b.quickMethod), b.nota, b.tag]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return words.every((w) => hay.includes(w))
  })
  const cmp =
    sort === 'alto'
      ? (a: QuickBet, b: QuickBet) => b.movimento - a.movimento || compareNewestFirst(a, b)
      : sort === 'basso'
        ? (a: QuickBet, b: QuickBet) => a.movimento - b.movimento || compareNewestFirst(a, b)
        : compareNewestFirst
  return rows.sort(cmp)
}
