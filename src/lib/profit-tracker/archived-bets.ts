import type { ArchivedBetListParams } from '@/services/api/profit-tracker-client'
import type { ArchivedBetEsito, ModalitaSaldo, SportType } from '@/types/profit-tracker'

/**
 * Giocate archiviate dal design «OddWise Giocate archiviate» (§14.298): data dell'evento e di
 * archiviazione, esito, filtri e la loro traduzione nella query della rotta paginata. Filtri,
 * ricerca e ordinamento li applica il backend.
 */

const p2 = (n: number) => String(n).padStart(2, '0')

/** «27/10/26 23:00», la data dell'evento della prima colonna. */
export function eventDateLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

/** «archiviata il 28/10»; vuoto quando il backend non ha la data (archiviate prima del §14.298). */
export function archivedCaption(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `archiviata il ${p2(d.getDate())}/${p2(d.getMonth() + 1)}`
}

export const ESITO_LABEL: Record<ArchivedBetEsito, string> = {
  profit: 'In profitto',
  loss: 'In perdita',
  void: 'Rimborsate',
}

/** Il valore del filtro Tag per le giocate senza tag (QUICK_BET_NO_TAG del backend). */
export const NO_TAG = '__none__'

export interface ArchivedFilters {
  sport: SportType | ''
  accountId: string
  modalitaSaldo: ModalitaSaldo | ''
  esito: ArchivedBetEsito | ''
  tag: string
  tipo: 'singola' | 'multipla' | ''
  /** «2026-10-21», giorno dell'evento compreso. */
  dal: string
  al: string
}

export const EMPTY_ARCHIVED_FILTERS: ArchivedFilters = {
  sport: '',
  accountId: '',
  modalitaSaldo: '',
  esito: '',
  tag: '',
  tipo: '',
  dal: '',
  al: '',
}

export type ArchivedSort = 'evento' | 'archiviazione' | 'profitto'

/** La query della pagina `page` (da 0, come la paginazione) con ricerca, filtri e ordinamento. */
export function archivedListParams(
  page: number,
  limit: number,
  q: string,
  f: ArchivedFilters,
  sort: ArchivedSort,
): ArchivedBetListParams {
  return { page: page + 1, limit, q: q.trim(), ...f, sort }
}
