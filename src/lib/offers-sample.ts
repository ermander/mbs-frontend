import type { Offer, OfferDifficulty, OfferType } from '@/lib/offers-content'
import type { OfferGuide } from '@/types/offers'

/**
 * I dati d'esempio dei design «OddWise Offerte» e «OddWise Offerta» (§14.259-14.260): 28 offerte
 * e la guida Snai. Dal §14.263 le pagine leggono il database e questi restano per i test (forme,
 * regole del brand, sezioni) e come sorgente di smoke/offers/snai-30-draft.sql, la prima guida da
 * copiare nel DB come bozza. Non vanno importati dalle pagine.
 */

export interface SampleGuide {
  guide: OfferGuide
  /** Ultimo aggiornamento (AAAA-MM-GG); con l'API viene da updatedAt. */
  updatedOn: string
}

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
