/**
 * Copy della landing OddWise, ripreso ALLA LETTERA dal mockup approvato
 * (.claude/design/oddwise-handoff/landing-blue.dc.html, renderVals()). Regole del brand:
 * mai la parola "bookmaker" (si dice "sito/siti di scommesse") e nessun sito nominato fuori
 * dall'esempio del calcolatore nel hero; landing-content.test.ts le fa rispettare.
 */

export interface LandingLink {
  href: string
  label: string
}

/** Destinazioni reali dietro le ancore del mockup (#accedi, #registrati). */
export const LANDING_ROUTES = {
  home: '/',
  login: '/login',
  register: '/registrazione',
  promo: '#promo',
  how: '#come',
  matched: '#matched',
  surebet: '#surebet',
  tools: '#strumenti',
  plans: '#piani',
  surebetPlans: '#piani-surebet',
  faq: '#faq',
} as const

export const LANDING_NAV_LINKS: readonly LandingLink[] = [
  { href: LANDING_ROUTES.matched, label: 'Matched Betting' },
  { href: LANDING_ROUTES.surebet, label: 'Surebet' },
  { href: LANDING_ROUTES.tools, label: 'Strumenti' },
  { href: LANDING_ROUTES.plans, label: 'Prezzi' },
  { href: LANDING_ROUTES.faq, label: 'Guide' },
]

