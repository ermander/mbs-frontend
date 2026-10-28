import { bookmakerLogoSrc, shortBookmakerName } from '@/lib/bookmakers'
import type {
  BetLeg,
  ModalitaSaldo,
  OngoingBet,
  OngoingBetLegSummary,
  SportType,
} from '@/types/profit-tracker'

/**
 * Giocate in corso dal design «OddWise Giocate in corso» (§14.281): riepilogo delle gambe, nome
 * e tipo della giocata, data dell'evento in parole, filtri e ordinamento della lista.
 */

const MULTIPLA_PREFIX = /^MULTIPLA\s+/i

/** Le multiple si salvano col nome «MULTIPLA <primo evento>» (oddsmatcher e calcolatore). */
export function isMultipla(bet: Pick<OngoingBet, 'eventoNome'>): boolean {
  return bet.eventoNome.toUpperCase().startsWith('MULTIPLA')
}

/**
 * Lo stesso riepilogo del backend, dalle gambe che il frontend ha già (dettaglio, salvataggio):
 * la gamba con la posizione più bassa e gli eventi nell'ordine di posizione, una volta ciascuno.
 */
export function legSummary(legs: BetLeg[]): OngoingBetLegSummary {
  const sorted = legs
    .map((leg, i) => ({ leg, pos: leg.posizione ?? i }))
    .sort((a, b) => a.pos - b.pos)
  const first = sorted[0]?.leg
  const eventi: string[] = []
  for (const { leg } of sorted) if (!eventi.includes(leg.eventoNome)) eventi.push(leg.eventoNome)
  return {
    competizione: first?.competizione ?? null,
    mercato: first?.mercato ?? null,
    selezione: first?.selezione ?? null,
    quota: first?.quota ?? null,
    eventi,
  }
}

/** Gli eventi di una multipla: quelli delle gambe di copertura, senza la gamba «MULTIPLA …». */
export function multiplaEvents(bet: OngoingBet): string[] {
  const events = (bet.riepilogoGambe?.eventi ?? []).filter((e) => !MULTIPLA_PREFIX.test(e))
  return events.length > 0 ? events : [displayName(bet)]
}

/** Il nome da mostrare: senza «MULTIPLA» davanti, che la riga dice già col badge. */
export function displayName(bet: Pick<OngoingBet, 'eventoNome'>): string {
  return bet.eventoNome.replace(MULTIPLA_PREFIX, '').trim() || bet.eventoNome
}

export const SPORT_LABEL: Record<SportType, string> = {
  calcio: 'Calcio',
  tennis: 'Tennis',
  basket: 'Basket',
  altro: 'Altro',
}

const decimal2 = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** «Calcio · Serie A · 1X2 1 · quota 2,10»; per la multipla «Calcio · 3 eventi · quota 7,84». */
export function betCaption(bet: OngoingBet): string {
  const r = bet.riepilogoGambe
  const parts: string[] = [SPORT_LABEL[bet.sport] ?? bet.sport]
  if (isMultipla(bet)) {
    const n = multiplaEvents(bet).length
    parts.push(n === 1 ? '1 evento' : `${n} eventi`)
  } else if (r) {
    // La giocata singola a mano salva «N/D» come competizione.
    if (r.competizione && r.competizione !== 'N/D') parts.push(r.competizione)
    if (r.mercato) parts.push(r.selezione ? `${r.mercato} ${r.selezione}` : r.mercato)
  }
  if (r?.quota != null && r.quota > 0) parts.push(`quota ${decimal2.format(r.quota)}`)
  return parts.join(' · ')
}

const p2 = (n: number) => String(n).padStart(2, '0')
const hm = (d: Date) => `${p2(d.getHours())}:${p2(d.getMinutes())}`
const WEEKDAY = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

