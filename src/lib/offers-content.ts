import type { DsBadgeTone } from '@/components/landing/ds-data'
import type { OfferDifficulty, OfferType } from '@/types/offers'

/**
 * Elenco delle offerte dal design «OddWise Offerte» di Claude Design (artifact
 * 7WRKR9sJpAQA8BUmvG2Ndp, ADAPTER_STATUS §14.259): tre tipi (benvenuto, ricorrenti, esclusive),
 * sezioni per gruppo e in fondo le scadute, filtro per sito di scommesse.
 *
 * Il catalogo qui sotto è quello DI ESEMPIO del design (titoli, profitti, difficoltà, date): non
 * esiste ancora un archivio delle offerte nel backend. Va sostituito con i dati veri prima della
 * pubblicazione; le funzioni pure lavorano su qualunque elenco di Offer.
 *
 * Deviazioni dal design: il filtro si chiama «Sito di scommesse» e non «Bookmaker», e la parola
 * sparisce anche dalla descrizione del benvenuto e dalle note (regola del brand, come sulla
 * landing); gli stati personali («Completata», «In corso», l'interruttore
 * «Nascondi completate» e il pulsante «Completata») restano fuori finché la pagina è pubblica e
 * non c'è dove salvarli.
 */

export type { OfferDifficulty, OfferType }

export interface Offer {
  id: string
  type: OfferType
  /** Sezione dentro il tipo (meccanica per il benvenuto, frequenza per le ricorrenti); null per le esclusive. */
  group: string | null
  /** Slug di od_bookmakers: dà il logo (lib/bookmakers). */
  bookSlug: string
  bookName: string
  title: string
  /** Profitto stimato in euro; null quando dipende dal giro («Variabile»). */
  profit: number | null
  difficulty: OfferDifficulty
  isNew?: boolean
  /** Giorni alla scadenza, per il badge «Scade tra N giorni». */
  expiresInDays?: number
  /** Data di scadenza (AAAA-MM-GG) di un'offerta già scaduta: la carta va fra le «Scadute». */
  expiredOn?: string
  /**
   * Scaduta anche senza data (forzata dal backoffice, §14.262); senza il campo vale expiredOn.
   * Le offerte dell'API lo portano sempre.
   */
  expired?: boolean
}

export const OFFER_TYPES: readonly { value: OfferType; label: string; description: string }[] = [
  {
    value: 'benvenuto',
    label: 'Benvenuto',
    description: 'Una volta sola, alla registrazione su un nuovo sito di scommesse.',
  },
  {
    value: 'ricorrenti',
    label: 'Ricorrenti',
    description: 'Tornano ogni giorno, ogni settimana o ogni mese.',
  },
  {
    value: 'esclusive',
    label: 'Esclusive',
    description: 'Offerte personali segnalate dagli utenti: controlla se le hai ricevute anche tu.',
  },
]

/** Ordine delle sezioni di ogni tipo; un gruppo che non compare qui va in coda, mai scartato. */
const GROUP_ORDER: Record<OfferType, readonly (string | null)[]> = {
  benvenuto: ['Singola', 'Multipla', 'Rollover', 'Rimborso', 'Casinò'],
  ricorrenti: ['Ogni giorno', 'Ogni settimana', 'Ogni mese', 'Quando disponibili'],
  esclusive: [null],
}

export const ALL_BOOKS = 'all'

/**
 * Oggi elenco e dettaglio delle offerte sono pubblici (§14.259-14.260). Per riservarli a chi ha un
 * account basta true: OffersAccess li avvolge nella guard dell'area autenticata, che rimanda al
 * login chi non è entrato.
 */
export const OFFERS_LOGIN_REQUIRED: boolean = false

/** Il tipo dal parametro ?tipo= della pagina (link «indietro» del dettaglio); il benvenuto se manca o è sconosciuto. */
export function parseOfferType(value: string | string[] | undefined): OfferType {
  const v = Array.isArray(value) ? value[0] : value
  return OFFER_TYPES.some((t) => t.value === v) ? (v as OfferType) : 'benvenuto'
}

