/**
 * Offerte e guide come le scrive il backoffice e le restituisce l'API (backend §14.261,
 * resources/offers/offer.interface.ts): stessa forma, nomi uguali. I testi accettano **grassetto**
 * e nient'altro; la pagina li mostra come testo, mai come HTML.
 */

export type OfferType = 'benvenuto' | 'ricorrenti' | 'esclusive'
export type OfferDifficulty = 'Facile' | 'Media' | 'Difficile'
export type OfferVisibility = 'draft' | 'published' | 'hidden'
export type ExpiryOverride = 'active' | 'expired'
export type GuideCalloutTone = 'note' | 'tip' | 'warning' | 'danger'
/** external: http(s) in una scheda nuova; gli altri sono percorsi del sito (oddsmatcher e calcolatore con la loro icona). */
export type GuideButtonKind = 'external' | 'oddsmatcher' | 'calculator' | 'link'

export interface GuideButton {
  kind: GuideButtonKind
  label: string
  href: string
}

export type GuideBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'checklist'; items: string[] }
  | { type: 'callout'; tone: GuideCalloutTone; text: string }
  | { type: 'image'; src: string; alt: string; caption: string }
  | { type: 'buttons'; buttons: GuideButton[] }

export type GuideBlockType = GuideBlock['type']

export interface GuideStep {
  title: string
  blocks: GuideBlock[]
}

export interface OfferGuide {
  facts: {
    /** Euro che servono sui conti; null = non indicato. */
    budget: number | null
    time: string
    minOdds: string
    depositWithin: string
  }
  /** Il pulsante principale «Registrati su …»; null = nessuno. */
  signup: { label: string; url: string } | null
  intro: string
  requirement: string
  warning: string
  steps: GuideStep[]
  faq: { question: string; answer: string }[]
  terms: {
    rows: { label: string; value: string }[]
    /** AAAA-MM-GG */
    verifiedOn: string | null
    url: string | null
    linkLabel: string
  }
}

/** Il corpo di POST e PUT /backoffice/offers (la visibilità ha la sua rotta). */
export interface OfferInput {
  slug: string
  type: OfferType
  groupLabel: string | null
  bookmakerSlug: string
  bookmakerName: string
  title: string
  profit: number | null
  difficulty: OfferDifficulty
  isNew: boolean
  /** Ultimo giorno valido, AAAA-MM-GG; null = senza data. */
  expiresOn: string | null
  expiryOverride: ExpiryOverride | null
  sortOrder: number
  guide: OfferGuide | null
}

/** Una carta dell'elenco pubblico (GET /offers). */
export interface OfferCardApi {
  slug: string
  type: OfferType
  groupLabel: string | null
  bookmakerSlug: string
  bookmakerName: string
  title: string
  profit: number | null
  difficulty: OfferDifficulty
  isNew: boolean
  expiresOn: string | null
  expired: boolean
  /** Giorni a expiresOn (0 = ultimo giorno), null senza data o se scaduta. */
  daysLeft: number | null
  hasGuide: boolean
  sortOrder: number
}

/** Una sezione dell'elenco pubblico (§14.345): un gruppo delle attive, o tutte le scadute insieme. */
export interface OfferSectionApi {
  /** Il gruppo; null per le scadute e per le attive senza gruppo (le esclusive). */
  group: string | null
  expired: boolean
  /** Offerte della sezione su tutte le pagine, non solo su questa. */
  count: number
}

/** Una pagina dell'elenco pubblico (GET /offers?page=, §14.345). */
export interface OfferCardPageApi {
  /** Al massimo `limit` carte, nell'ordine di `sections`. */
  offers: OfferCardApi[]
  /** Offerte del tipo e del sito, su tutte le pagine. */
  total: number
  /** La pagina servita: oltre l'ultima il backend serve l'ultima. */
  page: number
  limit: number
  /** Tutte le sezioni del tipo e del sito, nell'ordine della pagina. */
  sections: OfferSectionApi[]
  /** Le attive per tipo, di tutti i siti: i numeri sulle schede. */
  activeByType: Record<OfferType, number>
  /** I siti con un'offerta pubblicata del tipo, scadute comprese: le voci del filtro. */
  books: string[]
}

/**
 * §14.351: una carta dell'elenco per chi non è entrato (GET /offers/free/page) che solo un
 * iscritto può aprire: quanto vale e quanto è difficile, il titolo con i nomi dei siti coperti da
 * asterischi; niente slug, sito, logo o data (backend resources/offers/free-offers.ts).
 */
export interface LockedOfferCardApi {
  locked: true
  type: OfferType
  groupLabel: string | null
  title: string
  profit: number | null
  difficulty: OfferDifficulty
  isNew: boolean
  expired: boolean
  daysLeft: number | null
}

/** §14.351: una carta dell'elenco per gli ospiti: il benvenuto di Snai intero, le altre chiuse. */
export type FreeOfferCardApi = (OfferCardApi & { locked: false }) | LockedOfferCardApi

/** §14.351: una pagina dell'elenco per gli ospiti: come quella degli iscritti, senza siti nel filtro. */
export interface FreeOfferCardPageApi extends Omit<OfferCardPageApi, 'offers'> {
  offers: FreeOfferCardApi[]
}

/** Il dettaglio pubblico (GET /offers/:slug). */
export interface OfferDetailApi extends OfferCardApi {
  guide: OfferGuide | null
  updatedAt: string
}

/** La riga del backoffice (GET /backoffice/offers). */
export interface OfferAdmin extends OfferDetailApi {
  id: string
  visibility: OfferVisibility
  expiryOverride: ExpiryOverride | null
  publishedAt: string | null
  createdAt: string
}
