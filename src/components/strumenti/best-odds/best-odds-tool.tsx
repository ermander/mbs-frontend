'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, Search, X } from 'lucide-react'

import { DsButton, dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DS_PANEL, DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { OmEmptyState } from '@/components/strumenti/scanner-v2/om-ds'
import {
  BEST_ODDS_PAGE_SIZE,
  bestOddsHref,
  findCompetition,
  nationLabel,
  parseBestOddsView,
  type BestOddsView,
} from '@/lib/best-odds'
import { sportDisplay } from '@/lib/bookmakers'
import { ageLabel, ageSeconds } from '@/lib/matcher/format'
import { cn } from '@/lib/utils'
import {
  getBestOddsCatalog,
  getBestOddsEvent,
  getBestOddsEvents,
} from '@/services/api/best-odds-client'
import type { BestOddsEventSummary } from '@/types/best-odds'
import { BestOddsCatalogPanel, BestOddsSportChips } from './best-odds-catalog'
import { BestOddsEventView } from './best-odds-event'
import { BackLink, BestOddsEventsList } from './best-odds-events'
import { Bone, NationFlag } from './best-odds-parts'
import { useRemote } from './use-remote'

const SEARCH_DEBOUNCE_MS = 350
/** The backend ignores a search of one character. */
const SEARCH_MIN = 2

/** A ticking clock so the ages on screen keep moving between reloads. */
function useNow(intervalMs: number): number {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(handle)
  }, [intervalMs])
  return now
}

/**
 * «Best Odds» (ADAPTER_STATUS §14.391, ClickUp «Best Odds»): the ladder sport → nation →
 * competition → event, down to who prices a market of the event and who pays the most. The use
 * case: a cover left open, to place where it pays best.
 *
 * On a wide screen the catalog stays on the left and the right side shows a list of events (the
 * next ones of the sport, the ones of a competition, the results of the search) or one event. On a
 * phone the three are screens of their own, with the way back on top. What is on screen is in the
 * address (lib/best-odds: sport, campionato, evento), so the browser's back button walks the
 * ladder up and a link to an event can be kept; the search lives in the page only.
 *
 * No polling, like the Oddsmatcher: the prices are read again with «Aggiorna».
 */
