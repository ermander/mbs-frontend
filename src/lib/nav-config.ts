/**
 * Nav items for the authenticated sidebar and header.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Radar,
  Calculator,
  BarChart3,
  PieChart,
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
  /** Se presente, il dropdown è visibile solo agli utenti con quel ruolo */
  requiresRole?: UserRole
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
  {
    section: 'STRUMENTI',
    label: 'Odds Scanner',
    href: '/odds-scanner',
    icon: Radar,
  },
  { label: 'Calcolatori', href: '/calcolatori', icon: Calculator },

  { section: 'DASHBOARD', label: 'Dashboard', href: '/profit-tracker/dashboard', icon: BarChart3 },
  { label: 'Report', href: '/profit-tracker/report', icon: PieChart },
  { label: 'Giocate', href: '/profit-tracker/giocate', icon: ListChecks },
  { label: 'Archivio', href: '/profit-tracker/archivio', icon: Archive },
  { label: 'Gestione Conti', href: '/profit-tracker/gestione-conti', icon: Wallet },
  {
    label: 'Impostazioni',
    href: '/profit-tracker/book-personali',
    icon: BookOpen,
  },
  {
    label: 'Promemoria',
    href: '/profit-tracker/promemoria',
    icon: Bell,
  },

  {
    section: 'ALTRO',
    label: 'Offerte',
    href: '/offerte',
    icon: Gift,
  },
  { label: 'Guide', href: '/guide', icon: BookOpen },
  { label: 'Forum', href: '/forum', icon: MessageSquare },

  {
    section: 'AMMINISTRAZIONE',
    label: 'Backoffice',
    icon: ShieldCheck,
    requiresRole: 'ADMIN_ROLE',
    children: [
      { label: 'Dashboard', href: '/backoffice/dashboard' },
      { label: 'Salute', href: '/backoffice/salute' },
      { label: 'Bookmaker', href: '/backoffice/books' },
      { label: 'Metodi di pagamento', href: '/backoffice/payment-methods' },
      { label: 'Categorie movimenti', href: '/backoffice/movement-categories' },
      { label: 'Scraper', href: '/backoffice/scrapers' },
      { label: 'Sport Mappings', href: '/backoffice/sport-mappings' },
      { label: 'Matchings', href: '/backoffice/matchings' },
      { label: 'Matcher', href: '/backoffice/matcher' },
      { label: 'Palinsesto API-Football', href: '/backoffice/palinsesto' },
      { label: 'Competizioni da leggere', href: '/backoffice/competizioni' },
      { label: 'Eventi SR', href: '/backoffice/eventi-sportradar' },
      { label: 'Utenti', href: '/backoffice/users' },
    ],
  },

  {
    section: 'ACCOUNT',
    label: 'Profilo',
    href: '/account/profilo',
    icon: User,
  },
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
      { label: 'Baccarat', href: '/calcolatori/baccarat' },
    ],
  },
  {
    label: 'DASHBOARD',
    items: [
      { label: 'Dashboard', href: '/profit-tracker/dashboard' },
      { label: 'Report', href: '/profit-tracker/report' },
      { label: 'Giocate', href: '/profit-tracker/giocate' },
      { label: 'Archivio', href: '/profit-tracker/archivio' },
      { label: 'Gestione Conti', href: '/profit-tracker/gestione-conti' },
      { label: 'Impostazioni', href: '/profit-tracker/book-personali' },
      { label: 'Promemoria', href: '/profit-tracker/promemoria' },
    ],
  },
  {
    label: 'AMMINISTRAZIONE',
    requiresRole: 'ADMIN_ROLE',
    items: [
      { label: 'Backoffice', href: '/backoffice/dashboard' },
      { label: 'Utenti', href: '/backoffice/users' },
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
