import type { Offer, OfferType } from '@/lib/offers-content'

/**
 * La guida di un'offerta, cioè la pagina di dettaglio, dal design «OddWise Offerta» di Claude
 * Design (artifact 2Da1SYt8KPmwuS9YfRQuA4, ADAPTER_STATUS §14.260): dati chiave, introduzione,
 * passi numerati, domande frequenti, termini in breve e la discussione del forum.
 *
 * Come il catalogo di offers-content, il contenuto è quello DI ESEMPIO del design e c'è solo per
 * snai-30: le altre offerte mostrano la testata con «Guida in preparazione». I testi accettano
 * **grassetto** (RichText della pagina). Mai la parola «bookmaker» (regola del brand, test):
 * «Termini del bookmaker» e le due frasi che la usavano dicono «sito di scommesse».
 */

export type GuideCalloutTone = 'note' | 'tip' | 'warning' | 'danger'

export interface GuideCallout {
  tone: GuideCalloutTone
  text: string
}

/** Un pulsante dentro un passo: l'icona viene dal tipo (link esterno, oddsmatcher, calcolatore). */
export interface GuideAction {
  kind: 'external' | 'oddsmatcher' | 'calculator'
  label: string
  href: string
}

export interface GuideStep {
  title: string
  body: string
  checklist?: string[]
  actions?: GuideAction[]
  callout?: GuideCallout
}

export interface ForumThread {
  title: string
  author: string
  category: string
  replies: number
  lastActivity: string
  href: string
}

export interface OfferGuide {
  offerId: string
  /** Ultimo aggiornamento della guida (AAAA-MM-GG). */
  updatedOn: string
  budget: number
  time: string
  minOdds: string
  depositWithin: string
  signupLabel: string
  signupUrl: string
  intro: string
  requirement: string
  warning?: string
  steps: GuideStep[]
  faq: { question: string; answer: string }[]
  terms: { label: string; value: string }[]
  termsVerifiedOn: string
  termsUrl: string
  termsLinkLabel: string
  forumThread?: ForumThread
}

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
  forumTitle: 'Ne parliamo nel forum',
  forumIntro:
    'Dubbi su un passo o quote che non tornano: chiedi nella discussione dedicata, risponde la community e un moderatore.',
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

const ODDSMATCHER = '/odds-scanner'
const PUNTA_BANCA = '/calcolatori?expand=punta-banca'

