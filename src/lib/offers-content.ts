import type { DsBadgeTone } from '@/components/landing/ds-data'
import type { OfferDifficulty, OfferSectionApi, OfferType } from '@/types/offers'

/**
 * Elenco delle offerte dal design «OddWise Offerte» di Claude Design (artifact
 * 7WRKR9sJpAQA8BUmvG2Ndp, ADAPTER_STATUS §14.259): tre tipi (benvenuto, ricorrenti, esclusive),
 * sezioni per gruppo e in fondo le scadute, filtro per sito di scommesse.
 *
 * Dal §14.263 le offerte vengono dal database (GET /offers, lib/offers-api.ts, convertite con
 * offerFromCard); il catalogo d'esempio del design è in lib/offers-sample.ts, solo per i test.
 * Dal §14.345 l'elenco arriva una pagina alla volta (OFFERS_PAGE_SIZE carte): tipo, sito e pagina
 * stanno nell'indirizzo, e ordine dei gruppi, sezioni e conteggi li fa il backend. Dal §14.358 i
 * tre tipi sono tre pagine (/offerte/benvenuto, /offerte/ricorrenti, /offerte/esclusive) invece
 * di un filtro nella stessa pagina.
 *
 * Deviazioni dal design: il filtro si chiama «Sito di scommesse» e non «Bookmaker», e la parola
 * sparisce anche dalla descrizione del benvenuto e dalle note (regola del brand, come sulla
 * landing); gli stati personali («Completata», «In corso», l'interruttore
 * «Nascondi completate» e il pulsante «Completata») restano fuori: dal §14.315 le pagine sono
 * dietro login, ma non c'è ancora dove salvarli.
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
  /** Giorni alla scadenza, per il badge «Scade oggi / domani / tra N giorni». */
  expiresInDays?: number
  /** Data di scadenza (AAAA-MM-GG) di un'offerta già scaduta: la carta va fra le «Scadute». */
  expiredOn?: string
  /**
   * Scaduta anche senza data (forzata dal backoffice, §14.262); senza il campo vale expiredOn.
   * Le offerte dell'API lo portano sempre.
   */
  expired?: boolean
  /**
   * §14.351: carta dell'elenco per gli ospiti che solo un iscritto può aprire: senza logo, col
   * titolo già coperto dal backend, e «Apri la guida» che invita a iscriversi.
   */
  locked?: boolean
}

/**
 * I tre tipi di offerta. Dal §14.358 ognuno ha la sua pagina (/offerte/<tipo>, `offersListHref`)
 * col `title` in testa, e le tre voci stanno nella tendina «Offerte» della barra. La riga di
 * descrizione di ogni tipo che veniva dal design è stata tolta: Emanuele l'ha giudicata inutile.
 */
export const OFFER_TYPES: readonly { value: OfferType; label: string; title: string }[] = [
  { value: 'benvenuto', label: 'Benvenuto', title: 'Offerte di benvenuto' },
  { value: 'ricorrenti', label: 'Ricorrenti', title: 'Offerte ricorrenti' },
  { value: 'esclusive', label: 'Esclusive', title: 'Offerte esclusive' },
]

/** Il tipo di offerta: la sua voce di OFFER_TYPES (etichetta e titolo della pagina). */
export function offerTypeInfo(type: OfferType): (typeof OFFER_TYPES)[number] {
  return OFFER_TYPES.find((t) => t.value === type) ?? OFFER_TYPES[0]
}

/** La radice delle offerte: /offerte da solo rimanda alla pagina del benvenuto (§14.358). */
export const OFFERS_ROOT = '/offerte'

export const ALL_BOOKS = 'all'

/** Offerte per pagina dell'elenco (§14.345). */
export const OFFERS_PAGE_SIZE = 10

/**
 * Il tipo dal parametro ?tipo= dei vecchi indirizzi /offerte?tipo= (fino al §14.357 l'unica pagina
 * dell'elenco, oggi un rimando alla pagina del tipo); il benvenuto se manca o è sconosciuto.
 */
