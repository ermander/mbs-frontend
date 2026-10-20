import type { Offer } from '@/lib/offers-content'
import type { GuideCalloutTone, OfferGuide, OfferType } from '@/types/offers'

/**
 * La guida di un'offerta, cioè la pagina di dettaglio, dal design «OddWise Offerta» di Claude
 * Design (artifact 2Da1SYt8KPmwuS9YfRQuA4, ADAPTER_STATUS §14.260): dati chiave, introduzione,
 * passi numerati, domande frequenti e termini in breve. Dal §14.262 la forma è quella dell'API
 * (types/offers.ts): passi fatti di blocchi, come li scrive l'editor del backoffice.
 *
 * Finché le pagine pubbliche non leggono dall'API (fase 3) il contenuto è quello DI ESEMPIO del
 * design, solo per snai-30. I testi accettano **grassetto** (RichText della pagina). Mai la parola
 * «bookmaker» (regola del brand, test). La discussione del forum del design è uscita dal modello:
 * il forum non esiste.
 */

export interface SampleGuide {
  guide: OfferGuide
  /** Ultimo aggiornamento (AAAA-MM-GG); con l'API viene da updatedAt. */
  updatedOn: string
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

const ODDSMATCHER = '/odds-scanner'
const PUNTA_BANCA = '/calcolatori?expand=punta-banca'

/** La guida d'esempio del design, per id dell'offerta (vedi il commento in testa). */
export const SAMPLE_GUIDES: Readonly<Record<string, SampleGuide>> = {
  'snai-30': {
    updatedOn: '2026-10-18',
    guide: {
      facts: {
        budget: 120,
        time: '45 min, in due momenti',
        minOdds: 'Nessuna',
        depositWithin: '7 giorni dalla registrazione',
      },
      signup: { label: 'Registrati su Snai', url: 'https://www.snai.it/' },
      intro:
        "Snai regala 30 € di bonus cash a chi apre un conto e deposita almeno 60 €. Il bonus vale su tutti i giochi, quindi anche sulle scommesse sportive in singola: lo punti una volta coprendo l'esito opposto sull'exchange e lo trasformi in denaro prelevabile.",
      requirement:
        'Serve un conto su un exchange (Betfair o Betflag) con almeno 90 € di liquidità per le bancate.',
      warning:
        'Hai 7 giorni dalla registrazione per depositare. Dopo, il bonus non viene più accreditato.',
      steps: [
        {
          title: 'Registrati su Snai',
          blocks: [
            {
              type: 'paragraph',
              text: "Apri il conto dal bottone qui sotto e, nel modulo, scegli il bonus «Tutti i giochi fino a 30 €». Carica subito la carta d'identità fronte e retro: senza documento verificato il bonus non arriva.",
            },
            {
              type: 'buttons',
              buttons: [
                { kind: 'external', label: 'Apri il conto su Snai', href: 'https://www.snai.it/' },
              ],
            },
            {
              type: 'callout',
              tone: 'note',
              text: 'Se hai già un conto Snai non puoi fare questa offerta: il bonus è solo per i conti nuovi, uno per persona.',
            },
          ],
        },
        {
          title: 'Deposita 60 €',
          blocks: [
            {
              type: 'paragraph',
              text: 'Entro 7 giorni dalla registrazione, con il metodo che preferisci: tutti qualificano. Bastano 60 € esatti; depositare di più non aumenta il bonus.',
            },
          ],
        },
        {
          title: 'Ricevi il bonus',
          blocks: [
            {
              type: 'paragraph',
              text: 'Se il documento è verificato, i 30 € di bonus cash arrivano entro 6 ore dal deposito. Hai 15 giorni per usarli, su qualsiasi gioco: per noi, una scommessa sportiva in singola. Nessuna quota minima, ma sotto 1,30 il profitto cala.',
            },
          ],
        },
        {
          title: 'Sblocca il bonus con una puntata coperta',
          blocks: [
            {
              type: 'paragraph',
              text: "Il bonus non si preleva: va puntato. Lo punti su Snai e banchi (scommetti il contrario) sull'exchange: qualunque sia il risultato, incassi circa l'80 % dei 30 €.",
            },
            {
              type: 'checklist',
              items: [
                "Apri l'oddsmatcher filtrato su Snai, con quota da 1,30 in su e liquidità di almeno 30 €.",
                'Apri il calcolatore in modalità **Bonus** e inserisci 30 € come puntata.',
                "Controlla che le quote su Snai e sull'exchange siano ancora quelle del calcolatore; se sono cambiate, aggiornale a mano.",
                "Punta i 30 € di bonus su Snai e banca sull'exchange l'importo indicato dal calcolatore.",
              ],
            },
            {
              type: 'buttons',
              buttons: [
                { kind: 'oddsmatcher', label: "Apri l'oddsmatcher su Snai", href: ODDSMATCHER },
                { kind: 'calculator', label: 'Apri il calcolatore bonus', href: PUNTA_BANCA },
              ],
            },
          ],
        },
        {
          title: 'Rendi prelevabile il deposito',
          blocks: [
            {
              type: 'paragraph',
              text: "I 60 € depositati vanno giocati una volta prima di poterli prelevare. Scegli nell'oddsmatcher un evento con rating alto, apri il calcolatore in modalità **Normale**, punta 60 € su Snai e banca sull'exchange l'importo indicato. Perdi pochi centesimi e il deposito torna libero.",
            },
            {
              type: 'callout',
              tone: 'tip',
              text: 'Puoi anche lasciare i 60 € sul conto Snai: ti serviranno per le offerte ricorrenti o come copertura punta–punta con un altro sito di scommesse.',
            },
          ],
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
      terms: {
        rows: [
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
            value:
              '30 € di bonus cash, accreditati entro 6 ore dal deposito a documento verificato',
          },
          { label: 'Validità del bonus', value: "15 giorni dall'accredito, su tutti i giochi" },
          { label: 'Quota minima', value: 'Nessuna' },
          { label: 'Prelievo del deposito', value: 'Dopo averlo giocato una volta' },
        ],
        verifiedOn: '2026-10-18',
        url: 'https://www.snai.it/',
        linkLabel: 'Termini completi su snai.it',
      },
    },
  },
}

export function guideFor(offerId: string): SampleGuide | null {
  return SAMPLE_GUIDES[offerId] ?? null
}
