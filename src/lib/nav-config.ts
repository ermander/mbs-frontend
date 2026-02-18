/**
 * Nav items for authenticated header (RobinOdds-style).
 * Used by Header for dropdowns and mobile nav.
 */

export interface NavLinkItem {
  label: string
  href: string
}

export interface NavDropdownItem {
  label: string
  items: NavLinkItem[]
}

export const authenticatedNavDropdowns: NavDropdownItem[] = [
  {
    label: 'OFFERTE',
    items: [
      { label: 'Bonus di benvenuto', href: '/offerte/bonus-benvenuto' },
      { label: 'Promozioni ricorrenti', href: '/offerte/promozioni' },
      { label: 'Guadagni extra', href: '/offerte/guadagni-extra' },
      { label: 'Canale Telegram', href: '/offerte/telegram' },
    ],
  },
  {
    label: 'STRUMENTI',
    items: [
      { label: 'Oddsmatcher', href: '/strumenti/oddsmatcher' },
      { label: 'Dutcher', href: '/strumenti/dutcher' },
      { label: 'Trimatcher', href: '/strumenti/trimatcher' },
      { label: 'Himatcher', href: '/strumenti/himatcher' },
      { label: 'Targeter', href: '/strumenti/targeter' },
    ],
  },
  {
    label: 'CALCOLATORI',
    items: [
      { label: 'Punta-Banca', href: '/calcolatori/punta-banca' },
      { label: 'Punta-Punta', href: '/calcolatori/punta-punta' },
      { label: 'Dutch-Tool', href: '/calcolatori/dutch-tool' },
      { label: 'Multi-Tool', href: '/calcolatori/multi-tool' },
      { label: 'Condizionato', href: '/calcolatori/condizionato' },
      { label: 'Combo Tool', href: '/calcolatori/combo-tool' },
      { label: 'Converter', href: '/calcolatori/converter' },
      { label: 'Casino', href: '/calcolatori/casino' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Profilo', href: '/account/profilo' },
      { label: 'Agenda dei guadagni', href: '/account/agenda-guadagni' },
      { label: 'Fogli Excel', href: '/account/fogli-excel' },
      { label: 'Area affiliato', href: '/account/affiliato' },
      // Logout is handled as action in Header, not a link
    ],
  },
]

/** Direct links (no dropdown); order: HOME, GUIDE, then dropdowns go in between, then AGENDA, FORUM */
export const authenticatedNavLinksBeforeDropdowns: NavLinkItem[] = [
  { label: 'HOME', href: '/' },
  { label: 'GUIDE', href: '/guide' },
]
export const authenticatedNavLinksAfterDropdowns: NavLinkItem[] = [
  { label: 'AGENDA', href: '/agenda' }, // highlighted
  { label: 'FORUM', href: '/forum' },
]