export function parseOfferType(value: string | string[] | undefined): OfferType {
  const v = Array.isArray(value) ? value[0] : value
  return OFFER_TYPES.some((t) => t.value === v) ? (v as OfferType) : 'benvenuto'
}

/** L'offerta con quell'id, null se non c'è. */
export function offerById(offers: readonly Offer[], id: string): Offer | null {
  return offers.find((offer) => offer.id === id) ?? null
}

/** Il sito dal parametro ?sito= (§14.345); ALL_BOOKS se manca o è vuoto. */
export function parseOfferBook(value: string | string[] | undefined): string {
  const v = (Array.isArray(value) ? value[0] : value)?.trim()
  return v ? v : ALL_BOOKS
}

/** La pagina dal parametro ?pagina= (§14.345), da 1; 1 se manca o non è un intero positivo. */
export function parseOffersPage(value: string | string[] | undefined): number {
  const v = Array.isArray(value) ? value[0] : value
  const n = v !== undefined && /^\d{1,6}$/.test(v) ? Number(v) : 1
  return n >= 1 ? n : 1
}

/**
 * La pagina dell'elenco di un tipo (il link «indietro» del dettaglio, le voci della barra), dal
 * §14.345 aperta sul sito e sulla pagina: «Tutti i siti» e la pagina 1 restano fuori
 * dall'indirizzo. Dal §14.358 il tipo è nel percorso (/offerte/benvenuto) e non più in ?tipo=.
 */
export function offersListHref(type: OfferType, book: string = ALL_BOOKS, page = 1): string {
  const query = new URLSearchParams()
  if (book !== ALL_BOOKS) query.set('sito', book)
  if (page > 1) query.set('pagina', String(page))
  const search = query.toString()
  return `${OFFERS_ROOT}/${type}${search ? `?${search}` : ''}`
}

export const OFFERS_COPY = {
  title: 'Offerte',
  bookFilterLabel: 'Sito di scommesse',
  allBooks: 'Tutti i siti',
  profitLabel: 'Profitto stimato',
  variableProfit: 'Variabile',
  difficultyLabel: 'Difficoltà',
  openGuide: 'Apri la guida',
  readGuide: 'Leggi la guida',
  exclusivesTitle: 'Segnalate dagli utenti',
  /** §14.351: le offerte di benvenuto o ricorrenti senza gruppo (quelle del worker). */
  siteOffersTitle: 'Offerte dal sito di scommesse',
  exclusivesNote:
    "offerte personali che il sito di scommesse propone solo ad alcuni utenti; controlla se l'hai ricevuta anche tu",
  expiredTitle: 'Scadute',
  expiredNote: 'le guide restano leggibili',
  emptyDescription:
    'Prova con un altro sito di scommesse o guarda tutte le offerte di questo tipo.',
  emptyAction: 'Mostra tutte',
  responsibleGaming: 'Gioco vietato ai minori di 18 anni. Gioca responsabilmente.',
  loadError: 'Non riusciamo a caricare le offerte in questo momento. Riprova tra qualche minuto.',
  /** §14.345: «1–10 di 23 offerte» sotto l'elenco. */
  pageUnit: 'offerte',
  /** §14.315: mentre OffersLoadError rinnova la sessione e fa rileggere la pagina. */
  loading: 'Carico le offerte…',
  /** §14.351: la versione per chi non è entrato. */
  guestBookFilterHint: 'Iscriviti per filtrare le offerte per sito di scommesse',
  lockedLogoLabel: 'Sito di scommesse visibile agli iscritti',
  signupTitle: 'Sblocca tutte le offerte',
  signupGuideTitle: 'Questa guida è riservata agli iscritti',
  signupDescription:
    "Senza account puoi aprire solo l'offerta di benvenuto di Snai. L'iscrizione è gratuita e sblocca tutte le altre.",
  signupPoints: [
    'Il sito di scommesse di ogni offerta di benvenuto, ricorrente ed esclusiva',
    'Le guide passo passo di ogni offerta',
    'Il filtro per sito di scommesse',
  ],
  signupAction: 'Iscriviti gratis',
  loginAction: 'Ho già un account',
  backToOffers: 'Torna alle offerte',
} as const

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

