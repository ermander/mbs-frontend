import { shortBookmakerName } from '@/lib/bookmakers'
import { formatOdds, formatRating } from '@/lib/landing-format'
import { formatClock, isLayLeg, marketLabel, outcomeName } from '@/lib/matcher/format'
import type { MatchType, MatcherResult } from '@/types/matcher'
import type {
  RecheckBookmaker,
  RecheckFinding,
  RecheckPrice,
  RecheckPriceChange,
  RecheckQuota,
  RecheckRequest,
  RecheckResponse,
} from '@/types/odds-recheck'

/**
 * «Ricalcola» (ADAPTER_STATUS §14.390), the words of it: what the backend's answer to an on-demand
 * read means, as the dialog says it. Pure, so the sentences are under test. A bookmaker is always
 * called by the name the answer gives it: a brand that shares its prices with another one stays
 * that brand here.
 */

export type RecheckTone = 'neutral' | 'profit' | 'loss' | 'warning' | 'info'

/** One leg of the combination being looked at. */
export interface RecheckTargetLeg {
  bookmakerSlug: string
  bookmakerName: string
  outcomeKey: string
  /** «Over», «1»: the outcome as the row shows it. */
  outcomeName: string
  /** The lay side of a back/lay row. */
  lay: boolean
  eventUrl?: string | null
}

/**
 * What a «Ricalcola» is asked about: an event and one of its markets, with either the legs of a
 * combination (a row of the Oddsmatcher) or a plain list of bookmakers (a comparison of prices).
 */
export interface RecheckTarget {
  eventId: string
  canonicalMarketId: string
  /** «Genoa – Como» */
  eventName: string
  /** «O/U 2.5 · Serie A» */
  marketName: string
  matchType?: MatchType
  legs?: RecheckTargetLeg[]
  /** Without legs: the bookmakers to read. */
  bookmakers?: Array<{ slug: string; name: string; eventUrl?: string | null }>
  /** The rating on screen when the read was asked. */
  rating?: number
}

/** The row of the Oddsmatcher as a target; null on a row with no market id (an older backend). */
export function recheckTargetOfRow(row: MatcherResult): RecheckTarget | null {
  if (!row.canonicalMarketId) return null
  return {
    eventId: row.eventId,
    canonicalMarketId: row.canonicalMarketId,
    eventName: `${row.homeName ?? '?'} – ${row.awayName ?? '?'}`,
    marketName: `${marketLabel(row.marketTypeKey, row.line, row)} · ${row.competitionName}`,
    matchType: row.matchType,
    legs: row.legs.map((leg, i) => ({
      bookmakerSlug: leg.bookmakerSlug,
      bookmakerName: leg.bookmakerName,
      outcomeKey: leg.outcomeKey,
      outcomeName: outcomeName(leg),
      lay: isLayLeg(leg) || (row.matchType === 'back_lay' && i > 0),
      eventUrl: leg.eventUrl ?? null,
    })),
    rating: row.rating,
  }
}

/** The body of the request: the legs when there are any, the bookmakers otherwise. */
export function recheckRequestOf(target: RecheckTarget): RecheckRequest {
  const base = { eventId: target.eventId, canonicalMarketId: target.canonicalMarketId }
  if (target.legs && target.legs.length >= 2 && target.matchType) {
    return {
      ...base,
      row: {
        matchType: target.matchType,
        legs: target.legs.map((l) => ({ bookmaker: l.bookmakerSlug, outcomeKey: l.outcomeKey })),
      },
    }
  }
  const slugs = target.legs?.map((l) => l.bookmakerSlug) ?? target.bookmakers?.map((b) => b.slug)
  return { ...base, bookmakers: Array.from(new Set(slugs ?? [])) }
}

