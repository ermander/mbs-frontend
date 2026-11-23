'use client'

import * as React from 'react'
import { ExternalLink } from 'lucide-react'

import { DsBadge } from '@/components/landing/ds-data'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DS_PANEL, countLabel } from '@/components/profit-tracker/tracker-ds'
import { BookmakerLink } from '@/components/strumenti/scanner-v2/leg-chip'
import { OmBookLogo, OmEmptyState, OmSportIcon } from '@/components/strumenti/scanner-v2/om-ds'
import {
  bestByOutcome,
  dayLabel,
  defaultMarket,
  eventTitle,
  groupMarkets,
  marketFullLabel,
  marketLineLabel,
  nationLabel,
  netOdds,
  outcomeHint,
  outcomeName,
  rankMarket,
  selectMarket,
  variantLabel,
  type BestOddsMarketGroup,
  type MarketSelection,
  type OutcomeBest,
  type RankedPrice,
} from '@/lib/best-odds'
import { shortBookmakerName, sportDisplay } from '@/lib/bookmakers'
import { formatOdds } from '@/lib/landing-format'
import { ageLabel, ageSeconds, ageTone, formatClock, formatKickoffTime } from '@/lib/matcher/format'
import { cn } from '@/lib/utils'
import type {
  BestOddsBookmaker,
  BestOddsEventDetail,
  BestOddsMarket,
  BestOddsOutcome,
} from '@/types/best-odds'
import { ChipCount, NationFlag, chipClass } from './best-odds-parts'

/** Up to this many outcomes the table has a column for each; beyond, only the chosen one. */
const MAX_OUTCOME_COLUMNS = 3
/** One, two or three outcomes stay side by side, on a phone too. */
const OUTCOME_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
}
/** Two net prices this close are the same price. */
const SAME_PRICE = 1e-9

const percent = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/* ---------- Header ---------- */

function EventHeader({ detail, now }: { detail: BestOddsEventDetail; now: number }) {
  const { event } = detail
  const nation = nationLabel(event.nationName, event.nationCode)
  return (
    <header className={cn(DS_PANEL, 'flex flex-col gap-2 px-4 py-4 sm:px-5')}>
      <p className="ds-body-sm m-0 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-ds-ink-muted">
        <span className="inline-flex text-ds-ink">
          <OmSportIcon sport={event.sportName} size={16} />
        </span>
        <span>{sportDisplay(event.sportName).label}</span>
        <span aria-hidden>·</span>
        <NationFlag
          code={event.nationCode}
          name={event.nationName}
          competitionName={event.competitionName}
          label={nation}
        />
        <span>{nation}</span>
        <span aria-hidden>·</span>
        <span className="font-semibold text-ds-ink">{event.competitionName}</span>
      </p>
      <h2 className="ds-title m-0 text-balance">{eventTitle(event)}</h2>
      <p className="ds-body m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-ds-ink-muted">
        <span className="tabular-nums">
          {capitalise(dayLabel(event.startTime, now))} · {formatKickoffTime(event.startTime)}
        </span>
        <span aria-hidden>·</span>
        <span>{countLabel(event.bookmakers, 'sito lo quota', 'siti lo quotano')}</span>
      </p>
    </header>
  )
}

/* ---------- Market, period, line ---------- */

function PickerRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="ds-label flex-none pt-2 text-ds-ink-muted uppercase sm:w-20">{label}</span>
      <div role="group" aria-label={label} className="flex min-w-0 flex-1 flex-wrap gap-2">
        {children}
      </div>
    </div>
  )
}

/**
 * The three steps to one market: the type («Under/Over»), its period when it has more than one
 * and its line or handicap when it has more than one. Each chip says how many sites price it.
 */