/** Le guide d'esempio del design, per id dell'offerta (vedi il commento in testa). */
export const SAMPLE_GUIDES: Readonly<Record<string, OfferGuide>> = {
  'snai-30': {
    offerId: 'snai-30',
    updatedOn: '2026-10-18',
    budget: 120,
    time: '45 min, in due momenti',
    minOdds: 'Nessuna',
    depositWithin: '7 giorni dalla registrazione',
    signupLabel: 'Registrati su Snai',
    signupUrl: 'https://www.snai.it/',
    intro:
      "Snai regala 30 € di bonus cash a chi apre un conto e deposita almeno 60 €. Il bonus vale su tutti i giochi, quindi anche sulle scommesse sportive in singola: lo punti una volta coprendo l'esito opposto sull'exchange e lo trasformi in denaro prelevabile.",
    requirement:
      'Serve un conto su un exchange (Betfair o Betflag) con almeno 90 € di liquidità per le bancate.',
    warning:
      'Hai 7 giorni dalla registrazione per depositare. Dopo, il bonus non viene più accreditato.',
    steps: [
      {
        title: 'Registrati su Snai',
        body: "Apri il conto dal bottone qui sotto e, nel modulo, scegli il bonus «Tutti i giochi fino a 30 €». Carica subito la carta d'identità fronte e retro: senza documento verificato il bonus non arriva.",
        actions: [
          { kind: 'external', label: 'Apri il conto su Snai', href: 'https://www.snai.it/' },
        ],
        callout: {
          tone: 'note',
          text: 'Se hai già un conto Snai non puoi fare questa offerta: il bonus è solo per i conti nuovi, uno per persona.',
        },
      },
      {
        title: 'Deposita 60 €',
        body: 'Entro 7 giorni dalla registrazione, con il metodo che preferisci: tutti qualificano. Bastano 60 € esatti; depositare di più non aumenta il bonus.',
      },
      {
        title: 'Ricevi il bonus',
        body: 'Se il documento è verificato, i 30 € di bonus cash arrivano entro 6 ore dal deposito. Hai 15 giorni per usarli, su qualsiasi gioco: per noi, una scommessa sportiva in singola. Nessuna quota minima, ma sotto 1,30 il profitto cala.',
      },
      {
        title: 'Sblocca il bonus con una puntata coperta',
        body: "Il bonus non si preleva: va puntato. Lo punti su Snai e banchi (scommetti il contrario) sull'exchange: qualunque sia il risultato, incassi circa l'80 % dei 30 €.",
        checklist: [
          "Apri l'oddsmatcher filtrato su Snai, con quota da 1,30 in su e liquidità di almeno 30 €.",
          'Apri il calcolatore in modalità **Bonus** e inserisci 30 € come puntata.',
          "Controlla che le quote su Snai e sull'exchange siano ancora quelle del calcolatore; se sono cambiate, aggiornale a mano.",
          "Punta i 30 € di bonus su Snai e banca sull'exchange l'importo indicato dal calcolatore.",
        ],
        actions: [
          { kind: 'oddsmatcher', label: "Apri l'oddsmatcher su Snai", href: ODDSMATCHER },
          { kind: 'calculator', label: 'Apri il calcolatore bonus', href: PUNTA_BANCA },
        ],
      },
      {
        title: 'Rendi prelevabile il deposito',
        body: "I 60 € depositati vanno giocati una volta prima di poterli prelevare. Scegli nell'oddsmatcher un evento con rating alto, apri il calcolatore in modalità **Normale**, punta 60 € su Snai e banca sull'exchange l'importo indicato. Perdi pochi centesimi e il deposito torna libero.",
        callout: {
          tone: 'tip',
          text: 'Puoi anche lasciare i 60 € sul conto Snai: ti serviranno per le offerte ricorrenti o come copertura punta–punta con un altro sito di scommesse.',
        },
      },
    ],
    faq: [
      {
        question: 'Il bonus ha una scadenza?',
        answer:
          "Sì: 15 giorni dall'accredito. Passati quelli, il bonus non usato sparisce. Il deposito resta tuo.",
      },
      {
        question: 'Posso puntare il bonus su una multipla?',
        answer:
          "Puoi, ma non conviene: con una singola copri un solo esito sull'exchange e il profitto è certo. Con una multipla la copertura diventa complicata e costosa.",
      },
      {
        question: 'E se il documento non viene verificato in tempo?',
        answer:
          "Il bonus arriva dopo la verifica, non dopo il deposito. Se passano più di 48 ore, scrivi all'assistenza Snai dalla chat del sito: di solito risolvono in giornata.",
      },
      {
        question: 'Devo per forza bancare su Betfair?',
        answer:
          'No, va bene qualsiasi exchange. Cambia solo la commissione, che il calcolatore tiene in conto: Betfair 4,5 %, Betflag 5 %.',
      },
    ],
    terms: [
      {
        label: 'A chi è rivolta',
        value: 'Nuovi clienti maggiorenni residenti in Italia, un conto per persona',
      },
      {
        label: 'Deposito',
        value: 'Almeno 60 € entro 7 giorni dalla registrazione, con qualunque metodo',
      },
      {
        label: 'Bonus',
        value: '30 € di bonus cash, accreditati entro 6 ore dal deposito a documento verificato',
      },
      { label: 'Validità del bonus', value: "15 giorni dall'accredito, su tutti i giochi" },
      { label: 'Quota minima', value: 'Nessuna' },
      { label: 'Prelievo del deposito', value: 'Dopo averlo giocato una volta' },
    ],
    termsVerifiedOn: '2026-10-18',
    termsUrl: 'https://www.snai.it/',
    termsLinkLabel: 'Termini completi su snai.it',
    forumThread: {
      title: 'Snai, deposita 60 € e ricevi 30 €: domande e risposte',
      author: 'Giulia M.',
      category: 'Offerte',
      replies: 42,
      lastActivity: '2 h fa',
      href: '/forum',
    },
  },
}

export function guideFor(offerId: string): OfferGuide | null {
  return SAMPLE_GUIDES[offerId] ?? null
}