export function BestOddsTool() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const view = React.useMemo(() => parseBestOddsView(searchParams), [searchParams])
  const now = useNow(15_000)

  // ── Search: what is typed, and what is asked to the backend a moment after the last key ──
  const [searchText, setSearchText] = React.useState('')
  const [search, setSearch] = React.useState('')
  React.useEffect(() => {
    const text = searchText.trim()
    const handle = setTimeout(
      () => setSearch(text.length >= SEARCH_MIN ? text : ''),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(handle)
  }, [searchText])
  const clearSearch = React.useCallback(() => {
    setSearchText('')
    setSearch('')
  }, [])
  const typeSearch = (text: string) => {
    setSearchText(text)
    // The results are a list of their own: they start from the first page and close the event on screen.
    if (view.eventId || view.page > 0) {
      router.replace(bestOddsHref({ ...view, eventId: null, page: 0 }), { scroll: false })
    }
  }

  // ── Catalog ──
  const catalog = useRemote(getBestOddsCatalog)
  const place = React.useMemo(
    () => findCompetition(catalog.data, view.competitionId),
    [catalog.data, view.competitionId],
  )
  const sport =
    place?.sport ??
    catalog.data?.sports.find((s) => s.name === view.sport) ??
    catalog.data?.sports[0] ??
    null
  const sportName = sport?.name ?? null

  // ── The list on screen: a search, a competition, or the next events of the sport ──
  const listMode = search ? 'search' : view.competitionId ? 'competition' : 'sport'
  const { eventId, competitionId, page } = view
  const listLoader = React.useMemo(() => {
    if (eventId) return null
    const slice = { limit: BEST_ODDS_PAGE_SIZE, offset: page * BEST_ODDS_PAGE_SIZE }
    if (search) return () => getBestOddsEvents({ search, ...slice })
    if (competitionId) return () => getBestOddsEvents({ competition: competitionId, ...slice })
    if (!sportName) return null
    return () => getBestOddsEvents({ sport: sportName, ...slice })
  }, [eventId, competitionId, page, search, sportName])
  const list = useRemote(listLoader)
  // Until the catalog says which sport comes first, the list of its next events cannot be asked.
  const listLoading = list.loading || (listLoader == null && !eventId && catalog.loading)

  // ── One event ──
  const eventLoader = React.useMemo(
    () => (eventId ? () => getBestOddsEvent(eventId) : null),
    [eventId],
  )
  const event = useRemote(eventLoader)

  const refreshing = catalog.refreshing || list.refreshing || event.refreshing
  const refresh = () => {
    void catalog.refresh()
    void list.refresh()
    void event.refresh()
  }
  const readAt = eventId ? event.data?.calculatedAt : catalog.data?.calculatedAt

  // ── Addresses ──
  /** The list on screen, as an address: the events of a sport's list carry «prossimi» to come back to it. */
  const listView: Partial<BestOddsView> = {
    sport: sportName ?? view.sport,
    competitionId,
    upcoming: listMode === 'sport' ? true : view.upcoming,
    page,
  }
  const eventHref = (e: BestOddsEventSummary) => bestOddsHref({ ...listView, eventId: e.id })
  const hasList = Boolean(competitionId || view.upcoming || search)
  const backFromEvent = hasList
    ? { sport: view.sport, competitionId, upcoming: view.upcoming, page }
    : event.data
      ? { competitionId: event.data.event.competitionId }
      : { sport: view.sport }
  const backLabel = search
    ? 'Risultati della ricerca'
    : competitionId
      ? (place?.competition.name ?? event.data?.event.competitionName ?? 'Campionato')
      : view.upcoming
        ? 'Prossimi eventi'
        : (event.data?.event.competitionName ?? 'Palinsesto')

  // On a phone: the catalog alone until something is chosen, then the list or the event alone.
  const detailOnPhone = Boolean(eventId || hasList)

  // ── The heading of the list ──
  const firstRow = list.data?.events[0]
  const competitionName = place?.competition.name ?? firstRow?.competitionName ?? 'Campionato'
  const nationOfList = place?.nation ?? {
    name: firstRow?.nationName ?? null,
    code: firstRow?.nationCode ?? null,
  }
  const sportLabel = sportName ? sportDisplay(sportName).label : null
  const heading =
    listMode === 'search'
      ? {
          title: <>Risultati per «{search}»</>,
          caption: 'Squadre e campionati di tutto il palinsesto',
          emptyTitle: `Nessun evento per «${search}»`,
          emptyText: 'Controlla come è scritto il nome, oppure sfoglia il palinsesto.',
        }
      : listMode === 'competition'
        ? {
            title: (
              <>
                <NationFlag
                  code={nationOfList.code}
                  name={nationOfList.name}
                  competitionName={competitionName}
                />
                <span className="truncate">{competitionName}</span>
              </>
            ),
            caption: [nationLabel(nationOfList.name, nationOfList.code), sportLabel]
              .filter(Boolean)
              .join(' · '),
            emptyTitle: 'Nessun evento in questo campionato',
            emptyText:
              'Un evento compare quando almeno un sito lo quota. Scegli un altro campionato dal palinsesto.',
          }
        : {
            title: <>Prossimi eventi</>,
            caption: sportLabel ?? undefined,
            emptyTitle: 'Nessun evento in palinsesto',
            emptyText: 'In questo momento nessun sito ha quote da mostrare. Riprova più tardi.',
          }

  return (
    <div className="flex flex-col gap-5">
      <DsPageHeader
        title="Best Odds"
        description="Scegli sport, nazione, campionato ed evento: per ogni mercato vedi quali siti lo quotano e chi paga di più."
        actions={
          <>
            {readAt && (
              <span className="ds-caption text-ds-ink-muted">
                Aggiornato {ageLabel(ageSeconds(readAt, now))} fa
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              aria-busy={refreshing}
              className={cn(
                dsButtonClass('secondary', 'sm'),
                'disabled:cursor-wait disabled:opacity-70',
              )}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
              Aggiorna
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex h-10 w-full flex-none items-center gap-2 rounded-ds-sm border border-ds-line-strong bg-ds-surface-raised px-3 transition-[border-color,box-shadow] duration-150 focus-within:border-ds-brand focus-within:shadow-ds-focus lg:w-[300px] xl:w-[340px]">
          <Search className="h-4 w-4 flex-none text-ds-ink-muted" aria-hidden />
          <input
            type="search"
            aria-label="Cerca una squadra o un campionato"
            placeholder="Cerca una squadra o un campionato"
            value={searchText}
            onChange={(e) => typeSearch(e.target.value)}
            className="ds-body-sm min-w-0 flex-1 border-0 bg-transparent text-ds-ink outline-hidden placeholder:text-ds-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {searchText && (
            <button
              type="button"
              aria-label="Cancella la ricerca"
              onClick={clearSearch}
              className={cn(
                'inline-flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-ds-sm text-ds-ink-muted hover:bg-ds-surface-sunken hover:text-ds-ink',
                dsFocusRing,
              )}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        {catalog.data && catalog.data.sports.length > 0 && (
          <BestOddsSportChips
            sports={catalog.data.sports}
            current={search ? null : sportName}
            onPick={clearSearch}
            className={cn(detailOnPhone && 'max-lg:hidden')}
          />
        )}
      </div>

      {catalog.failed && (
        <DsAlert>
          Non riesco a leggere il palinsesto in questo momento. Riprova con «Aggiorna».
        </DsAlert>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={cn(
            'min-w-0 lg:sticky lg:top-[calc(var(--topnav-h)+1rem)]',
            detailOnPhone && 'max-lg:hidden',
          )}
        >
          {sport ? (
            <BestOddsCatalogPanel
              sport={sport}
              competitionId={competitionId}
              searching={Boolean(search)}
              onPick={clearSearch}
              className="lg:max-h-[calc(100vh-var(--topnav-h)-2rem)]"
            />
          ) : catalog.loading ? (
            <div aria-busy="true" className={cn(DS_PANEL, 'flex flex-col gap-4 p-4')}>
              {Array.from({ length: 8 }, (_, i) => (
                <Bone key={i} className="h-4" />
              ))}
              <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento del palinsesto…</p>
            </div>
          ) : (
            !catalog.failed && (
              <p className={cn(DS_PANEL, 'ds-body-sm m-0 p-4 text-ds-ink-muted')}>
                Nessun evento in palinsesto in questo momento.
              </p>
            )
          )}
        </aside>

        <div className={cn('min-w-0', !detailOnPhone && 'max-lg:hidden')}>
          {eventId ? (
            <div className="flex min-w-0 flex-col gap-4">
              <BackLink href={bestOddsHref(backFromEvent)}>{backLabel}</BackLink>
              {event.failed ? (
                <DsAlert>
                  Non riesco a leggere le quote di questo evento. Riprova con «Aggiorna».
                </DsAlert>
              ) : event.loading ? (
                <div aria-busy="true" className="flex flex-col gap-4">
                  <div className={cn(DS_PANEL, 'flex flex-col gap-3 p-5')}>
                    <Bone className="h-4 w-48" />
                    <Bone className="h-7 w-72 max-w-full" />
                    <Bone className="h-4 w-40" />
                  </div>
                  <div className={cn(DS_PANEL, 'flex flex-col gap-4 p-5')}>
                    {Array.from({ length: 6 }, (_, i) => (
                      <Bone key={i} className="h-4" />
                    ))}
                    <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento delle quote…</p>
                  </div>
                </div>
              ) : event.data ? (
                <BestOddsEventView key={eventId} detail={event.data} now={now} />
              ) : (
                <OmEmptyState
                  title="Evento non disponibile"
                  description="È iniziato o non è più in palinsesto: le quote di Best Odds sono solo quelle degli eventi che devono ancora cominciare."
                  action={
                    <DsButton href={bestOddsHref(backFromEvent)} variant="primary">
                      Torna agli eventi
                    </DsButton>
                  }
                />
              )}
            </div>
          ) : (
            <BestOddsEventsList
              title={heading.title}
              caption={heading.caption}
              back={{
                href: bestOddsHref({ sport: sportName ?? view.sport }),
                label: 'Palinsesto',
                onClick: clearSearch,
              }}
              events={list.data?.events ?? []}
              total={list.data?.total ?? 0}
              page={page}
              loading={listLoading}
              failed={list.failed}
              now={now}
              showCompetition={listMode !== 'competition'}
              eventHref={eventHref}
              onPageChange={(next) => router.push(bestOddsHref({ ...listView, page: next }))}
              emptyTitle={heading.emptyTitle}
              emptyText={heading.emptyText}
            />
          )}
        </div>
      </div>
    </div>
  )
}
