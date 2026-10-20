import type { Offer } from '@/lib/offers-content'
import type { GuideCalloutTone, OfferType } from '@/types/offers'

/**
 * La guida di un'offerta, cioè la pagina di dettaglio, dal design «OddWise Offerta» di Claude
 * Design (artifact 2Da1SYt8KPmwuS9YfRQuA4, ADAPTER_STATUS §14.260): dati chiave, introduzione,
 * passi numerati, domande frequenti e termini in breve. Dal §14.262 la forma è quella dell'API
 * (types/offers.ts): passi fatti di blocchi, come li scrive l'editor del backoffice.
 *
 * Dal §14.263 le guide vengono dal database con l'offerta (GET /offers/:slug); quella d'esempio
 * del design è in lib/offers-sample.ts. I testi accettano **grassetto** (RichText della pagina).
 * Mai la parola «bookmaker» (regola del brand, test). La discussione del forum del design è
 * uscita dal modello: il forum non esiste.
 */

export const GUIDE_COPY = {
  back: 'Offerte',
  profit: 'Profitto stimato',
  budget: 'Budget necessario',
  time: 'Tempo',
  difficulty: 'Difficoltà',
  minOdds: 'Quota minima',
  depositWithin: 'Deposito entro',
  faqTitle: 'Domande frequenti',
  termsTitle: 'Termini del sito di scommesse, in breve',
  termsNote: 'I termini possono cambiare: fa fede la pagina del sito di scommesse.',
  termsLinkFallback: 'Termini completi',
  stepsNav: 'I passi',
  missingGuide:
    'La guida passo passo di questa offerta è in preparazione. Intanto trovi le altre offerte nella pagina delle offerte.',
  backToOffers: 'Torna alle offerte',
  expiredNote: (date: string) =>
    `Questa offerta è scaduta il ${date}: la guida resta leggibile, ma il bonus non si può più ottenere.`,
} as const

export const CALLOUT_TITLES: Record<GuideCalloutTone, string> = {
  note: 'Nota',
  tip: 'Consiglio',
  warning: 'Attenzione',
  danger: 'Errore comune',
}

const TYPE_PHRASE: Record<OfferType, string> = {
  benvenuto: 'Offerta di benvenuto',
  ricorrenti: 'Offerta ricorrente',
  esclusive: 'Offerta esclusiva',
}

const NUMBER_WORDS = [
  'zero',
  'uno',
  'due',
  'tre',
  'quattro',
  'cinque',
  'sei',
  'sette',
  'otto',
  'nove',
  'dieci',
]

/** "Come si fa, in cinque passi" (in cifre oltre il dieci). */
export function stepsTitle(count: number): string {
  if (count === 1) return 'Come si fa, in un passo'
  return `Come si fa, in ${NUMBER_WORDS[count] ?? count} passi`
}

/** "Snai · Offerta di benvenuto · Aggiornata il 18 ottobre 2026" (senza guida, senza la data). */
export function guideMetaLine(offer: Offer, updatedOn?: string): string {
  const parts: string[] = [offer.bookName, TYPE_PHRASE[offer.type]]
  if (updatedOn) parts.push(`Aggiornata il ${formatLongDate(updatedOn)}`)
  return parts.join(' · ')
}

const longDate = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "2026-10-18" → "18 ottobre 2026" */
export function formatLongDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`))
}

/** L'ancora del passo n (da 1): #passo-1 … */
export function stepAnchor(n: number): string {
  return `passo-${n}`
}

/** Spezza un testo in parti normali e **grassetto**, per la pagina. */
export function richTextParts(text: string): { text: string; strong: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? { text: part.slice(2, -2), strong: true }
        : { text: part, strong: false },
    )
}