function MarketPicker({
  groups,
  selection,
  detail,
  onPick,
}: {
  groups: readonly BestOddsMarketGroup[]
  selection: MarketSelection
  detail: BestOddsEventDetail
  onPick: (marketId: string) => void
}) {
  const pickFirst = (markets: readonly BestOddsMarket[]) => {
    const market = defaultMarket(markets)
    if (market) onPick(market.id)
  }
  const hasHandicap = selection.variant.markets.some((m) => m.handicap != null)
  return (
    <div className={cn(DS_PANEL, 'flex flex-col gap-3 px-4 py-4 sm:px-5')}>
      <PickerRow label="Mercato">
        {groups.map((group) => {
          const active = group.key === selection.group.key
          return (
            <button
              key={group.key}
              type="button"
              aria-pressed={active}
              title={countLabel(group.sites, 'sito', 'siti')}
              onClick={() => pickFirst(group.variants[0].markets)}
              className={chipClass(active)}
            >
              {group.name}
              <ChipCount active={active}>{group.sites}</ChipCount>
            </button>
          )
        })}
      </PickerRow>
      {selection.group.variants.length > 1 && (
        <PickerRow label="Periodo">
          {selection.group.variants.map((variant) => {
            const active = variant.key === selection.variant.key
            return (
              <button
                key={variant.key}
                type="button"
                aria-pressed={active}
                onClick={() => pickFirst(variant.markets)}
                className={chipClass(active)}
              >
                {variantLabel(variant, detail.event)}
              </button>
            )
          })}
        </PickerRow>
      )}
      {selection.variant.markets.length > 1 && (
        <PickerRow label={hasHandicap ? 'Handicap' : 'Linea'}>
          {selection.variant.markets.map((market) => {
            const active = market.id === selection.market.id
            return (
              <button
                key={market.id}
                type="button"
                aria-pressed={active}
                title={countLabel(market.rows.length, 'sito', 'siti')}
                onClick={() => onPick(market.id)}
                className={cn(chipClass(active), 'tabular-nums')}
              >
                {marketLineLabel(market) ?? '—'}
                <ChipCount active={active}>{market.rows.length}</ChipCount>
              </button>
            )
          })}
        </PickerRow>
      )}
    </div>
  )
}

/* ---------- Outcomes ---------- */

/**
 * One outcome of the market: its best price and who has it. A click ranks the sites on it.
 */
function OutcomeCard({
  outcome,
  hint,
  best,
  active,
  compact,
  onPick,
}: {
  outcome: BestOddsOutcome
  hint: string | null
  best: OutcomeBest | undefined
  active: boolean
  compact: boolean
  onPick: () => void
}) {
  const leader = best?.bookmakers[0]
  const others = best ? best.bookmakers.length - 1 : 0
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col items-start gap-1.5 rounded-ds-md border text-left shadow-ds-sm transition-colors duration-150',
        compact ? 'px-3 py-2.5' : 'px-3 py-2.5 sm:px-4 sm:py-3',
        active
          ? 'border-ds-brand bg-ds-brand-soft'
          : 'border-ds-line bg-ds-surface-raised hover:bg-ds-surface-sunken',
        dsFocusRing,
      )}
    >
      <span className="flex w-full min-w-0 items-baseline gap-2">
        <span className={cn('ds-label flex-none', active ? 'text-ds-brand' : 'text-ds-ink')}>
          {outcomeName(outcome)}
        </span>
        {hint && <span className="ds-caption min-w-0 truncate text-ds-ink-muted">{hint}</span>}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className={cn(
            'font-semibold text-ds-ink tabular-nums',
            compact ? 'text-xl leading-7' : 'text-xl leading-7 sm:text-[28px] sm:leading-8',
          )}
        >
          {best ? formatOdds(best.net) : '—'}
        </span>
        {/* On an exchange the price on the site is higher: this one is what is left after the commission. */}
        {leader?.isExchange && <span className="ds-caption text-ds-ink-muted">netta</span>}
      </span>
      <span className="ds-caption flex min-h-5 w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-ds-ink-muted">
        {leader ? (
          <>
            <OmBookLogo slug={leader.slug} name={leader.name} size="sm" />
            {others > 0 && <span className="flex-none">+{others}</span>}
          </>
        ) : (
          <span>Nessun sito</span>
        )}
      </span>
    </button>
  )
}

/* ---------- The ranking ---------- */

const ageToneClass = { fresh: 'text-ds-ink-muted', aging: 'text-ds-warning', old: 'text-ds-loss' }