/**
 * Le voci del filtro per il tipo scelto: «Tutti i siti» e i siti che hanno offerte del tipo (dal
 * backend, già in ordine alfabetico). Il sito scelto resta fra le voci anche se non ne ha più
 * (un indirizzo vecchio), così il menu mostra quello che la pagina sta filtrando.
 */
export function bookOptions(
  books: readonly string[],
  selected: string = ALL_BOOKS,
): { value: string; label: string }[] {
  const names = selected === ALL_BOOKS || books.includes(selected) ? books : [...books, selected]
  return [
    { value: ALL_BOOKS, label: OFFERS_COPY.allBooks },
    ...names.map((name) => ({ value: name, label: name })),
  ]
}

export interface OfferBadge {
  tone: DsBadgeTone
  label: string
}

/**
 * «Scade oggi» / «Scade domani» / «Scade tra N giorni»: la scadenza è una data senza orario
 * (vale fino a mezzanotte italiana), quindi niente «tra 0 giorni» né un'ora inventata.
 */
export function expiresInLabel(days: number): string {
  if (days <= 0) return 'Scade oggi'
  if (days === 1) return 'Scade domani'
  return `Scade tra ${days} giorni`
}

/** Lo stato sulla carta: scaduta, in scadenza, nuova, altrimenti attiva (nell'ordine del design). */
export function offerBadge(offer: Offer): OfferBadge {
  if (isExpired(offer)) return { tone: 'loss', label: 'Scaduta' }
  if (offer.expiresInDays !== undefined) {
    return { tone: 'warning', label: expiresInLabel(offer.expiresInDays) }
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
 * Le sezioni di una pagina (§14.345): le carte della pagina divise nelle sezioni del backend, nel
 * loro ordine (un gruppo per sezione, poi tutte le scadute insieme); il numero accanto al titolo è
 * quello della sezione intera, anche quando continua nella pagina dopo. Sezioni vuote mai.
 *
 * §14.351: le attive senza gruppo sono «Segnalate dagli utenti» solo fra le esclusive; nel
 * benvenuto e nelle ricorrenti (le offerte del worker non hanno gruppo) sono le offerte del sito
 * di scommesse, senza la nota delle offerte personali.
 */
export function pageSections(
  offers: readonly Offer[],
  sections: readonly OfferSectionApi[],
  type: OfferType = 'esclusive',
): OfferSection[] {
  return sections.flatMap((section): OfferSection[] => {
    const items = offers.filter((offer) =>
      section.expired ? isExpired(offer) : !isExpired(offer) && offer.group === section.group,
    )
    if (items.length === 0) return []
    if (section.expired) {
      return [
        {
          key: 'scadute',
          title: OFFERS_COPY.expiredTitle,
          countLabel: `${offersCountLabel(section.count)} · ${OFFERS_COPY.expiredNote}`,
          expired: true,
          offers: items,
        },
      ]
    }
    const exclusives = section.group === null && type === 'esclusive'
    return [
      {
        key: section.group ?? 'tutte',
        title:
          section.group ?? (exclusives ? OFFERS_COPY.exclusivesTitle : OFFERS_COPY.siteOffersTitle),
        countLabel: exclusives
          ? `${offersCountLabel(section.count)} · ${OFFERS_COPY.exclusivesNote}`
          : offersCountLabel(section.count),
        expired: false,
        offers: items,
      },
    ]
  })
}

/** Titolo dello stato vuoto: con il sito quando il filtro è attivo. */
export function emptyTitle(type: OfferType, book: string): string {
  const label = offerTypeInfo(type).label.toLowerCase()
  return book === ALL_BOOKS
    ? `Nessuna offerta di tipo ${label} da mostrare`
    : `Nessuna offerta di tipo ${label} per ${book}`
}

/** La pagina di dettaglio dell'offerta (la guida). */
export function offerHref(offer: Offer): string {
  return `/offerte/${offer.id}`
}