export const LANDING_FOOTER_LINKS: readonly LandingLink[] = [
  ...LANDING_NAV_LINKS,
  { href: '/contatti', label: 'Contatti' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/termini', label: 'Termini' },
]

export const BRAND = {
  name: 'OddWise',
  login: 'Accedi',
  signup: 'Iscriviti gratis',
  openMenu: 'Apri il menu',
  closeMenu: 'Chiudi il menu',
} as const

export const HERO = {
  title: 'Guadagna dai bonus dei siti di scommesse, senza alcun rischio!',
  text: 'Il Matched Betting trasforma i bonus dei siti di scommesse in soldi veri, qualunque sia il risultato. Noi ti diamo gli strumenti e le guide, tu pensi solo al profitto!',
  ctaPrimary: 'Guadagna ora i tuoi primi 25€, gratis!',
  ctaSecondary: 'Come funziona in 2 minuti',
} as const

/** L'unico punto della landing in cui compaiono siti di scommesse con il loro nome. */
export const CALCULATOR_EXAMPLE = {
  chip: 'Bonus di benvenuto · Snai',
  guide: 'Guida 1 di 12',
  event: 'Inter – Juventus',
  eventMeta: 'Serie A · domenica 20:45 · Esito 1',
  back: { role: 'PUNTA', site: 'Snai', odds: '2,10', stake: '50,00 €' },
  lay: { role: 'BANCA', site: 'Betfair', odds: '2,14', stake: '49,30 €' },
  outcomes: [
    { label: "Se vince l'Inter", profit: '+25,10 €' },
    { label: 'Se non vince', profit: '+25,10 €' },
  ],
  totalLabel: 'Profitto garantito',
  totalLabelMobile: 'Profitto, qualunque esito',
  total: '+25,10 €',
  decidedBefore: ['deciso prima', "del fischio d'inizio"],
} as const

export const WHY_IT_WORKS = {
  eyebrow: 'PERCHÉ FUNZIONA',
  title: 'Non è fortuna. È matematica.',
  items: [
    {
      title: 'Il sito di scommesse paga per farti giocare',
      text: 'Bonus sport e casinò esistono per attirarti. Noi ti insegniamo a incassarli.',
    },
    {
      title: 'Il risultato non conta',
      text: 'Sui bonus sport copri tutti gli esiti; sui bonus casinò giochi solo dove il vantaggio matematico è dalla tua parte.',
    },
    {
      title: 'Tutto legale, tutto ADM',
      text: 'Solo siti di scommesse con licenza italiana, vincite già al netto delle tasse.',
    },
  ],
} as const

export const PROMO = {
  eyebrow: 'PROMOZIONE DI BENVENUTO',
  title: 'I primi 25€ li guadagni con noi. Gratis.',
  text: "Registrati, apri il conto sul sito di scommesse della promozione con il nostro link e segui la guida passo passo sul bonus di benvenuto. In un'ora hai incassato i tuoi primi 25€. Senza abbonamento, senza carta.",
  cta: 'Inizia la promozione',
  steps: [
    {
      n: '1',
      title: "Crea l'account OddWise",
      text: 'Gratis, in 30 secondi. Nessuna carta.',
      highlight: false,
    },
    {
      n: '2',
      title: 'Apri il conto e prendi il bonus di benvenuto',
      text: 'Dal nostro link, così la guida combacia passo per passo.',
      highlight: false,
    },
    {
      n: '3',
      title: 'Segui la guida e incassa',
      text: "L'oddsmatcher e il calcolatore fanno i conti per te.",
      highlight: true,
    },
  ],
} as const

export const HOW_IT_WORKS = {
  eyebrow: 'COME FUNZIONA',
  title: 'Il matched betting in tre passi',
  steps: [
    {
      n: '01',
      title: 'Prendi il bonus',
      text: 'Ogni sito di scommesse regala bonus per farti giocare: benvenuto, ricariche, promozioni settimanali.',
    },
    {
      n: '02',
      title: 'Copri ogni esito',
      text: "L'oddsmatcher trova l'evento giusto, il calcolatore ti dice quanto puntare da una parte e dall'altra.",
    },
    {
      n: '03',
      title: 'Incassa',
      text: 'Vinca chi vinca, il bonus diventa profitto tuo.',
    },
  ],
} as const

export const METHODS = {
  eyebrow: 'I DUE METODI DI GUADAGNO',
  title: 'Si parte dai bonus. Poi, se vuoi, si fa il salto.',
  matched: {
    eyebrow: 'DA DOVE SI PARTE',
    title: 'Matched Betting',
    text: "Guadagni dai bonus sport e casinò. Rischio zero, un'ora al giorno, tutto guidato.",
    cta: 'Scopri il matched betting',
    href: LANDING_ROUTES.promo,
  },
  surebet: {
    eyebrow: 'QUANDO VUOI FARE IL SALTO',
    title: 'Surebet',
    text: 'Due siti di scommesse si contraddicono sulle quote: punti su entrambi e il profitto è garantito, senza bonus. Scanner web, avvisi Discord, chat di confronto e supporto degli admin.',
    cta: 'Scopri le surebet',
    href: LANDING_ROUTES.surebetPlans,
  },
} as const

export const EARNINGS = {
  eyebrow: 'QUANTO PUOI GUADAGNARE',
  title: 'Numeri realistici, non promesse',
  items: [
    {
      label: 'Bonus di benvenuto',
      value: '500 – 1.000 €',
      note: 'una volta sola, esaurendo i bonus dei 35 siti di scommesse',
    },
    {
      label: 'Bonus ricorrenti',
      value: '200 €+ / mese',
      note: 'ogni mese, con le promozioni che i siti di scommesse ripetono',
    },
    {
      label: 'Surebet',
      value: '500 €+ / mese',
      note: 'senza bonus, in base al capitale e al tempo che dedichi',
    },
  ],
} as const

export const TOOLS = {
  eyebrow: 'GLI STRUMENTI',
  title: 'Tutto quello che serve, in un posto solo',
  items: [
    {
      n: '01',
      title: 'Oddsmatcher',
      text: 'La quota migliore per ogni bonus su 35 siti di scommesse.',
    },
    {
      n: '02',
      title: 'Calcolatori sport',
      text: 'Punta-banca, punta-punta, tripunta, multipla, fun bonus.',
    },
    { n: '03', title: 'Calcolatori casinò', text: 'Bonus slot, Baccarat, Roulette.' },
    { n: '04', title: 'Scanner surebet', text: 'Su web app e Discord, in tempo reale.' },
    {
      n: '05',
      title: 'Profit tracker',
      text: 'Giocate, profitti, conti dei siti di scommesse e saldi wallet.',
    },
    { n: '06', title: 'Bot Telegram', text: 'Ti avvisa quando una giocata si chiude.' },
    {
      n: '07',
      title: 'Guide e forum',
      text: 'Una guida per ogni bonus, una community per ogni dubbio.',
    },
  ],
} as const

export const BETTING_SITES = {
  eyebrow: 'SITI DI SCOMMESSE MONITORATI',
  title: '35 siti di scommesse italiani, quote aggiornate in tempo reale',
  aside: 'Solo licenze ADM',
  logosAlt: 'Loghi dei 35 siti di scommesse monitorati',
} as const

export interface PlanFeature {
  label: string
  included: boolean
}

export interface Plan {
  name: string
  /** Vuoto = nessun badge. */
  badge: string
  price: string
  /** Vuoto = solo il prezzo. */
  period: string
  /** Riga sotto il prezzo: tagline (matched betting) o ROI (surebet). */
  subtitle: string
  /** Card blu profondo con CTA in accento (Premium). */
  highlighted: boolean
  cta: string
  features: readonly PlanFeature[]
}

const f = (label: string, included: boolean): PlanFeature => ({ label, included })

export const MATCHED_BETTING_PLANS = {
  eyebrow: 'PIANI MATCHED BETTING',
  title: 'Inizia gratis. Paga solo quando guadagni.',
  text: 'Con il piano Free fai i primi 25€ senza spendere nulla. Quando vuoi sbloccare tutti i siti di scommesse e le promozioni ricorrenti, il piano Base costa meno di un bonus incassato.',
  plans: [
    {
      name: 'Free',
      badge: '',
      price: '0 €',
      period: 'per sempre',
      subtitle: 'Per guadagnare i tuoi primi 25€ e capire come funziona.',
      highlighted: false,
      cta: 'Inizia gratis',
      features: [
        f('Guida e strumenti per monetizzare gratis la tua prima offerta di benvenuto', true),
        f('Calcolatori punta-banca, punta-punta, tripunta', true),
        f('Guide base: concetti e strumenti', true),
        f('Oddsmatcher completo, 35 siti di scommesse', false),
        f('Guide bonus benvenuto, ricorrenti e avanzate', false),
        f('Forum', false),
        f('Profit tracker e storico giocate', false),
        f('Bot Telegram', false),
      ],
    },
    {
      name: 'Base',
      badge: '',
      price: '9,99 €',
      period: 'al mese',
      subtitle: 'Tutti i siti di scommesse, tutte le promozioni, tutte le guide.',
      highlighted: false,
      cta: 'Scegli Base',
      features: [
        f('Tutto il piano Free', true),
        f('Oddsmatcher completo, 35 siti di scommesse', true),
        f('Calcolatori multipla, fun bonus sport, bonus slot, Baccarat, Roulette', true),
        f('Guide bonus benvenuto, ricorrenti e avanzate', true),
        f('Forum', true),
        f('Profit tracker e storico giocate', false),
        f('Bot Telegram', false),
      ],
    },
    {
      name: 'Premium',
      badge: 'Il più scelto',
      price: '29,99 €',
      period: 'al mese',
      subtitle: 'Si ripaga con una promozione. Tutto tracciato, niente fogli Excel.',
      highlighted: true,
      cta: 'Scegli Premium',
      features: [
        f('Tutto il piano Base', true),
        f('Salvataggio giocate e storico', true),
        f('Profit tracker: profitti, conti dei siti di scommesse, saldi wallet, report', true),
        f('Bot Telegram', true),
        f('App Android e iOS', true),
      ],
    },
  ] as readonly Plan[],
} as const

export const SUREBET_PLANS = {
  eyebrow: 'PIANI SUREBET · AGGIUNTIVI',
  title: 'Vuoi guadagnare di più? Aggiungi le surebet.',
  plans: [
    {
      name: 'Surebet Free',
      badge: '',
      price: '0 €',
      period: '',
      subtitle: "Surebet prematch fino all'1% di ROI",
      highlighted: false,
      cta: 'Prova lo scanner',
      features: [
        f('Scanner web app', true),
        f('Notifiche Discord in tempo reale', false),
        f('Chat di confronto tra utenti', false),
        f('Supporto diretto degli admin', false),
      ],
    },
    {
      name: 'Surebet Base',
      badge: '',
      price: '39,99 €',
      period: 'al mese',
      subtitle: 'Surebet prematch fino al 5% di ROI',
      highlighted: false,
      cta: 'Scegli Surebet Base',
      features: [
        f('Scanner web app', true),
        f('Notifiche Discord in tempo reale', false),
        f('Chat di confronto tra utenti', false),
        f('Supporto diretto degli admin', false),
      ],
    },
    {
      name: 'Surebet Premium',
      badge: 'Per chi fa sul serio',
      price: '89,99 €',
      period: 'al mese',
      subtitle: 'Surebet senza limite di ROI',
      highlighted: true,
      cta: 'Scegli Surebet Premium',
      features: [
        f('Scanner web app', true),
        f('Notifiche Discord in tempo reale', true),
        f('Chat di confronto tra utenti', true),
        f('Supporto diretto degli admin', true),
      ],
    },
  ] as readonly Plan[],
} as const

export const FAQ = {
  eyebrow: 'DOMANDE FREQUENTI',
  title: 'Le cose che chiedono tutti, prima di iniziare',
  items: [
    {
      q: "Cos'è il matched betting?",
      a: 'Una tecnica matematica per trasformare i bonus dei siti di scommesse in profitto: punti su un esito e copri quello opposto, così incassi qualunque cosa succeda.',
    },
    {
      q: 'È legale?',
      a: 'Sì. Usi solo siti di scommesse con licenza ADM e sfrutti promozioni che loro stessi offrono. Le vincite sono già tassate alla fonte.',
    },
    {
      q: 'Posso perdere soldi?',
      a: 'Sui bonus sport copri tutti gli esiti, quindi no. Sui bonus casinò giochi solo dove il vantaggio matematico è tuo: il singolo giro può oscillare, sul totale il valore è positivo.',
    },
    {
      q: 'Quanto tempo serve al giorno?',
      a: "Circa un'ora per i bonus di benvenuto e ricorrenti. Le surebet dipendono da quanto capitale e tempo vuoi dedicare.",
    },
    {
      q: 'Devo capire di sport?',
      a: "No. L'evento lo scegli con i numeri dell'oddsmatcher, non con l'intuito.",
    },
    {
      q: 'Cosa sono le surebet?',
      a: 'Quote in contraddizione tra due siti di scommesse diversi: puntando su entrambi il profitto è garantito, senza bisogno di bonus.',
    },
    {
      q: 'Free, Base o Premium: quale scelgo?',
      a: 'Parti da Free e incassa i primi 25€. Passa a Base quando vuoi tutti i siti di scommesse; a Premium quando vuoi che i profitti si traccino da soli.',
    },
    {
      q: 'Posso disdire quando voglio?',
      a: 'Sì, da un click nel tuo profilo. Nessun vincolo, nessun rinnovo nascosto.',
    },
  ],
} as const

export const FINAL_CTA = {
  title: 'Guadagna i tuoi primi 25€, gratis.',
  text: 'Nessuna carta. Nessun abbonamento. Solo la guida e il tuo primo profitto.',
  cta: 'Inizia gratis',
} as const

export const FOOTER = {
  disclaimer:
    'OddWise non è un sito di scommesse e non raccoglie scommesse: fornisce strumenti, guide e formazione. Il gioco è vietato ai minori di 18 anni e può causare dipendenza patologica. Si applicano i termini e condizioni dei singoli siti di scommesse con licenza ADM.',
} as const
