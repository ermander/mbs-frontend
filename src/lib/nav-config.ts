/**
 * Nav items for authenticated header (RobinOdds-style).
 * Used by Header for dropdowns and mobile nav.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Search,
  Radar,
  Calculator,
  BarChart3,
  ListChecks,
  Archive,
  Wallet,
  BookOpen,
  Bell,
  Gift,
  MessageSquare,
  User,
  ShieldCheck,
} from 'lucide-react'

import type { UserRole } from '@/services/api/auth-client'

export interface NavLinkItem {
  label: string
  href: string
}

export interface NavDropdownItem {
  label: string
  items: NavLinkItem[]
}

export interface AuthSidebarNavItem {
  label: string
  /** Omesso per voci-gruppo (solo figli navigabili) */
  href?: string
  icon: LucideIcon
  section?: string
  /** Se presente, la voce viene mostrata solo agli utenti con quel ruolo */
  requiresRole?: UserRole
  /** Se presente, la voce è un gruppo espandibile con sotto-voci */
  children?: NavLinkItem[]
}

export const authSidebarNav: AuthSidebarNavItem[] = [
  { section: 'STRUMENTI', label: 'Odds Scanner', href: '/odds-scanner', icon: Search },
  { label: 'Odds Scanner v2', href: '/odds-scanner-v2', icon: Radar },
  { label: 'Calcolatori', href: '/calcolatori', icon: Calculator },

  { section: 'DASHBOARD', label: 'Dashboard', href: '/profit-tracker/dashboard', icon: BarChart3 },
  { label: 'Giocate', href: '/profit-tracker/giocate', icon: ListChecks },
  { label: 'Archivio', href: '/profit-tracker/archivio', icon: Archive },
  { label: 'Gestione Conti', href: '/profit-tracker/gestione-conti', icon: Wallet },
  { label: 'Impostazioni', href: '/profit-tracker/book-personali', icon: BookOpen },
  { label: 'Promemoria', href: '/profit-tracker/promemoria', icon: Bell },

  { section: 'ALTRO', label: 'Offerte', href: '/offerte', icon: Gift },
  { label: 'Guide', href: '/guide', icon: BookOpen },
  { label: 'Forum', href: '/forum', icon: MessageSquare },

  {
    section: 'AMMINISTRAZIONE',
    label: 'Backoffice',
    icon: ShieldCheck,
    requiresRole: 'ADMIN_ROLE',
    children: [
      { label: 'Dashboard', href: '/backoffice/dashboard' },
      { label: 'Bookmaker', href: '/backoffice/books' },
      { label: 'Scraper', href: '/backoffice/scrapers' },
      { label: 'Sport Mappings', href: '/backoffice/sport-mappings' },
      { label: 'Matchings', href: '/backoffice/matchings' },
      { label: 'Matcher', href: '/backoffice/matcher' },
      { label: 'Eventi SR', href: '/backoffice/eventi-sportradar' },
      { label: 'Utenti', href: '/backoffice/users' },
    ],
  },

  { section: 'ACCOUNT', label: 'Profilo', href: '/account/profilo', icon: User },
]

export const authenticatedNavDropdowns: NavDropdownItem[] = [
  {
    label: 'STRUMENTI OFFLINE',
    items: [
      { label: 'Punta-Banca', href: '/calcolatori/punta-banca' },
      { label: 'Punta-Punta', href: '/calcolatori/punta-punta' },
      { label: 'Tri-Punta', href: '/calcolatori/tri-punta' },
      { label: 'Multipla', href: '/strumenti-offline/multipla' },
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
  { label: 'ODDS SCANNER v2', href: '/odds-scanner-v2' },
]
export const authenticatedNavLinksAfterDropdowns: NavLinkItem[] = []
