/**
 * Copy della landing OddWise, ripreso ALLA LETTERA dal design fatto con Claude Design (artifact
 * 6yv6CKdzp9n9Ei2SAWNmwH, schermata «Landing», testi di renderVals(); ADAPTER_STATUS §14.248).
 * Regole del brand: mai la parola «bookmaker» (si dice «sito/siti di scommesse», e la colonna
 * «Bookmaker» del design qui si chiama «Sito di scommesse») e siti nominati solo nelle righe
 * d'esempio dell'oddsmatcher e nell'exchange del calcolatore; landing-content.test.ts le fa
 * rispettare e ricalcola l'esempio del calcolatore con il motore punta/banca. I numeri degli
 * esempi (profitto del primo mese, quote, liquidità, «28 siti di scommesse e 3 exchange») sono
 * quelli del design: da validare prima della pubblicazione.
 */

export interface LandingLink {
  href: string
  label: string
}

/**
 * Destinazioni reali dietro i link del design: le sezioni dell'app (a chi non è autenticato la
 * guard rimanda al login), le rotte di accesso, l'ancora dei prezzi e le pagine pubbliche.
 */
export const LANDING_ROUTES = {
  home: '/',
  login: '/login',
  register: '/registrazione',
  guide: '/guide',
  offerte: '/offerte',
  oddsmatcher: '/odds-scanner',
  calcolatori: '/calcolatori',
  forum: '/forum',
  prezzi: '#prezzi',
  contatti: '/contatti',
  privacy: '/privacy',
  termini: '/termini',
  cookie: '/cookie',
} as const

export const LANDING_NAV_LINKS: readonly LandingLink[] = [
  { href: LANDING_ROUTES.guide, label: 'Guide' },
  { href: LANDING_ROUTES.offerte, label: 'Offerte' },
  { href: LANDING_ROUTES.oddsmatcher, label: 'Oddsmatcher' },
  { href: LANDING_ROUTES.calcolatori, label: 'Calcolatori' },
  { href: LANDING_ROUTES.forum, label: 'Forum' },
]

/**
 * Il piè di pagina del design elenca anche «Matched betting», «Surebet» e «Strumenti» senza una
 * destinazione: qui restano solo i link che portano a una pagina, in tre colonne (sezioni
 * dell'app, prezzi e contatti, pagine legali).
 */
export const LANDING_FOOTER_COLUMNS: readonly (readonly LandingLink[])[] = [
  LANDING_NAV_LINKS,
  [
    { href: LANDING_ROUTES.prezzi, label: 'Prezzi' },
    { href: LANDING_ROUTES.contatti, label: 'Contatti' },
  ],
  [
    { href: LANDING_ROUTES.privacy, label: 'Privacy' },
    { href: LANDING_ROUTES.termini, label: 'Termini' },
    { href: LANDING_ROUTES.cookie, label: 'Cookie' },
  ],
]

export const LANDING_FOOTER_LINKS: readonly LandingLink[] = LANDING_FOOTER_COLUMNS.flat()

export const BRAND = {
  name: 'OddWise',
  tagline: 'Il matched betting, spiegato bene.',
  login: 'Accedi',
  signup: 'Inizia gratis',
  openMenu: 'Apri il menu',
  closeMenu: 'Chiudi il menu',
} as const

export const HERO = {
  /** Il titolo in tre parti: la seconda è sottolineata con l'accento. */
  titleBefore: 'Guadagna dai bonus dei siti di scommesse, ',
  titleMark: 'senza scommettere',
  titleAfter: ' davvero.',
  text: 'Con il matched betting copri tutti gli esiti di un evento: qualunque cosa succeda, il bonus resta tuo. Guide passo-passo, oddsmatcher e calcolatori, tutto in italiano.',
  ctaPrimary: 'Apri la prima guida',
  ctaSecondary: "Vai all'oddsmatcher",
  reassurance: 'Solo siti di scommesse con licenza ADM. Profitto matematico se segui i passi.',
  /** La card accanto al titolo: un esempio del design, non un risultato documentato. */
  estimate: {
    title: 'Profitto stimato del primo mese',
    profitLabel: 'Offerte di benvenuto',
    profit: 412.6,
    timeLabel: 'Tempo necessario',
    time: '6 h',
    note: 'Con un deposito iniziale di 50 € e 8 offerte completate. Il conto lo fa il tracker.',
  },
} as const

