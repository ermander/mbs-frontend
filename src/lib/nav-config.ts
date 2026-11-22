/**
 * Nav items of the authenticated area (top bar + mobile drawer, §14.146) and of the
 * public header's authenticated mode (`authenticatedNav*`, further down).
 */

import type { LucideIcon } from 'lucide-react'
import {
  Radar,
  Calculator,
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
  Users,
  PartyPopper,
  Repeat,
  Sparkles,
} from 'lucide-react'

import type { AuthUser, UserRole } from '@/services/api/auth-client'
import { canUseTool, type ToolKey } from '@/lib/tools'
import { OFFER_TYPES, offersListHref, type OfferType } from '@/lib/offers-content'

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

/** Una pagina dentro una voce della barra (§14.358): le tre pagine delle offerte. */
export interface NavSubmenuLink {
  label: string
  href: string
  icon: LucideIcon
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
  /**
   * §14.358: le pagine dentro la voce. Nella barra la voce diventa una tendina che si apre al
   * passaggio del mouse, nel cassetto mobile una riga che si espande; `href` resta la radice
   * della sezione e la segna come attiva anche sulle pagine sotto (il dettaglio di un'offerta).
   */
  children?: NavSubmenuLink[]
}

/**
 * Un gruppo di pagine. Nella barra in alto `display: 'links'` mette ogni voce direttamente
 * nella barra, `'menu'` le raccoglie in una tendina con l'etichetta del gruppo; nel cassetto
 * mobile le voci dei gruppi `links` stanno in colonna senza intestazione, quelle dei gruppi
 * `menu` sotto l'etichetta del gruppo.
 */
export interface AuthNavSection {
  label: string
  display: 'links' | 'menu'
  items: AuthNavItem[]
  /** Se presente, il gruppo intero è visibile solo agli utenti con quel ruolo */
  requiresRole?: UserRole
}

const OFFER_TYPE_ICONS: Record<OfferType, LucideIcon> = {
  benvenuto: PartyPopper,
  ricorrenti: Repeat,
  esclusive: Sparkles,
}

/**
 * §14.358 (ClickUp «Dividere sezioni offerte»): le tre pagine delle offerte, una per tipo, sotto
 * la voce «Offerte» della barra dell'app e di quella della landing (LANDING_NAV_LINKS).
 */
export const OFFERS_NAV_ITEMS: NavSubmenuLink[] = OFFER_TYPES.map((t) => ({
  label: t.label,
  href: offersListHref(t.value),
  icon: OFFER_TYPE_ICONS[t.value],
}))

/**
 * Le voci della Navbar del design (§14.275): Guide · Offerte · Oddsmatcher · Calcolatori ·
 * Tracker · Forum, con Risultato + Goal dopo l'Oddsmatcher per chi è abilitato e il Backoffice
 * in fondo per gli admin. Tracker è una tendina con le pagine del Profit Tracker; dal §14.358
 * anche Offerte apre una tendina, con le pagine di benvenuto, ricorrenti ed esclusive.
 */
export const authNavSections: AuthNavSection[] = [
  {
    label: 'Sezioni',
    display: 'links',
    items: [
      // MOCKUP: la Dashboard delle scorciatoie esce dal menu Tracker e diventa la prima voce.
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Guide', href: '/guide', icon: BookOpen },
      { label: 'Offerte', href: '/offerte', icon: Gift, children: OFFERS_NAV_ITEMS },
      { label: 'Oddsmatcher', href: '/odds-scanner', icon: Radar },
      // §14.122: strumento riservato agli admin e agli utenti abilitati dal backoffice.
      {
        label: 'Risultato + Goal',
        href: '/risultato-goal',
        icon: Goal,
        requiresTool: 'result_btts',
      },
      // §14.347: «Rimborso 0-0» (§14.288) is out of the menu; its page stays at /rimborso-zero.
      { label: 'Calcolatori', href: '/calcolatori', icon: Calculator },
    ],
  },
  {
    label: 'Tracker',
    display: 'menu',
    items: [
      { label: 'Report', href: '/profit-tracker/report', icon: PieChart },
      { label: 'Giocate', href: '/profit-tracker/giocate', icon: ListChecks },
      { label: 'Archivio', href: '/profit-tracker/archivio', icon: Archive },
      { label: 'Gestione Conti', href: '/profit-tracker/gestione-conti', icon: Wallet },
      { label: 'Impostazioni', href: '/profit-tracker/book-personali', icon: BookOpen },
      { label: 'Promemoria', href: '/profit-tracker/promemoria', icon: Bell },
    ],
  },
  {
    label: 'Community',
    display: 'links',
    items: [{ label: 'Forum', href: '/forum', icon: MessageSquare }],
  },
  {
    label: 'Backoffice',
    display: 'menu',
    requiresRole: 'ADMIN_ROLE',
    items: [
      { label: 'Dashboard', href: '/backoffice/dashboard', icon: LayoutDashboard },
      { label: 'Salute', href: '/backoffice/salute', icon: Activity },
      { label: 'Bookmaker', href: '/backoffice/books', icon: BookMarked },
      { label: 'Offerte', href: '/backoffice/offerte', icon: Gift },
      { label: 'Metodi di pagamento', href: '/backoffice/payment-methods', icon: CreditCard },
      { label: 'Categorie movimenti', href: '/backoffice/movement-categories', icon: Tags },
      { label: 'Scraper', href: '/backoffice/scrapers', icon: Bot },
      { label: 'Sport Mappings', href: '/backoffice/sport-mappings', icon: Trophy },
      { label: 'Matchings', href: '/backoffice/matchings', icon: Link2 },
      { label: 'Matcher', href: '/backoffice/matcher', icon: GitMerge },
      { label: 'Palinsesto API-Football', href: '/backoffice/palinsesto', icon: CalendarDays },
      { label: 'Competizioni da leggere', href: '/backoffice/competizioni', icon: ListFilter },
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
      { label: 'Condizionato', href: '/calcolatori/condizionato' },
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

/** Direct links (no dropdown), shown before and after the dropdowns. */
export const authenticatedNavLinksBeforeDropdowns: NavLinkItem[] = [
  { label: 'HOME', href: '/' },
  { label: 'ODDS SCANNER', href: '/odds-scanner' },
  { label: 'RISULTATO + GOAL', href: '/risultato-goal', requiresTool: 'result_btts' },
]
export const authenticatedNavLinksAfterDropdowns: NavLinkItem[] = []