/** L'offerta con quell'id, null se non c'è. */
export function offerById(offers: readonly Offer[], id: string): Offer | null {
  return offers.find((offer) => offer.id === id) ?? null
}

/** La pagina dell'elenco aperta sul tipo dell'offerta. */
export function offersListHref(type: OfferType): string {
  return `/offerte?tipo=${type}`
}

export const OFFERS_COPY = {
  title: 'Offerte',
  tablistLabel: 'Tipo di offerta',
  bookFilterLabel: 'Sito di scommesse',
  allBooks: 'Tutti i siti',
  profitLabel: 'Profitto stimato',
  variableProfit: 'Variabile',
  difficultyLabel: 'Difficoltà',
  openGuide: 'Apri la guida',
  readGuide: 'Leggi la guida',
  exclusivesTitle: 'Segnalate dagli utenti',
  exclusivesNote:
    "offerte personali che il sito di scommesse propone solo ad alcuni utenti; controlla se l'hai ricevuta anche tu",
  expiredTitle: 'Scadute',
  expiredNote: 'le guide restano leggibili',
  emptyDescription:
    'Prova con un altro sito di scommesse o guarda tutte le offerte di questo tipo.',
  emptyAction: 'Mostra tutte',
  responsibleGaming: 'Gioco vietato ai minori di 18 anni. Gioca responsabilmente.',
} as const

const o = (
  id: string,
  type: OfferType,
  group: string | null,
  bookSlug: string,
  bookName: string,
  title: string,
  profit: number | null,
  difficulty: OfferDifficulty,
  extra?: Pick<Offer, 'isNew' | 'expiresInDays' | 'expiredOn'>,
): Offer => ({ id, type, group, bookSlug, bookName, title, profit, difficulty, ...extra })