export const HOW_IT_WORKS = {
  title: 'Come funziona, in quattro passi',
  steps: [
    {
      title: 'Registrati e deposita 10 €',
      description: 'Usa il link della guida: il bonus si attiva da solo.',
    },
    {
      title: "Trova la partita nell'oddsmatcher",
      description: 'Cerca un rating sopra il 95 %.',
    },
    {
      title: "Punta dal sito di scommesse e banca sull'exchange",
      description: 'Il calcolatore ti dice quanto bancare, al centesimo.',
    },
    {
      title: 'Ripeti con la free bet',
      description: 'Qui arriva il profitto. Segnala nel tracker come completata.',
    },
  ],
  callout: {
    title: 'Perché funziona',
    text: "Puntata (la scommessa dal sito di scommesse) e bancata (la scommessa contraria sull'exchange) si coprono a vicenda: qualunque sia il risultato, perdi solo pochi centesimi sulla qualificante e incassi la free bet. Nessuna previsione, nessun rischio sportivo.",
  },
} as const

export interface OddsmatcherRow {
  id: number
  event: string
  meta: string
  market: string
  site: string
  back: number
  exchange: string
  lay: number
  liquidity: number
  rating: number
}

/** Le cinque righe d'esempio del design, già ordinate per rating. */
export const ODDSMATCHER_ROWS: readonly OddsmatcherRow[] = [
  {
    id: 1,
    event: 'Inter – Juventus',
    meta: 'Serie A · oggi 20:45',
    market: '1',
    site: 'Bet365',
    back: 2.1,
    exchange: 'Betfair',
    lay: 2.14,
    liquidity: 1240,
    rating: 97.4,
  },
  {
    id: 3,
    event: 'Atalanta – Fiorentina',
    meta: 'Serie A · dom 15:00',
    market: '1',
    site: 'Sisal',
    back: 1.85,
    exchange: 'Betflag',
    lay: 1.9,
    liquidity: 2100,
    rating: 96.1,
  },
  {
    id: 2,
    event: 'Napoli – Roma',
    meta: 'Serie A · dom 18:00',
    market: 'X',
    site: 'Snai',
    back: 3.4,
    exchange: 'Betfair',
    lay: 3.55,
    liquidity: 380,
    rating: 95.2,
  },
  {
    id: 5,
    event: 'Real Madrid – Betis',
    meta: 'LaLiga · sab 21:00',
    market: '1',
    site: 'Bet365',
    back: 1.4,
    exchange: 'Betfair',
    lay: 1.46,
    liquidity: 4800,
    rating: 94.6,
  },
  {
    id: 4,
    event: 'Milan – Lazio',
    meta: 'Serie A · dom 20:45',
    market: '2',
    site: 'Goldbet',
    back: 4.5,
    exchange: 'Betfair',
    lay: 4.9,
    liquidity: 95,
    rating: 91.3,
  },
]

/** L'unico punto della landing, con l'exchange del calcolatore, in cui i siti compaiono con il loro nome. */
export const ODDSMATCHER = {
  title: "L'oddsmatcher, adesso",
  cta: "Apri l'oddsmatcher",
  caption: 'Le cinque coppie con il rating più alto in questo momento',
  columns: {
    event: 'Evento',
    market: 'Esito',
    site: 'Sito di scommesse',
    back: 'Quota puntata',
    exchange: 'Exchange',
    lay: 'Quota bancata',
    liquidity: 'Liquidità',
    rating: 'Rating',
  },
  calculate: 'Calcola',
  rows: ODDSMATCHER_ROWS,
} as const

