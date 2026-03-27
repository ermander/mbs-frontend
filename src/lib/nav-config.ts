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
    label: 'STRUMENTI OFFLINE',
    items: [
      { label: 'Punta-Banca', href: '/calcolatori/punta-banca' },
      { label: 'Punta-Punta', href: '/calcolatori/punta-punta' },
      { label: 'Tri-Punta', href: '/calcolatori/tri-punta' },
      // { label: 'Multi-Tool', href: '/calcolatori/multi-tool' },
      // { label: 'Condizionato', href: '/calcolatori/condizionato' },
      // { label: 'Combo Tool', href: '/calcolatori/combo-tool' },
      // { label: 'Converter', href: '/calcolatori/converter' },
      // { label: 'Casino', href: '/calcolatori/casino' },
    ],
  },
  {
    label: 'DASHBOARD',
    items: [
      { label: 'Dashboard', href: '/profit-tracker/dashboard' },
      { label: 'Giocate', href: '/profit-tracker/giocate' },
      { label: 'Archivio', href: '/profit-tracker/archivio' },
      { label: 'Gestione Conti', href: '/profit-tracker/gestione-conti' },
      { label: 'Impostazioni', href: '/profit-tracker/book-personali' },
      { label: 'Promemoria', href: '/profit-tracker/promemoria' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'Profilo', href: '/account/profilo' },
      // Logout is handled as action in Header, not a link
    ],
  },
]

/** Direct links (no dropdown); order: HOME, GUIDE, then dropdowns go in between, then AGENDA, FORUM */
export const authenticatedNavLinksBeforeDropdowns: NavLinkItem[] = [
  { label: 'HOME', href: '/' },
  { label: 'ODDS SCANNER', href: '/odds-scanner' },
]
export const authenticatedNavLinksAfterDropdowns: NavLinkItem[] = []
