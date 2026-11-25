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
  ArrowLeftRight,
  Columns2,
  Columns3,
  Medal,
} from 'lucide-react'

import type { AuthUser, UserRole } from '@/services/api/auth-client'
import { canUseSection, type SectionKey } from '@/lib/tools'
import { OFFER_TYPES, offersListHref, type OfferType } from '@/lib/offers-content'

export interface NavLinkItem {
  label: string
  href: string
  /** Se presente, il link è visibile solo a chi ha quella sezione (admin o utente abilitato dal backoffice, §14.366) */
  requiresSection?: SectionKey
}

export interface NavDropdownItem {
  label: string
  items: NavLinkItem[]
  /** Se presente, il dropdown è visibile solo agli utenti con quel ruolo */
  requiresRole?: UserRole
}

/** Una pagina dentro una voce della barra: le tre pagine delle offerte (§14.358), gli strumenti di «Radar» (§14.391, §14.406). */
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
  /**
   * §14.358: le pagine dentro la voce. Nella barra la voce diventa una tendina che si apre al
   * passaggio del mouse, nel cassetto mobile una riga che si espande; `href` resta la radice
   * della sezione e la segna come attiva anche sulle pagine sotto (il dettaglio di un'offerta).
   * Una voce è attiva anche su ognuna delle sue pagine (isNavItemActive): quelle di «Radar» non
   * stanno sotto un indirizzo comune.
   */
  children?: NavSubmenuLink[]
  /**
   * §14.367: nella barra sotto i 1280px resta solo l'icona (il nome per i lettori di schermo e
   * come suggerimento al passaggio del mouse), perché a 1024px le voci di un admin non ci stanno.
   */
  compact?: boolean
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
  /** §14.366: se presente, il gruppo intero è visibile solo a chi ha quella sezione (il Tracker). */
  requiresSection?: SectionKey
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
 * §14.391 (ClickUp «Best Odds»): la tendina «Radar», gli strumenti che leggono le quote dai siti.
 * L'Oddsmatcher, che prima era una voce della barra, e Best Odds: chi quota un mercato di un
 * evento e chi paga di più. §14.406: l'Oddsmatcher si divide in tre pagine, una per tipo di
 * combinazione (MATCHER_PAGES): Oddsmatcher (punta e banca), Dutcher (punta-punta a 2 esiti) e
 * Trimatcher (a 3 esiti). Stanno tutte nella sezione `oddsmatcher` (NAV_ITEM_SECTIONS).
 */
export const RADAR_NAV_ITEMS: NavSubmenuLink[] = [
  { label: 'Oddsmatcher', href: '/odds-scanner', icon: ArrowLeftRight },
  { label: 'Dutcher', href: '/dutcher', icon: Columns2 },
  { label: 'Trimatcher', href: '/trimatcher', icon: Columns3 },
  { label: 'Best Odds', href: '/best-odds', icon: Medal },
]

/**
 * Le voci della Navbar del design (§14.275): Guide · Offerte · Radar · Calcolatori ·
 * Tracker · Forum (dal §14.367 con la Dashboard davanti a tutte), con Risultato + Goal dopo Radar per chi è abilitato e il Backoffice
 * in fondo per gli admin. Tracker è una tendina con le pagine del Profit Tracker; dal §14.358
 * anche Offerte apre una tendina, con le pagine di benvenuto, ricorrenti ed esclusive, e dal
 * §14.391 Radar, con l'Oddsmatcher e Best Odds (dal §14.406 anche Dutcher e Trimatcher).
 */
export const authNavSections: AuthNavSection[] = [
  {
    label: 'Sezioni',
    display: 'links',
    items: [
      // §14.367: la Dashboard delle scorciatoie esce dal menu Tracker e diventa la prima voce.
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, compact: true },
      { label: 'Guide', href: '/guide', icon: BookOpen },
      { label: 'Offerte', href: '/offerte', icon: Gift, children: OFFERS_NAV_ITEMS },
      // §14.391: l'Oddsmatcher sta nella tendina «Radar» con Best Odds (dal §14.406 anche Dutcher
      // e Trimatcher); `href` è la prima pagina.
      { label: 'Radar', href: '/odds-scanner', icon: Radar, children: RADAR_NAV_ITEMS },
      // §14.122: strumento riservato agli admin e agli utenti abilitati dal backoffice.
      { label: 'Risultato + Goal', href: '/risultato-goal', icon: Goal },
      // §14.347: «Rimborso 0-0» (§14.288) is out of the menu; its page stays at /rimborso-zero.
      { label: 'Calcolatori', href: '/calcolatori', icon: Calculator },
    ],
  },
  {
    label: 'Tracker',
    display: 'menu',
    requiresSection: 'tracker',
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

/**
 * §14.366: la sezione del sito di ogni voce della barra, per indirizzo. Una voce la vede solo chi
 * ha la sezione: admin o utente abilitato dal backoffice (Risultato + Goal dal §14.122, quando
 * la voce aveva `requiresTool`). Il gruppo Tracker ha la sua `requiresSection`.
 */
export const NAV_ITEM_SECTIONS: Readonly<Record<string, SectionKey>> = {
  '/guide': 'guide',
  '/offerte': 'offers',
  '/odds-scanner': 'oddsmatcher',
  '/risultato-goal': 'result_btts',
  '/calcolatori': 'calculators',
  '/forum': 'forum',
}

/** La pagina del profilo vive nel menu dell'account (avatar a destra nella barra), con il logout. */
export const accountNavItem: AuthNavItem = {
  label: 'Profilo',
  href: '/account/profilo',
  icon: User,
}

/**
 * I gruppi che l'utente può vedere: via i gruppi e le voci riservati a un altro ruolo o a una
 * sezione non abilitata (§14.366); un gruppo rimasto senza voci sparisce.
 */
export function visibleNavSections(
  user: Pick<AuthUser, 'role' | 'tools' | 'sections'> | null | undefined,
): AuthNavSection[] {
  // Senza utente (la barra prima del bootstrap) le voci di prima del §14.366: tutte tranne
  // Risultato + Goal, la regola di canUseSection per un utente senza `sections`.
  const viewer = user ?? { role: 'USER_ROLE' as const }
  return authNavSections.flatMap((section) => {
    if (section.requiresRole && section.requiresRole !== user?.role) return []
    if (section.requiresSection && !canUseSection(viewer, section.requiresSection)) return []
    const items = section.items.filter((item) => {
      if (item.requiresRole && item.requiresRole !== user?.role) return false
      const itemSection = NAV_ITEM_SECTIONS[item.href]
      if (itemSection && !canUseSection(viewer, itemSection)) return false
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

/**
 * Una voce della barra è attiva sulla sua pagina (e sotto) e su ognuna delle pagine della sua
 * tendina: «Radar» è attiva su /odds-scanner, /dutcher, /trimatcher e /best-odds (§14.391, §14.406).
 */
export function isNavItemActive(
  pathname: string | null | undefined,
  item: Pick<AuthNavItem, 'href' | 'children'>,
): boolean {
  if (isActiveHref(pathname, item.href)) return true
  return (item.children ?? []).some((child) => isActiveHref(pathname, child.href))
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
      { label: 'Dashboard', href: '/dashboard' },
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
  { label: 'RISULTATO + GOAL', href: '/risultato-goal', requiresSection: 'result_btts' },
]
export const authenticatedNavLinksAfterDropdowns: NavLinkItem[] = []