export const CALCULATOR = {
  title: 'Il calcolatore ti dice quanto bancare, al centesimo',
  text: "Inserisci le due quote e la commissione dell'exchange. Il riquadro mostra un solo numero da copiare e il profitto per ciascun esito.",
  cta: 'Prova il calcolatore',
  /**
   * Puntata qualificante di 10 € a 2,10, bancata a 2,14 su Betfair con il 5 % di commissione.
   * Bancata, responsabilità e profitti escono da lib/calculators/punta-banca con la bancata
   * arrotondata ai 5 centesimi come nel calcolatore vero (il test li ricontrolla); il design
   * mostrava 9,86 / 11,24 / −0,36, che non tornavano.
   */
  example: {
    back: { stake: 10, odds: 2.1 },
    lay: { odds: 2.14, exchange: 'Betfair', commissionPercent: 5 },
    mainLabel: 'Banca',
    layStake: 10.05,
    liabilityLabel: 'Responsabilità',
    liability: 11.46,
    commissionLabel: 'Commissione',
    commission: '5 %',
    outcomes: [
      { label: 'Vince al sito di scommesse', profit: -0.46 },
      { label: "Vince all'exchange", profit: -0.45 },
    ],
    note: 'Puntata qualificante di 10 € a 2,10 · commissione 5 %',
  },
} as const

export const PRICING = {
  title: 'Prezzi',
  text: "Oggi OddWise è gratuito, per intero. Tutte le guide, l'oddsmatcher, i calcolatori, il tracker e il forum, senza carta di credito.",
  text2: "In futuro l'accesso completo agli strumenti diventerà a pagamento.",
  plan: {
    name: 'Accesso completo',
    badge: 'Gratuito',
    price: '0 €',
    priceNote: 'finché resta gratuito',
    features: [
      'Guide a tutte le offerte di benvenuto e ricorrenti',
      'Oddsmatcher su 28 siti di scommesse e 3 exchange',
      "Calcolatori e tracker dell'attività",
      'Forum con moderatori',
    ],
    cta: 'Inizia gratis',
    caption: 'Nessuna carta richiesta.',
  },
} as const

export const FAQ = {
  title: 'Domande frequenti',
  items: [
    {
      q: 'È legale?',
      a: 'Sì. Usi solo siti di scommesse ed exchange con licenza ADM e sfrutti le loro promozioni nei termini previsti. Le vincite da gioco non si dichiarano.',
    },
    {
      q: 'Devo capire di calcio?',
      a: 'No. Non fai pronostici: copri tutti gli esiti. Conta solo il rapporto tra le due quote, e lo misura il rating.',
    },
    {
      q: 'Quanto serve per iniziare?',
      a: "Un deposito da 10 € sul sito di scommesse e una liquidità di 20–30 € sull'exchange per la bancata. Il deposito torna sul tuo conto.",
    },
    {
      q: 'Posso perdere soldi?',
      a: 'Sulla puntata qualificante perdi pochi centesimi per scelta. Il rischio vero è sbagliare un passo: per questo ogni guida li elenca e il calcolatore fa il conto.',
    },
  ],
} as const

export type TrustIcon = 'shield-check' | 'calculator' | 'book-open'

export const TRUST: {
  readonly items: readonly { icon: TrustIcon; title: string; text: string }[]
} = {
  items: [
    {
      icon: 'shield-check',
      title: 'Solo siti di scommesse con licenza ADM',
      text: 'Ogni guida riguarda operatori autorizzati in Italia. Nessun sito estero.',
    },
    {
      icon: 'calculator',
      title: 'Aritmetica, non pronostici',
      text: 'Il profitto è matematico se segui i passi. Non serve capire di calcio.',
    },
    {
      icon: 'book-open',
      title: 'Guide gratuite, in italiano',
      text: 'Ogni offerta spiegata passo-passo, con i termini chiariti la prima volta che compaiono.',
    },
  ],
}

export const FOOTER = {
  disclaimer:
    'OddWise non è un sito di scommesse e non raccoglie scommesse: fornisce strumenti, guide e formazione. Il gioco è vietato ai minori di 18 anni e può causare dipendenza patologica. Si applicano i termini e condizioni dei singoli siti di scommesse con licenza ADM.',
} as const