function Age({
  iso,
  now,
  staleAfterSeconds,
}: {
  iso: string
  now: number
  staleAfterSeconds: number
}) {
  const age = ageSeconds(iso, now)
  return (
    <span
      className={cn(
        'ds-body-sm whitespace-nowrap tabular-nums',
        ageToneClass[ageTone(age, staleAfterSeconds)],
      )}
      title={`Quota confermata dal sito ${ageLabel(age)} fa (alle ${formatClock(iso)})`}
    >
      {ageLabel(age)}
    </span>
  )
}

/** A price of the table: in profit when nobody pays more on that outcome. */
function Price({
  odds,
  bookmaker,
  commission,
  top,
  strong,
  lay,
}: {
  odds: number | undefined | null
  bookmaker: BestOddsBookmaker
  commission: number
  /** The best net price of the outcome. */
  top: number | undefined
  /** The column the table is ranked on. */
  strong: boolean
  lay?: number | null
}) {
  if (odds == null || !(odds > 1)) {
    return <span className="text-ds-ink-faint">—</span>
  }
  const net = netOdds(odds, bookmaker.isExchange, commission)
  const best = top != null && Math.abs(top - net) < SAME_PRICE
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span
        className={cn(
          'inline-flex h-7 min-w-[52px] items-center justify-end rounded-ds-sm px-2 tabular-nums',
          strong ? 'text-base font-semibold' : 'text-sm font-medium',
          best ? 'bg-ds-profit-soft text-ds-profit' : strong ? 'text-ds-ink' : 'text-ds-ink-muted',
        )}
        title={
          bookmaker.isExchange
            ? `Quota lorda ${formatOdds(odds)} · netta ${net.toFixed(3)} con commissione ${percent.format(commission * 100)} %`
            : undefined
        }
      >
        {formatOdds(odds)}
      </span>
      {bookmaker.isExchange && strong && (
        <span className="ds-caption flex flex-col items-end pr-2 whitespace-nowrap text-ds-ink-muted tabular-nums sm:flex-row sm:gap-1">
          <span>netta {formatOdds(net)}</span>
          {lay != null && lay > 1 && (
            <>
              <span aria-hidden className="max-sm:hidden">
                ·
              </span>
              <span className="text-ds-loss">banca {formatOdds(lay)}</span>
            </>
          )}
        </span>
      )}
    </span>
  )
}

function SiteCell({ entry, age }: { entry: RankedPrice; age: React.ReactNode }) {
  const { bookmaker } = entry
  const name = shortBookmakerName(bookmaker.name)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
      <BookmakerLink leg={{ bookmakerName: bookmaker.name, eventUrl: bookmaker.eventUrl }}>
        <OmBookLogo slug={bookmaker.slug} name={bookmaker.name} size="sm" />
      </BookmakerLink>
      <span className="ds-body-sm hidden min-w-0 truncate text-ds-ink xl:inline">{name}</span>
      {bookmaker.isExchange && <DsBadge tone="info">Exchange</DsBadge>}
      {entry.best && <DsBadge tone="profit">Migliore</DsBadge>}
      {/* On a phone the «Aggiornata» column has no room: the age goes here. */}
      <span className="basis-full sm:hidden">{age}</span>
    </span>
  )
}

/**
 * Every site that prices the market, from the one that pays the most on the chosen outcome down.
 * With up to three outcomes each has its column (a click on the heading ranks on it) and the best
 * price of each column is in profit; with more, only the chosen one. On a phone the table keeps
 * the site, the chosen outcome and the way to the site, and the age goes under the logo.
 */