/** Il catalogo d'esempio del design, nello stesso ordine (vedi il commento in testa). */
// prettier-ignore
export const SAMPLE_OFFERS: readonly Offer[] = [
  o('snai-30', 'benvenuto', 'Singola', 'snai', 'Snai', 'Deposita 60 €, ricevi 30 € di bonus', 25, 'Facile'),
  o('betflag-10', 'benvenuto', 'Singola', 'betflag', 'Betflag', 'Scommetti 50 €, ricevi 10 € di free bet', 5.5, 'Facile'),
  o('daznbet-100', 'benvenuto', 'Multipla', 'daznbet', 'Daznbet', 'Scommetti 200 €, ricevi 100 € in quintupla', 40, 'Media'),
  o('eurobet-100', 'benvenuto', 'Multipla', 'eurobet', 'Eurobet', 'Deposita 200 €, ricevi 100 € in quintupla', 60, 'Media'),
  o('sisal-100', 'benvenuto', 'Multipla', 'sisal', 'Sisal', 'Deposita 200 €, scommetti 10 €, ricevi 100 € in quadrupla', 65, 'Media', { isNew: true }),
  o('stanleybet-40', 'benvenuto', 'Multipla', 'stanleybet', 'Stanleybet', 'Scommetti 20 €, ricevi 4 × 10 € in tripla', 29, 'Media'),
  o('williamhill-100', 'benvenuto', 'Multipla', 'williamhill', 'William Hill', 'Scommetti 100 €, ricevi 10 × 10 € di free bet', 55, 'Media'),
  o('planetwin-50', 'benvenuto', 'Multipla', 'planetwin365', 'Planetwin365', 'Scommetti 50 €, ricevi 50 € in sestupla', 26, 'Difficile'),
  o('bet365-100', 'benvenuto', 'Rollover', 'bet365', 'Bet365', 'Deposita fino a 100 €, ricevi il 100 % con rollover', 70, 'Difficile'),
  o('netbet-30', 'benvenuto', 'Rimborso', 'netbet', 'Netbet', 'Scommetti 10 €, ricevi fino a 30 € di free bet', 10, 'Media'),
  o('goldbet-slot', 'benvenuto', 'Casinò', 'goldbet', 'Goldbet', 'Deposita 500 €, ricevi 50 € per le slot IGT', 20, 'Facile'),
  o('leovegas-casino', 'benvenuto', 'Casinò', 'leovegas', 'LeoVegas', 'Deposita 20 €, ricevi 20 € per il casinò', 8, 'Media'),
  o('admiralbet-20', 'benvenuto', 'Singola', 'admiralbet', 'Admiralbet', 'Scommetti 20 €, ricevi 20 € di free bet', 12, 'Facile', { expiredOn: '2026-10-16' }),
  o('winbet-25', 'benvenuto', 'Singola', 'winbet', 'Winbet', 'Deposita 25 €, ricevi 25 € di bonus', 14, 'Facile', { expiredOn: '2026-09-30' }),
  o('sisal-ruota-scommesse', 'ricorrenti', 'Ogni giorno', 'sisal', 'Sisal', 'Ruota dei bonus scommesse', null, 'Facile'),
  o('sisal-ruota-casino', 'ricorrenti', 'Ogni giorno', 'sisal', 'Sisal', 'Ruota dei bonus casinò e slot', null, 'Facile'),
  o('goldbet-live', 'ricorrenti', 'Ogni settimana', 'goldbet', 'Goldbet', 'Rimborso del 10 % sul casinò live, fino a 10 €', 2, 'Media', { expiresInDays: 2 }),
  o('betsson-quadrupla', 'ricorrenti', 'Ogni settimana', 'betsson', 'Betsson', 'Scommetti 10 € in quadrupla, ricevi 5 € di free bet', 1.5, 'Media', { isNew: true }),
  o('bwin-multipla', 'ricorrenti', 'Ogni settimana', 'bwin', 'Bwin', 'Rimborso del 50 % sulla prima multipla della settimana, fino a 20 €', 6, 'Media'),
  o('888-mensile', 'ricorrenti', 'Ogni mese', '888sport', '888sport', 'Rimborso del 10 % sulle perdite nette del mese, fino a 50 €', 12, 'Facile'),
  o('bet365-maggiorate', 'ricorrenti', 'Quando disponibili', 'bet365', 'Bet365', 'Quote maggiorate con la spunta gialla', null, 'Difficile'),
  o('eurobet-superquote', 'ricorrenti', 'Quando disponibili', 'eurobet', 'Eurobet', 'Super quote sugli eventi di Serie A', null, 'Media'),
  o('snai-tripla', 'ricorrenti', 'Ogni settimana', 'snai', 'Snai', 'Scommetti 50 € in tripla, ricevi 15 € di free bet', 3, 'Media', { expiredOn: '2026-10-19' }),
  o('bet365-venezia', 'ricorrenti', 'Quando disponibili', 'bet365', 'Bet365', 'Rimborso del 100 % su Venezia – Napoli', null, 'Media', { expiredOn: '2026-10-17' }),
  o('betpassion-escl', 'esclusive', null, 'betpassion', 'Betpassion', 'Via e-mail: scommetti 150 € in tripla, ricevi 50 € di free bet', 18, 'Media'),
  o('leovegas-escl', 'esclusive', null, 'leovegas', 'LeoVegas', 'Via SMS: rimborso del 20 % sulle perdite della settimana, fino a 50 €', 15, 'Facile'),
  o('netbet-escl', 'esclusive', null, 'netbet', 'Netbet', 'Nel conto: ricarica 50 €, ricevi altri 50 €', 22, 'Media', { isNew: true }),
  o('888-escl', 'esclusive', null, '888sport', '888sport', 'Via e-mail: deposita 20 €, ricevi 20 € di free bet', 10, 'Facile', { expiredOn: '2026-10-05' }),
]

