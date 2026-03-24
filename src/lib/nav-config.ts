/**
 * Nav items for authenticated header (RobinOdds-style).
 * Used by Header for dropdowns and mobile nav.
 */

import { profitTrackerNavItems } from '@/components/profit-tracker/profit-tracker-nav'
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
    label: 'BONUS',
    items: [
      { label: 'Bonus di benvenuto', href: '/offerte/bonus-benvenuto' },
      { label: 'Bonus ricorrenti', href: '/offerte/promozioni' },
    ],
  },
  {
    label: 'STRUMENTI ONLINE',
    items: [
      { label: 'Oddsmatcher', href: '/oddsmatcher' },
      { label: 'Dutcher', href: '/dutcher' },
      { label: 'Trimatcher', href: '/trimatcher' },
      { label: 'Targeter', href: '/targeter' },
    ],
  },
  {
    label: 'STRUMENTI OFFLINE',
    items: [
      { label: 'Punta-Banca', href: '/calcolatori/punta-banca' },
      { label: 'Punta-Punta', href: '/calcolatori/punta-punta' },
      { label: 'Tri-Punta', href: '/calcolatori/tri-punta' },
      { label: 'Multi-Tool', href: '/calcolatori/multi-tool' },
      { label: 'Condizionato', href: '/calcolatori/condizionato' },
      { label: 'Combo Tool', href: '/calcolatori/combo-tool' },
      { label: 'Converter', href: '/calcolatori/converter' },
      { label: 'Casino', href: '/calcolatori/casino' },
    ],
  },
  {
    label: 'DASHBOARD',
    items: [
      { label: 'Dashboard', href: '/profit-tracker/dashboard' },
      { label: 'Giocate', href: '/profit-tracker/giocate' },
      { label: 'Archivio', href: '/profit-tracker/archivio' },
      { label: 'Gestione Conti', href: '/profit-tracker/gestione-conti' },
      { label: 'Book personali', href: '/profit-tracker/book-personali' },
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
  { label: 'GUIDE', href: '/guide' },
]
export const authenticatedNavLinksAfterDropdowns: NavLinkItem[] = []