function RankTable({
  market,
  outcome,
  ranked,
  best,
  detail,
  now,
  onPickOutcome,
}: {
  market: BestOddsMarket
  outcome: BestOddsOutcome
  ranked: readonly RankedPrice[]
  best: Record<string, OutcomeBest | undefined>
  detail: BestOddsEventDetail
  now: number
  onPickOutcome: (key: string) => void
}) {
  const everyColumn = market.outcomes.length <= MAX_OUTCOME_COLUMNS
  const columns = everyColumn ? market.outcomes : [outcome]
  const th = 'ds-label bg-ds-surface-sunken p-3 whitespace-nowrap text-ds-ink-muted uppercase'
  const td = 'border-t border-ds-line p-3 align-middle'
  return (
    // `relative`: the texts for screen readers are positioned, and would widen the page from in here.
    <div className="relative overflow-x-auto rounded-ds-md border border-ds-line bg-ds-surface-raised shadow-ds-sm">
      <table className="w-full border-collapse">
        <caption className="sr-only">
          {marketFullLabel(market, detail.event)}: i siti dal più alto al più basso su{' '}
          {outcomeName(outcome)}
        </caption>
        <thead>
          <tr>
            <th scope="col" className={cn(th, 'w-10 pl-4 text-left')}>
              <span aria-hidden>#</span>
              <span className="sr-only">Posizione</span>
            </th>
            <th scope="col" className={cn(th, 'text-left')}>
              Sito
            </th>
            {columns.map((column) => {
              const chosen = column.key === outcome.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={chosen ? 'descending' : undefined}
                  className={cn(th, 'text-right', !chosen && 'hidden md:table-cell')}
                >
                  {everyColumn ? (
                    <button
                      type="button"
                      onClick={() => onPickOutcome(column.key)}
                      title={`Ordina per ${outcomeName(column)}`}
                      className={cn(
                        'ds-label cursor-pointer rounded-ds-xs uppercase',
                        chosen ? 'text-ds-brand' : 'text-ds-ink-muted hover:text-ds-ink',
                        dsFocusRing,
                      )}
                    >
                      {outcomeName(column)}
                      {chosen && <span aria-hidden> ↓</span>}
                    </button>
                  ) : (
                    <>Quota {outcomeName(column)}</>
                  )}
                </th>
              )
            })}
            <th scope="col" className={cn(th, 'hidden text-right md:table-cell')}>
              Scarto
            </th>
            <th scope="col" className={cn(th, 'text-right max-sm:hidden')}>
              Aggiornata
            </th>
            <th scope="col" className={cn(th, 'pr-4')}>
              <span className="sr-only">Pagina dell&apos;evento sul sito</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((entry) => {
            const { bookmaker, row } = entry
            const name = shortBookmakerName(bookmaker.name)
            const age = (
              <Age
                iso={row.lastSeenAt}
                now={now}
                staleAfterSeconds={detail.event.staleAfterSeconds}
              />
            )
            return (
              <tr key={bookmaker.slug} className={cn(entry.odds == null && 'opacity-70')}>
                <td className={cn(td, 'ds-num-sm pl-4 text-ds-ink-muted')}>{entry.rank ?? '—'}</td>
                <td className={td}>
                  <SiteCell entry={entry} age={age} />
                </td>
                {columns.map((column) => {
                  const chosen = column.key === outcome.key
                  return (
                    <td
                      key={column.key}
                      className={cn(td, 'text-right', !chosen && 'hidden md:table-cell')}
                    >
                      <Price
                        odds={row.odds[column.key]}
                        bookmaker={bookmaker}
                        commission={detail.exchangeCommission}
                        top={best[column.key]?.net}
                        strong={chosen}
                        lay={row.lay?.[column.key]}
                      />
                    </td>
                  )
                })}
                <td
                  className={cn(
                    td,
                    'ds-num-sm hidden text-right whitespace-nowrap text-ds-ink-muted md:table-cell',
                  )}
                >
                  {entry.gap == null ? '—' : entry.gap === 0 ? '0,00' : `−${formatOdds(entry.gap)}`}
                </td>
                <td className={cn(td, 'text-right max-sm:hidden')}>{age}</td>
                <td className={cn(td, 'pr-4 text-right')}>
                  {bookmaker.eventUrl ? (
                    <a
                      href={bookmaker.eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Apri l'evento su ${name}`}
                      title={`Apri l'evento su ${name}`}
                      className={cn(dsButtonClass('secondary', 'sm'), 'max-sm:w-8 max-sm:px-0')}
                    >
                      <span className="max-sm:sr-only">Apri</span>
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- One market ---------- */

function MarketBoard({
  market,
  outcomeKey,
  onPickOutcome,
  detail,
  now,
}: {
  market: BestOddsMarket
  /** The outcome chosen on the market before; kept when this market has it too (Under, from line to line). */
  outcomeKey: string | null
  onPickOutcome: (key: string) => void
  detail: BestOddsEventDetail
  now: number
}) {
  const outcome = market.outcomes.find((o) => o.key === outcomeKey) ?? market.outcomes[0]
  const best = React.useMemo(
    () => bestByOutcome(market, detail.bookmakers, detail.exchangeCommission),
    [market, detail.bookmakers, detail.exchangeCommission],
  )
  const ranked = React.useMemo(
    () =>
      outcome ? rankMarket(market, outcome.key, detail.bookmakers, detail.exchangeCommission) : [],
    [market, outcome, detail.bookmakers, detail.exchangeCommission],
  )
  if (!outcome) return null
  const compact = market.outcomes.length > 6
  const hasExchange = ranked.some((r) => r.bookmaker.isExchange)
  const leaders = best[outcome.key]?.bookmakers ?? []

  return (
    <section className="flex flex-col gap-4" aria-label={marketFullLabel(market, detail.event)}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h3 className="ds-heading m-0">{marketFullLabel(market, detail.event)}</h3>
        <span className="ds-body-sm text-ds-ink-muted">
          Quotato da {countLabel(market.rows.length, 'sito', 'siti')} su {detail.bookmakers.length}
        </span>
      </header>

      <div
        role="group"
        aria-label="Esito"
        className={cn(
          'grid gap-3',
          compact
            ? 'grid-cols-[repeat(auto-fill,minmax(112px,1fr))]'
            : market.outcomes.length <= 3
              ? OUTCOME_COLUMNS[market.outcomes.length]
              : 'grid-cols-[repeat(auto-fit,minmax(140px,1fr))]',
        )}
      >
        {market.outcomes.map((o) => (
          <OutcomeCard
            key={o.key}
            outcome={o}
            hint={outcomeHint(market.marketTypeKey, o.key, detail.event)}
            best={best[o.key]}
            active={o.key === outcome.key}
            compact={compact}
            onPick={() => onPickOutcome(o.key)}
          />
        ))}
      </div>

      {leaders.length > 0 && (
        <p className="ds-body m-0 text-ds-ink" aria-live="polite">
          La quota più alta su <b className="font-semibold">{outcomeName(outcome)}</b> è{' '}
          <b className="font-semibold tabular-nums">{formatOdds(best[outcome.key]?.net ?? 0)}</b>
          {leaders[0].isExchange && ' netta'} su{' '}
          {leaders
            .slice(0, 3)
            .map((b) => shortBookmakerName(b.name))
            .join(', ')}
          {leaders.length > 3 && ` e altri ${leaders.length - 3}`}.
        </p>
      )}

      <RankTable
        market={market}
        outcome={outcome}
        ranked={ranked}
        best={best}
        detail={detail}
        now={now}
        onPickOutcome={onPickOutcome}
      />

      <p className="ds-caption m-0 text-ds-ink-muted">
        Le quote sono lette dai siti ogni dieci minuti circa: prima di giocare controlla la quota
        sulla pagina dell&apos;evento.
        {hasExchange &&
          ` Sugli exchange la quota è lorda: la classifica usa quella netta della commissione del ${percent.format(detail.exchangeCommission * 100)} %.`}
      </p>
    </section>
  )
}

/**
 * One event of Best Odds: who prices each of its markets and who pays the most. The market is
 * chosen in three steps (type, period, line), then an outcome; the table ranks every site on it.
 * It opens on the first market of the event and on its first outcome; the choices survive
 * «Aggiorna» as long as the market is still priced.
 */
export function BestOddsEventView({ detail, now }: { detail: BestOddsEventDetail; now: number }) {
  const groups = React.useMemo(() => groupMarkets(detail.markets), [detail.markets])
  const [marketId, setMarketId] = React.useState<string | null>(null)
  const [outcomeKey, setOutcomeKey] = React.useState<string | null>(null)
  const selection = selectMarket(groups, marketId)

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <EventHeader detail={detail} now={now} />
      {selection ? (
        <>
          <MarketPicker
            groups={groups}
            selection={selection}
            detail={detail}
            onPick={setMarketId}
          />
          <MarketBoard
            market={selection.market}
            outcomeKey={outcomeKey}
            onPickOutcome={setOutcomeKey}
            detail={detail}
            now={now}
          />
        </>
      ) : (
        <OmEmptyState
          title="Nessuna quota in questo momento"
          description="Nessun sito ha confermato una quota di questo evento nelle ultime ore. Riprova più tardi con «Aggiorna»."
        />
      )}
    </div>
  )
}