export function isExpired(offer: Offer): boolean {
  return offer.expired ?? Boolean(offer.expiredOn)
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "3 offerte" · "1 offerta" */
export function offersCountLabel(n: number): string {
  return plural(n, 'offerta', 'offerte')
}

const dayMonth = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** "2026-10-16" → "16 ottobre" */
export function formatOfferDate(isoDate: string): string {
  return dayMonth.format(new Date(`${isoDate}T00:00:00Z`))
}

/** Le offerte non scadute di un tipo: il numero sulla scheda del tipo. */
export function activeCount(offers: readonly Offer[], type: OfferType): number {
  return offers.filter((offer) => offer.type === type && !isExpired(offer)).length
}

/** Le voci del filtro per il tipo scelto: «Tutti i siti» e i siti che hanno offerte, in ordine alfabetico. */
export function bookOptions(
  offers: readonly Offer[],
  type: OfferType,
): { value: string; label: string }[] {
  const names = [
    ...new Set(offers.filter((offer) => offer.type === type).map((offer) => offer.bookName)),
  ]
  names.sort((a, b) => a.localeCompare(b, 'it'))
  return [
    { value: ALL_BOOKS, label: OFFERS_COPY.allBooks },
    ...names.map((name) => ({ value: name, label: name })),
  ]
}

export interface OfferBadge {
  tone: DsBadgeTone
  label: string
}

/** Lo stato sulla carta: scaduta, in scadenza, nuova, altrimenti attiva (nell'ordine del design). */
export function offerBadge(offer: Offer): OfferBadge {
  if (isExpired(offer)) return { tone: 'loss', label: 'Scaduta' }
  if (offer.expiresInDays !== undefined) {
    const days = offer.expiresInDays
    return { tone: 'warning', label: `Scade tra ${days} ${days === 1 ? 'giorno' : 'giorni'}` }
  }
  if (offer.isNew) return { tone: 'accent', label: 'Nuova' }
  return { tone: 'brand', label: 'Attiva' }
}

export interface OfferSection {
  key: string
  title: string
  countLabel: string
  expired: boolean
  offers: Offer[]
}

/**
 * Le sezioni della pagina per un tipo e un sito: un gruppo per sezione nell'ordine di GROUP_ORDER
 * (i gruppi sconosciuti in coda), poi tutte le scadute insieme. Sezioni vuote mai.
 */
export function offerSections(
  offers: readonly Offer[],
  type: OfferType,
  book: string,
): OfferSection[] {
  const visible = offers.filter(
    (offer) => offer.type === type && (book === ALL_BOOKS || offer.bookName === book),
  )
  const active = visible.filter((offer) => !isExpired(offer))
  const expired = visible.filter(isExpired)

  const order = GROUP_ORDER[type]
  const rank = (group: string | null) => {
    const i = order.indexOf(group)
    return i === -1 ? order.length : i
  }
  const groups = [...new Set(active.map((offer) => offer.group))]
  groups.sort((a, b) => rank(a) - rank(b) || (a ?? '').localeCompare(b ?? '', 'it'))

  const sections: OfferSection[] = groups.map((group) => {
    const items = active.filter((offer) => offer.group === group)
    return {
      key: group ?? 'tutte',
      title: group ?? OFFERS_COPY.exclusivesTitle,
      countLabel:
        group === null
          ? `${offersCountLabel(items.length)} · ${OFFERS_COPY.exclusivesNote}`
          : offersCountLabel(items.length),
      expired: false,
      offers: items,
    }
  })
  if (expired.length > 0) {
    sections.push({
      key: 'scadute',
      title: OFFERS_COPY.expiredTitle,
      countLabel: `${offersCountLabel(expired.length)} · ${OFFERS_COPY.expiredNote}`,
      expired: true,
      offers: expired,
    })
  }
  return sections
}

/** Titolo dello stato vuoto: con il sito quando il filtro è attivo. */
export function emptyTitle(type: OfferType, book: string): string {
  const label = OFFER_TYPES.find((t) => t.value === type)?.label.toLowerCase() ?? type
  return book === ALL_BOOKS
    ? `Nessuna offerta di tipo ${label} da mostrare`
    : `Nessuna offerta di tipo ${label} per ${book}`
}

/** La pagina di dettaglio dell'offerta (la guida). */
export function offerHref(offer: Offer): string {
  return `/offerte/${offer.id}`
}
