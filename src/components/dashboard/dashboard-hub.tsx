'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  ChevronRight,
  CircleCheck,
  Gift,
  ListChecks,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { CalculatorIcon } from '@/components/calculators/calculator-icon'
import { DsBadge } from '@/components/landing/ds-data'
import { dsFocusRing } from '@/components/landing/ds-primitives'
import { useAccountInfo } from '@/components/profit-tracker/giocate-rapide/use-account-info'
import { DS_PANEL, DsPageHeader, DsSection } from '@/components/profit-tracker/tracker-ds'
import { OmBookLogo, OmSportIcon } from '@/components/strumenti/scanner-v2/om-ds'
import { useNavSections } from '@/components/topnav/use-nav-sections'
import { calculatorGroups } from '@/lib/calculators/catalog'
import { OFFERS_NAV_ITEMS } from '@/lib/nav-config'
import { offerFromCard } from '@/lib/offer-editor'
import { OFFER_TYPES, offerBadge, offerHref } from '@/lib/offers-content'
import {
  MONTH_FULL,
  dashMoney,
  dashboardBalances,
  dashboardProfit,
  monthlySeries,
} from '@/lib/profit-tracker/dashboard'
import { bookLogoSlug, displayName, eventWhen } from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'
import { getOffersTodo, markOfferDone } from '@/services/api/offers-client'
import {
  getPuntateInCorsoTotale,
  getReminders,
  getUnifiedProfitSummary,
} from '@/services/api/profit-tracker-client'
import { useAuthStore } from '@/stores/auth-store'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { OffersTodoApi } from '@/types/offers'
import type { Reminder } from '@/types/profit-tracker'

/**
 * La Dashboard come pagina delle scorciatoie (§14.367, richiesta di Emanuele). In alto una riga
 * piccola con saldo totale e profitto del mese (il resto dei saldi e l'andamento stanno nel Report);
 * a sinistra le sezioni (Offerte, strumenti online, calcolatori, Profit Tracker), a destra quello
 * che è in corso (giocate aperte e promemoria). Ogni scorciatoia esiste solo se la voce della barra
 * esiste per chi guarda (useNavSections): un utente senza una sezione non la vede neanche qui.
 */

const TOOL_COPY: Record<string, string> = {
  '/odds-scanner': 'Le quote dei book contro quelle degli exchange, per trovare la banca giusta.',
  '/risultato-goal': 'Risultato e Goal/No Goal coperti dentro lo stesso book.',
}

const MAX_BETS = 4
const MAX_REMINDERS = 3
const MAX_OFFERS = 3