/** The names of the bookmakers of a target, without repeats: «Sisal e Betfair Exchange». */
export function targetBookmakerNames(target: RecheckTarget): string {
  const names = target.legs?.map((l) => l.bookmakerName) ?? target.bookmakers?.map((b) => b.name)
  return joinNames(Array.from(new Set((names ?? []).map(shortBookmakerName))))
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/** «12 s», «3 min». */
function shortDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} s`
  return `${Math.round(seconds / 60)} min`
}

const OFF_REASONS: Record<string, string> = {
  paused: 'La lettura delle quote è in pausa per tutti i bookmaker.',
  disabled: 'La lettura di questo bookmaker è spenta dal backoffice.',
  not_running: 'Il lettore di questo bookmaker non è in funzione in questo momento.',
}

/** The badge next to a bookmaker and, when it was not read now, why. */
export function readOutcomeText(b: RecheckBookmaker): {
  label: string
  tone: RecheckTone
  detail: string | null
} {
  switch (b.outcome) {
    case 'read':
      return { label: 'Letto ora', tone: 'profit', detail: null }
    case 'recent':
      return {
        label:
          b.readAgeSeconds != null
            ? `Letto ${shortDuration(b.readAgeSeconds)} fa`
            : 'Letto poco fa',
        tone: 'info',
        detail:
          'Il suo campionato è stato letto da pochi secondi e non viene riletto: le quote qui sotto sono quelle di quella lettura.',
      }
    case 'busy':
      return {
        label: 'Occupato',
        tone: 'warning',
        detail:
          'Una lettura programmata sta usando questo bookmaker e non è finita in tempo. Riprova fra un minuto.',
      }
    case 'off':
      return {
        label: 'Non in lettura',
        tone: 'neutral',
        detail:
          OFF_REASONS[b.detail ?? ''] ?? 'Questo bookmaker non viene letto in questo momento.',
      }
    case 'circuit_open':
      return {
        label: 'In pausa di sicurezza',
        tone: 'warning',
        detail: b.retryAt
          ? `Il bookmaker sta rifiutando le letture: le chiamate riprendono alle ${formatClock(b.retryAt)}.`
          : 'Il bookmaker sta rifiutando le letture: le chiamate riprendono fra poco.',
      }
    case 'not_mapped':
      return {
        label: 'Evento non collegato',
        tone: 'neutral',
        detail:
          'Questo evento non è collegato al palinsesto del bookmaker: non c’è nulla da leggere.',
      }
    case 'failed':
      return {
        label: 'Lettura fallita',
        tone: 'loss',
        detail: b.detail ? `La lettura non è riuscita: ${b.detail}` : 'La lettura non è riuscita.',
      }
    case 'timeout':
      return {
        label: 'Lettura lenta',
        tone: 'warning',
        detail:
          'La lettura sta impiegando più del previsto: va avanti da sola e le quote si aggiornano quando finisce. Riprova fra un minuto.',
      }
    default:
      return { label: 'Bookmaker sconosciuto', tone: 'neutral', detail: null }
  }
}

/** Whether the bookmaker was read by this request: only then there is a before and an after. */
export function wasRead(b: RecheckBookmaker): boolean {
  return b.outcome === 'read'
}

const CHANGE_LABELS: Record<RecheckPriceChange, { label: string; tone: RecheckTone }> = {
  confirmed: { label: 'Confermata', tone: 'profit' },
  moved: { label: 'Mossa', tone: 'warning' },
  withdrawn: { label: 'Tolta', tone: 'loss' },
  returned: { label: 'Tornata', tone: 'info' },
  new: { label: 'Nuova', tone: 'info' },
  unavailable: { label: 'Non offerta', tone: 'neutral' },
}

/** The state of one outcome after the read; null when there is nothing to say (bookmaker not read). */
export function changeText(
  change: RecheckPriceChange | null,
  read: boolean,
): { label: string; tone: RecheckTone } | null {
  if (change) return CHANGE_LABELS[change]
  return read ? { label: 'Non riletta', tone: 'neutral' } : null
}

/** «2,05», «2,02 · banca 2,04» on an exchange, «—» with no playable price. */
export function priceText(
  price: Pick<RecheckPrice, 'odds' | 'layOdds' | 'status'> | null | undefined,
): string {
  if (!price || price.status !== 'active' || !(price.odds > 1)) return '—'
  const back = formatOdds(price.odds)
  return price.layOdds != null && price.layOdds > 1
    ? `${back} · banca ${formatOdds(price.layOdds)}`
    : back
}

/** The event as the bookmaker lists it: «Como – Genoa». */
export function listingName(b: RecheckBookmaker): string | null {
  return b.listing ? `${b.listing.homeName} – ${b.listing.awayName}` : null
}

/** One finding of a bookmaker as a sentence. */
export function findingText(
  finding: RecheckFinding,
  b: RecheckBookmaker,
): { tone: RecheckTone; text: string } {
  switch (finding) {
    case 'not_listed':
      return {
        tone: 'loss',
        text: b.outcomes.some((o) => o.change === 'withdrawn')
          ? 'Il bookmaker non ha più questo evento in elenco: le sue quote sono state sospese.'
          : 'Il bookmaker non ha questo evento nell’elenco letto ora. Le quote in archivio non sono state confermate e restano finché non scadono.',
      }
    case 'market_not_listed':
      return {
        tone: 'warning',
        text: 'L’evento c’è, ma senza questo mercato (o con un nome che non riconosciamo): le quote in archivio non sono state confermate.',
      }
    case 'reversed_handled':
      return {
        tone: 'info',
        text: `Il bookmaker elenca le squadre in ordine inverso${listingName(b) ? ` (${listingName(b)})` : ''}: lo sappiamo, le sue quote sono già girate sui segni giusti.`,
      }
    case 'orientation_mismatch':
      return {
        tone: 'loss',
        text: b.mapping?.inverted
          ? 'Il collegamento dell’evento dice che il bookmaker ha le squadre in ordine inverso, ma dai nomi le ha nel nostro stesso ordine: le quote di casa e trasferta possono essere scambiate.'
          : `Dai nomi il bookmaker ha le squadre in ordine inverso${listingName(b) ? ` (${listingName(b)})` : ''}, ma il collegamento dell’evento non lo sa: le quote di casa e trasferta possono essere scambiate.`,
      }
    case 'sides_look_swapped':
      return {
        tone: 'loss',
        text: `Le due quote opposte di questo bookmaker tornano con gli altri ${b.referenceBooks} solo se scambiate fra loro: probabile inversione dei segni.`,
      }
    case 'kickoff_differs': {
      const minutes = Math.abs(b.kickoffDeltaMinutes ?? 0)
      const when = (b.kickoffDeltaMinutes ?? 0) > 0 ? 'dopo' : 'prima'
      const gap =
        minutes >= 120 ? `${Math.round(minutes / 60)} ore` : `${Math.round(minutes)} minuti`
      return {
        tone: 'warning',
        text: `Per il bookmaker la partita comincia ${gap} ${when} rispetto al nostro orario: può essere un’altra partita o un rinvio non ancora letto.`,
      }
    }
    case 'price_moved':
      return {
        tone: 'warning',
        text: 'Una quota si era mossa e non era ancora stata letta: ora è aggiornata.',
      }
    case 'price_withdrawn':
      return { tone: 'loss', text: 'Una quota non è più offerta: è stata sospesa.' }
    case 'price_returned':
      return { tone: 'info', text: 'Una quota che non avevamo è di nuovo disponibile.' }
    case 'price_confirmed':
      return {
        tone: 'profit',
        text: 'Le quote lette ora sono le stesse che avevamo in archivio.',
      }
  }
}

/**
 * The findings worth a line each: with the event gone from the bookmaker's list, the prices
 * suspended with it are already in that sentence.
 */
export function shownFindings(b: RecheckBookmaker): RecheckFinding[] {
  return b.findings.includes('not_listed')
    ? b.findings.filter((f) => f !== 'price_withdrawn')
    : b.findings
}

const has = (b: RecheckBookmaker, ...findings: RecheckFinding[]) =>
  findings.some((f) => b.findings.includes(f))

const names = (list: RecheckBookmaker[]) => joinNames(list.map((b) => shortBookmakerName(b.name)))

/** The answer in two lines: which of the suspects it was. */
export function recheckVerdict(result: Pick<RecheckResponse, 'bookmakers'>): {
  tone: RecheckTone
  title: string
  text: string
} {
  const all = result.bookmakers
  const swapped = all.filter((b) => has(b, 'orientation_mismatch', 'sides_look_swapped'))
  if (swapped.length > 0) {
    return {
      tone: 'loss',
      title: 'Probabile inversione dei segni',
      text: `Su ${names(swapped)} le quote sembrano sui segni sbagliati: la riga non è affidabile finché il collegamento dell’evento non viene corretto.`,
    }
  }
  const gone = all.filter((b) => has(b, 'not_listed', 'market_not_listed', 'price_withdrawn'))
  if (gone.length > 0) {
    return {
      tone: 'loss',
      title: 'Quota non più disponibile',
      text: `${names(gone)} non offre più l’evento o una delle quote così come le avevamo.`,
    }
  }
  const moved = all.filter((b) => has(b, 'price_moved', 'price_returned'))
  if (moved.length > 0) {
    return {
      tone: 'warning',
      title: 'Quota mossa',
      text: `Su ${names(moved)} una quota era cambiata e non era ancora stata letta. Ora è aggiornata.`,
    }
  }
  const read = all.filter(wasRead)
  const fresh = all.filter((b) => b.outcome === 'recent')
  const confirmed = read.filter((b) => has(b, 'price_confirmed'))
  const LOGGED_IN =
    'Se sul sito vedi un valore diverso, soprattutto da loggato, è un prezzo che il bookmaker mostra solo lì (quota maggiorata o riservata al conto): la nostra lettura, che è anonima, non lo vede.'
  if (all.length > 0 && confirmed.length + fresh.length === all.length) {
    return read.length > 0
      ? {
          tone: 'profit',
          title: 'Quote confermate',
          text: `La lettura di adesso conferma le quote in archivio. ${LOGGED_IN}`,
        }
      : {
          tone: 'info',
          title: 'Quote già fresche',
          text: `I bookmaker della riga sono stati letti da pochi secondi: le quote in archivio sono già quelle di adesso. ${LOGGED_IN}`,
        }
  }
  if (read.length === 0) {
    return {
      tone: 'neutral',
      title: 'Nessuna lettura nuova',
      text: 'Nessun bookmaker è stato riletto adesso: il motivo è accanto a ciascuno.',
    }
  }
  return {
    tone: 'neutral',
    title: 'Lettura parziale',
    text: 'Non tutti i bookmaker della riga sono stati riletti o confermati: il dettaglio è qui sotto.',
  }
}

/** What became of the combination: its rating before and after, or that it is gone. */
export function rowOutcomeText(
  target: Pick<RecheckTarget, 'rating'>,
  result: Pick<RecheckResponse, 'row' | 'matcherApplied' | 'bookmakers'>,
): string | null {
  if (!result.row) return null
  if (!result.bookmakers.some(wasRead)) return null
  if (!result.matcherApplied) {
    return 'Le combinazioni si stanno ricalcolando: la riga si aggiorna fra poco, premi «Aggiorna».'
  }
  if (!result.row.found || result.row.rating == null) {
    return 'Con le quote di adesso questa combinazione non è più fra i risultati (sotto la soglia di rating, o una quota non c’è più).'
  }
  const after = formatRating(result.row.rating)
  if (target.rating == null) return `Rating della combinazione: ${after}.`
  const before = formatRating(target.rating)
  return before === after
    ? `Rating della combinazione: ${after}, invariato.`
    : `Rating della combinazione: ${before} → ${after}.`
}

/** «Ti restano 57 ricalcoli su 60 in quest’ora.» */
export function quotaText(quota: RecheckQuota): string {
  const window =
    quota.windowSeconds === 3600
      ? 'in quest’ora'
      : `ogni ${Math.round(quota.windowSeconds / 60)} minuti`
  if (quota.limit <= 0) return 'Il ricalcolo on demand non è abilitato per il tuo utente.'
  const left =
    quota.remaining === 1 ? 'Ti resta 1 ricalcolo' : `Ti restano ${quota.remaining} ricalcoli`
  const back =
    quota.remaining === 0 && quota.resetAt
      ? ` Il prossimo dalle ${formatClock(quota.resetAt)}.`
      : ''
  return `${left} su ${quota.limit} ${window}.${back}`
}