/** La data dell'evento in parole: «Iniziata alle 18:30», «Oggi alle», «Domani alle», «mer 29/10 18:00». */
export function eventWhen(iso: string, now: Date): { text: string; started: boolean } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { text: '—', started: false }
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 864e5)
  if (d < now) {
    return {
      text:
        diff === 0
          ? `Iniziata alle ${hm(d)}`
          : `Iniziata il ${p2(d.getDate())}/${p2(d.getMonth() + 1)}`,
      started: true,
    }
  }
  if (diff === 0) return { text: `Oggi alle ${hm(d)}`, started: false }
  if (diff === 1) return { text: `Domani alle ${hm(d)}`, started: false }
  return {
    text: `${WEEKDAY[d.getDay()]} ${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${hm(d)}`,
    started: false,
  }
}

/** «creata il 27/10 alle 18:51». */
export function createdLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `creata il ${p2(d.getDate())}/${p2(d.getMonth() + 1)} alle ${hm(d)}`
}

/** Il file del logo di un book del tracker: il collegamento al motore (externalId), poi il nome. */
export function bookLogoSlug(book: { nome: string; externalId?: string | null }): string {
  const ext = (book.externalId ?? '').trim().toLowerCase()
  if (ext && bookmakerLogoSrc(ext)) return ext
  const byName = shortBookmakerName(book.nome)
    .toLowerCase()
    .replace(/\.it$/, '')
    .replace(/[^a-z0-9]/g, '')
  return bookmakerLogoSrc(byName) ? byName : ''
}

export interface OngoingFilters {
  sport: SportType | ''
  accountId: string
  modalitaSaldo: ModalitaSaldo | ''
  tag: string
  tipo: 'singola' | 'multipla' | ''
  dal: string
  al: string
}

export const EMPTY_ONGOING_FILTERS: OngoingFilters = {
  sport: '',
  accountId: '',
  modalitaSaldo: '',
  tag: '',
  tipo: '',
  dal: '',
  al: '',
}

/** Il filtro «Nessun tag»: '' vuol dire tutti i tag. */
export const NO_TAG = '__nessun-tag'

export type OngoingSort = 'evento' | 'creazione'

/** Il giorno locale «aaaa-mm-gg» di una data, per i filtri Dal / Al come nel design. */
function localDay(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

/**
 * Le giocate non archiviate che passano ricerca e filtri, ordinate per data dell'evento
 * (la più vicina prima) o di creazione (la più recente prima). La ricerca guarda nome, eventi
 * della multipla, competizione e il nome del conto.
 */
export function filterOngoingBets(
  bets: OngoingBet[],
  q: string,
  f: OngoingFilters,
  sort: OngoingSort,
  accountLabel: (accountId: string) => string,
): OngoingBet[] {
  const query = q.trim().toLowerCase()
  const list = bets.filter((b) => {
    if (b.archiviata) return false
    if (query) {
      const hay = [
        b.eventoNome,
        ...(b.riepilogoGambe?.eventi ?? []),
        b.riepilogoGambe?.competizione ?? '',
        accountLabel(b.accountId),
      ]
        .join(' ')
        .toLowerCase()
      if (!hay.includes(query)) return false
    }
    if (f.sport && b.sport !== f.sport) return false
    if (f.accountId && b.accountId !== f.accountId) return false
    if (f.modalitaSaldo && b.modalitaSaldo !== f.modalitaSaldo) return false
    if (f.tag && (b.tag ?? '') !== (f.tag === NO_TAG ? '' : f.tag)) return false
    if (f.tipo && (isMultipla(b) ? 'multipla' : 'singola') !== f.tipo) return false
    const day = localDay(b.eventoData)
    if (f.dal && day < f.dal) return false
    if (f.al && day > f.al) return false
    return true
  })
  const time = (s: string) => new Date(s).getTime()
  return list.sort((a, b) =>
    sort === 'evento'
      ? time(a.eventoData) - time(b.eventoData) || time(b.createdAt) - time(a.createdAt)
      : time(b.createdAt) - time(a.createdAt),
  )
}