export function DashboardHub() {
  const user = useAuthStore((s) => s.user)
  const sections = useNavSections()

  const navHrefs = useMemo(
    () => new Set(sections.flatMap((s) => s.items.map((i) => i.href))),
    [sections],
  )
  const onlineTools = useMemo(
    () =>
      sections
        .flatMap((s) => s.items)
        .filter((i) => i.href === '/odds-scanner' || i.href === '/risultato-goal'),
    [sections],
  )
  const trackerItems = useMemo(
    () => sections.find((s) => s.label === 'Tracker')?.items ?? [],
    [sections],
  )
  const calcGroups = useMemo(() => calculatorGroups(user), [user])

  const hasOffers = navHrefs.has('/offerte')
  const hasCalculators = navHrefs.has('/calcolatori')
  const hasTracker = trackerItems.length > 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <DsPageHeader
          title="Dashboard"
          description="Le scorciatoie per le sezioni e quello che hai in corso. Saldi e andamento sono nel Report."
        />
        {hasTracker && <MoneyStrip />}
      </div>

      <div className="grid gap-x-6 gap-y-8 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <DsSection id="h-scorciatoie" title="Scorciatoie">
          <div className="grid gap-5 md:grid-cols-2">
            {hasOffers && <OffersCard />}
            {(onlineTools.length > 0 || hasCalculators) && (
              <HubCard
                icon={Wrench}
                title="Strumenti"
                description="Online legge le quote dai siti, offline le scrivi tu."
                footer={
                  hasCalculators
                    ? { href: '/calcolatori', label: 'Tutti i calcolatori' }
                    : undefined
                }
              >
                {onlineTools.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="ds-caption text-ds-ink-muted uppercase">Online</span>
                    <ul className="m-0 flex list-none flex-col p-0">
                      {onlineTools.map((tool) => (
                        <CardRow key={tool.href} href={tool.href}>
                          <tool.icon className="h-5 w-5 shrink-0 text-ds-brand" aria-hidden />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="font-medium text-ds-ink">{tool.label}</span>
                            <span className="ds-caption text-ds-ink-muted">
                              {TOOL_COPY[tool.href]}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-ds-ink-faint"
                            aria-hidden
                          />
                        </CardRow>
                      ))}
                    </ul>
                  </div>
                )}
                {hasCalculators && (
                  <div className="flex flex-col gap-2">
                    <span className="ds-caption text-ds-ink-muted uppercase">
                      Offline · calcolatori
                    </span>
                    {calcGroups.map((group) => (
                      <div key={group.id} className="flex flex-wrap gap-2">
                        {group.tools.map((tool) => (
                          <Link
                            key={tool.slug}
                            href={`/calcolatori?expand=${tool.slug}`}
                            className={cn(
                              'inline-flex h-9 items-center gap-2 rounded-ds-sm border border-ds-line px-3 text-sm font-medium whitespace-nowrap text-ds-ink transition-colors hover:border-ds-line-strong hover:bg-ds-surface-sunken',
                              dsFocusRing,
                            )}
                          >
                            <CalculatorIcon name={tool.icon} className="h-4 w-4 text-ds-brand" />
                            {tool.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </HubCard>
            )}
            {hasTracker && (
              <HubCard
                icon={ListChecks}
                title="Profit Tracker"
                description="Le tue giocate, i conti e i numeri del mese."
                className="md:col-span-2"
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {trackerItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex h-11 min-w-0 items-center gap-2.5 rounded-ds-sm border border-ds-line px-3 text-sm font-medium text-ds-ink transition-colors hover:border-ds-line-strong hover:bg-ds-surface-sunken',
                        dsFocusRing,
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-ds-brand" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </HubCard>
            )}
          </div>
        </DsSection>

        {hasTracker && (
          <DsSection id="h-in-corso" title="In corso">
            <div className="flex flex-col gap-5">
              <OngoingBetsCard />
              {navHrefs.has('/profit-tracker/promemoria') && <RemindersCard />}
            </div>
          </DsSection>
        )}
      </div>
    </div>
  )
}

/* ---------- Riga dei numeri ---------- */

/** Saldo totale e profitto del mese, piccoli, col link al Report dove stanno tutti gli altri. */
function MoneyStrip() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const [now] = useState(() => new Date())
  const year = now.getFullYear()
  const [puntate, setPuntate] = useState(0)
  const [meseProfit, setMeseProfit] = useState<number | null>(null)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
    getPuntateInCorsoTotale()
      .then((p) => setPuntate(p.totale))
      .catch(() => undefined)
    getUnifiedProfitSummary({
      granularity: 'month',
      fromDate: `${year}-01-01T00:00:00Z`,
      toDate: `${year}-12-31T23:59:59Z`,
    })
      .then((s) => {
        const series = monthlySeries(s.buckets, year, now)
        setMeseProfit(dashboardProfit(series, s.rangeTotal, year, now).meseAttuale)
      })
      .catch(() => setMeseProfit(0))
  }, [fetchAllAccounts, fetchWallets, year, now])

  const saldo = useMemo(
    () => dashboardBalances(allAccounts, wallets, puntate).saldoTotale,
    [allAccounts, wallets, puntate],
  )

  return (
    <div
      className={cn(
        DS_PANEL,
        'grid w-full grid-cols-2 overflow-hidden sm:flex sm:w-auto sm:items-stretch [&>*]:px-5 [&>*]:py-3',
      )}
    >
      <Figure label="Saldo totale" value={dashMoney(saldo, { sign: false })} />
      <Figure
        className="border-l border-ds-line"
        label={`Profitto di ${MONTH_FULL[now.getMonth()].toLowerCase()}`}
        value={meseProfit === null ? null : dashMoney(meseProfit, { sign: true })}
        tone={
          meseProfit === null
            ? ''
            : meseProfit > 0
              ? 'text-ds-profit'
              : meseProfit < 0
                ? 'text-ds-loss'
                : ''
        }
      />
      <Link
        href="/profit-tracker/report"
        className={cn(
          'col-span-2 flex items-center justify-center gap-1.5 border-t border-ds-line text-sm font-semibold whitespace-nowrap text-ds-brand transition-colors hover:bg-ds-brand-soft hover:text-ds-brand-hover sm:border-t-0 sm:border-l',
          dsFocusRing,
        )}
      >
        Report
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}

function Figure({
  label,
  value,
  tone,
  className,
}: {
  label: string
  value: string | null
  tone?: string
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="ds-caption whitespace-nowrap text-ds-ink-muted">{label}</span>
      {value === null ? (
        <span
          aria-hidden
          className="my-1 block h-5 w-24 animate-pulse rounded-ds-xs bg-ds-surface-sunken"
        />
      ) : (
        <span
          className={cn('text-xl leading-7 font-semibold whitespace-nowrap tabular-nums', tone)}
        >
          {value}
        </span>
      )}
    </div>
  )
}

/* ---------- Carta di una sezione ---------- */

function HubCard({
  icon: Icon,
  title,
  description,
  aside,
  footer,
  className,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  aside?: ReactNode
  footer?: { href: string; label: string }
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn(DS_PANEL, 'flex min-w-0 flex-col gap-4 p-5', className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand"
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="ds-subheading m-0 text-ds-ink">{title}</h3>
          <p className="ds-body-sm m-0 text-ds-ink-muted">{description}</p>
        </div>
        {aside}
      </header>
      {children}
      {footer && (
        <Link
          href={footer.href}
          className={cn(
            'mt-auto inline-flex items-center gap-1.5 self-start rounded-ds-sm text-sm font-semibold text-ds-brand hover:text-ds-brand-hover',
            dsFocusRing,
          )}
        >
          {footer.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </section>
  )
}

function CardRow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li className="border-t border-ds-line first:border-t-0">
      <Link
        href={href}
        className={cn(
          '-mx-2 flex min-w-0 items-center gap-3 rounded-ds-sm px-2 py-2.5 transition-colors hover:bg-ds-surface-sunken',
          dsFocusRing,
        )}
      >
        {children}
      </Link>
    </li>
  )
}

/* ---------- Offerte ---------- */

/**
 * §14.367: le tre pagine delle offerte con quante restano da fare in ognuna, e sotto le prime da
 * fare (quelle che scadono, poi le «Nuova», poi il profitto più alto), ognuna col suo «Fatta».
 * Una ricorrente spuntata torna da fare il giorno, la settimana o il mese dopo (lo decide il
 * backend).
 */
function OffersCard() {
  const [todo, setTodo] = useState<OffersTodoApi | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    getOffersTodo(MAX_OFFERS)
      .then((t) => {
        setTodo(t)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markDone = async (slug: string) => {
    // Sparisce subito dall'elenco; il conteggio e la prossima da fare arrivano con la rilettura.
    setTodo((t) => (t ? { ...t, offers: t.offers.filter((o) => o.slug !== slug) } : t))
    try {
      await markOfferDone(slug)
    } finally {
      load()
    }
  }

  const offers = (todo?.offers ?? []).map(offerFromCard)

  return (
    <HubCard
      icon={Gift}
      title="Offerte"
      description="Benvenuto, ricorrenti ed esclusive, con la guida passo passo."
      aside={todo ? <DsBadge tone="brand">{todo.total} da fare</DsBadge> : undefined}
    >
      <ul className="m-0 flex list-none flex-col p-0">
        {OFFERS_NAV_ITEMS.map((item) => {
          const type = OFFER_TYPES.find((t) => item.href.endsWith(`/${t.value}`))?.value
          const n = type && todo ? todo.counts[type] : null
          return (
            <CardRow key={item.href} href={item.href}>
              <item.icon className="h-4 w-4 shrink-0 text-ds-brand" aria-hidden />
              <span className="flex-1 font-medium text-ds-ink">{item.label}</span>
              {n !== null && <span className="ds-num-sm text-ds-ink-muted">{n} da fare</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-ds-ink-faint" aria-hidden />
            </CardRow>
          )
        })}
      </ul>

      {failed && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">
          Non riusciamo a leggere le offerte da fare in questo momento.
        </p>
      )}

      {todo && (
        <div className="flex flex-col gap-2 rounded-ds-sm bg-ds-surface-sunken p-3">
          <span className="ds-caption text-ds-ink-muted uppercase">Da fare per prime</span>
          {offers.length === 0 ? (
            <p className="ds-body-sm m-0 px-1 py-2 text-ds-ink-muted">
              Hai fatto tutte le offerte attive. Le ricorrenti tornano qui al giro dopo.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {offers.map((offer) => {
                const badge = offerBadge(offer)
                return (
                  <li
                    key={offer.id}
                    className="flex min-w-0 items-center gap-2 rounded-ds-sm bg-ds-surface-raised py-2 pr-2 pl-3 shadow-ds-sm"
                  >
                    <Link
                      href={offerHref(offer)}
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-3 rounded-ds-xs hover:text-ds-brand',
                        dsFocusRing,
                      )}
                    >
                      <OmBookLogo slug={offer.bookSlug} name={offer.bookName} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="ds-body-sm line-clamp-2 min-w-0 flex-1 text-ds-ink">
                          {offer.title}
                        </span>
                        <DsBadge tone={badge.tone}>{badge.label}</DsBadge>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void markDone(offer.id)}
                      title={`Segna come fatta: ${offer.title}`}
                      aria-label={`Segna come fatta: ${offer.title}`}
                      className={cn(
                        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-ds-sm text-ds-ink-muted transition-colors hover:bg-ds-profit-soft hover:text-ds-profit',
                        dsFocusRing,
                      )}
                    >
                      <CircleCheck aria-hidden className="h-5 w-5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </HubCard>
  )
}

/* ---------- In corso ---------- */

function OngoingBetsCard() {
  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const isLoading = useProfitTrackerStore((s) => s.isLoadingOngoingBets)
  const fetchOngoingBets = useProfitTrackerStore((s) => s.fetchOngoingBets)
  const { accountInfo } = useAccountInfo()
  const [now] = useState(() => new Date())

  useEffect(() => {
    void fetchOngoingBets()
  }, [fetchOngoingBets])

  const open = useMemo(
    () =>
      ongoingBets
        .filter((b) => !b.archiviata)
        .sort((a, b) => a.eventoData.localeCompare(b.eventoData)),
    [ongoingBets],
  )
  const started = open.filter((b) => eventWhen(b.eventoData, now).started).length

  return (
    <HubCard
      icon={ListChecks}
      title="Giocate in corso"
      description={
        open.length === 0
          ? 'Nessuna giocata aperta.'
          : `${open.length} ${open.length === 1 ? 'aperta' : 'aperte'}${started ? `, ${started} ${started === 1 ? 'già iniziata' : 'già iniziate'}` : ''}`
      }
      footer={{ href: '/profit-tracker/giocate', label: 'Tutte le giocate' }}
    >
      {isLoading && open.length === 0 ? (
        <span aria-hidden className="block h-24 animate-pulse rounded-ds-sm bg-ds-surface-sunken" />
      ) : (
        open.length > 0 && (
          <ul className="m-0 flex list-none flex-col p-0">
            {open.slice(0, MAX_BETS).map((bet) => {
              const when = eventWhen(bet.eventoData, now)
              const info = accountInfo(bet.accountId)
              return (
                <CardRow key={bet.id} href={`/profit-tracker/giocate-in-corso/${bet.id}`}>
                  <span className="text-ds-ink-muted">
                    <OmSportIcon sport={bet.sport} size={18} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-ds-ink">{displayName(bet)}</span>
                    <span
                      className={cn(
                        'ds-caption tabular-nums',
                        when.started ? 'text-ds-warning' : 'text-ds-ink-muted',
                      )}
                    >
                      {when.text}
                    </span>
                  </span>
                  {info.book && (
                    <OmBookLogo slug={bookLogoSlug(info.book)} name={info.book.nome} size="sm" />
                  )}
                </CardRow>
              )
            })}
          </ul>
        )
      )}
    </HubCard>
  )
}

function dueLabel(iso: string, now: Date): { text: string; late: boolean } {
  const d = new Date(iso)
  const hm = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 864e5)
  if (d < now) return { text: `Scaduto il ${d.toLocaleDateString('it-IT')}`, late: true }
  if (diff === 0) return { text: `Oggi alle ${hm}`, late: false }
  if (diff === 1) return { text: `Domani alle ${hm}`, late: false }
  return {
    text: `${d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })} alle ${hm}`,
    late: false,
  }
}

function RemindersCard() {
  const [reminders, setReminders] = useState<Reminder[] | null>(null)
  const { accountInfo } = useAccountInfo()
  const [now] = useState(() => new Date())

  useEffect(() => {
    getReminders({ stato: 'attivo' })
      .then((rs) =>
        setReminders([...rs].sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza))),
      )
      .catch(() => setReminders([]))
  }, [])

  return (
    <HubCard
      icon={Bell}
      title="Promemoria"
      description={
        reminders === null
          ? 'Le prossime scadenze.'
          : reminders.length === 0
            ? 'Nessun promemoria attivo.'
            : `${reminders.length} ${reminders.length === 1 ? 'attivo' : 'attivi'}, i più vicini per primi.`
      }
      footer={{ href: '/profit-tracker/promemoria', label: 'Tutti i promemoria' }}
    >
      {reminders === null ? (
        <span aria-hidden className="block h-16 animate-pulse rounded-ds-sm bg-ds-surface-sunken" />
      ) : (
        reminders.length > 0 && (
          <ul className="m-0 flex list-none flex-col p-0">
            {reminders.slice(0, MAX_REMINDERS).map((r) => {
              const due = dueLabel(r.dataScadenza, now)
              const account = r.accountId ? accountInfo(r.accountId).label : null
              return (
                <CardRow key={r.id} href="/profit-tracker/promemoria">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-ds-ink">{r.descrizione}</span>
                    <span className="ds-caption truncate text-ds-ink-muted">
                      <span className={cn('tabular-nums', due.late && 'text-ds-loss')}>
                        {due.text}
                      </span>
                      {account && account !== '—' ? ` · ${account}` : ''}
                    </span>
                  </span>
                </CardRow>
              )
            })}
          </ul>
        )
      )}
    </HubCard>
  )
}
