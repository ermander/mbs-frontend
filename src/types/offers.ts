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
