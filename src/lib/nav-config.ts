/**
 * Nav items of the authenticated area (top bar + mobile drawer, §14.146) and of the
 * public header's authenticated mode (`authenticatedNav*`, further down).
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
  Goal,
  LayoutDashboard,
  Activity,
  BookMarked,
  CreditCard,
  Tags,
  Bot,
  Trophy,
  Link2,
  GitMerge,
  CalendarDays,
  ListFilter,
  Radio,
  Users,
} from 'lucide-react'

import type { AuthUser, UserRole } from '@/services/api/auth-client'
import { canUseTool, type ToolKey } from '@/lib/tools'

export interface NavLinkItem {
  label: string
  href: string
  /** Se presente, il link è visibile solo a chi può usare quello strumento (admin o utente abilitato dal backoffice) */
  requiresTool?: ToolKey
}

export interface NavDropdownItem {
  label: string
  items: NavLinkItem[]
  /** Se presente, il dropdown è visibile solo agli utenti con quel ruolo */
  requiresRole?: UserRole
}

/** Una pagina dell'area autenticata, con la sua icona. */
export interface AuthNavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Se presente, la voce viene mostrata solo agli utenti con quel ruolo */
  requiresRole?: UserRole
  /** Se presente, la voce è visibile solo a chi può usare quello strumento (admin o utente abilitato dal backoffice) */
  requiresTool?: ToolKey
}

/**
 * Un gruppo di pagine. Nella barra in alto `display: 'links'` mette ogni voce direttamente
 * nella barra, `'menu'` le raccoglie in una tendina con l'etichetta del gruppo; nel cassetto
 * mobile ogni gruppo è un'intestazione seguita dalle sue voci.
 */
export interface AuthNavSection {
  label: string
  display: 'links' | 'menu'
  items: AuthNavItem[]
  /** Se presente, il gruppo intero è visibile solo agli utenti con quel ruolo */
  requiresRole?: UserRole
}

export const authNavSections: AuthNavSection[] = [
  {
    label: 'Strumenti',
    display: 'links',
    items: [
      { label: 'Odds Scanner', href: '/odds-scanner', icon: Radar },
      // §14.122: strumento riservato agli admin e agli utenti abilitati dal backoffice.
      {
        label: 'Risultato + Goal',
        href: '/risultato-goal',
        icon: Goal,
        requiresTool: 'result_btts',
      },
      { label: 'Calcolatori', href: '/calcolatori', icon: Calculator },
    ],
  },
  {
    label: 'Profit Tracker',
    display: 'menu',
    items: [
      { label: 'Dashboard', href: '/profit-tracker/dashboard', icon: BarChart3 },
      { label: 'Report', href: '/profit-tracker/report', icon: PieChart },
      { label: 'Giocate', href: '/profit-tracker/giocate', icon: ListChecks },
      { label: 'Archivio', href: '/profit-tracker/archivio', icon: Archive },
      { label: 'Gestione Conti', href: '/profit-tracker/gestione-conti', icon: Wallet },
      { label: 'Impostazioni', href: '/profit-tracker/book-personali', icon: BookOpen },
      { label: 'Promemoria', href: '/profit-tracker/promemoria', icon: Bell },
    ],
  },
  {
    label: 'Altro',
    display: 'menu',
    items: [
      { label: 'Offerte', href: '/offerte', icon: Gift },
      { label: 'Guide', href: '/guide', icon: BookOpen },
      { label: 'Forum', href: '/forum', icon: MessageSquare },
    ],
  },
  {
    label: 'Backoffice',
    display: 'menu',
    requiresRole: 'ADMIN_ROLE',
    items: [
      { label: 'Dashboard', href: '/backoffice/dashboard', icon: LayoutDashboard },
      { label: 'Salute', href: '/backoffice/salute', icon: Activity },
      { label: 'Bookmaker', href: '/backoffice/books', icon: BookMarked },
      { label: 'Metodi di pagamento', href: '/backoffice/payment-methods', icon: CreditCard },
      { label: 'Categorie movimenti', href: '/backoffice/movement-categories', icon: Tags },
      { label: 'Scraper', href: '/backoffice/scrapers', icon: Bot },
      { label: 'Sport Mappings', href: '/backoffice/sport-mappings', icon: Trophy },
      { label: 'Matchings', href: '/backoffice/matchings', icon: Link2 },
      { label: 'Matcher', href: '/backoffice/matcher', icon: GitMerge },
      { label: 'Palinsesto API-Football', href: '/backoffice/palinsesto', icon: CalendarDays },
      { label: 'Competizioni da leggere', href: '/backoffice/competizioni', icon: ListFilter },
      { label: 'Eventi SR', href: '/backoffice/eventi-sportradar', icon: Radio },
      { label: 'Utenti', href: '/backoffice/users', icon: Users },
    ],
  },
]

/** La pagina del profilo vive nel menu dell'account (avatar a destra nella barra), con il logout. */
export const accountNavItem: AuthNavItem = {
  label: 'Profilo',
  href: '/account/profilo',
  icon: User,
}

/**
 * I gruppi che l'utente può vedere: via i gruppi e le voci riservati a un altro ruolo o a uno
 * strumento non abilitato; un gruppo rimasto senza voci sparisce.
 */
export function visibleNavSections(
  user: Pick<AuthUser, 'role' | 'tools'> | null | undefined,
): AuthNavSection[] {
  return authNavSections.flatMap((section) => {
    if (section.requiresRole && section.requiresRole !== user?.role) return []
    const items = section.items.filter((item) => {
      if (item.requiresRole && item.requiresRole !== user?.role) return false
      if (item.requiresTool && !canUseTool(user, item.requiresTool)) return false
      return true
    })
    return items.length > 0 ? [{ ...section, items }] : []
  })
}

/** Attiva sulla pagina stessa e sulle sue sotto-pagine; `/` solo su se stessa. */
export function isActiveHref(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

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
      { label: 'Roulette', href: '/calcolatori/roulette' },
      { label: 'Target fun bonus', href: '/calcolatori/fun-bonus' },
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
  { label: 'RISULTATO + GOAL', href: '/risultato-goal', requiresTool: 'result_btts' },
]
export const authenticatedNavLinksAfterDropdowns: NavLinkItem[] = []
