'use client'

import Link from 'next/link'
import { Fragment, useEffect, useState, type ReactNode } from 'react'

import { BoCode, boLink, matchStatusTone } from '@/components/backoffice/backoffice-ds'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { DS_PANEL } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { getEventBookmakers } from '@/services/api/odds-collection-client'
import type { EventBookmaker } from '@/types/odds-collection'
import type {
  OdEventStatus,
  ProviderFixtureDto,
} from '@/services/api/backoffice-provider-schedule-client'
import { Flag } from './schedule-tree'
import { ago, formatDateTime, formatDayHeading, formatTime, localDayKey, num } from './format'

const STATUS_TONE: Record<OdEventStatus, DsBadgeTone> = {
  scheduled: 'info',
  live: 'profit',
  closed: 'neutral',
  cancelled: 'loss',
  postponed: 'warning',
  rescheduled: 'brand',
}

const STATUS_LABEL: Record<OdEventStatus, string> = {
  scheduled: 'in programma',
  live: 'in corso',
  closed: 'conclusa',
  cancelled: 'annullata',
  postponed: 'rinviata',
  rescheduled: 'riprogrammata',
}

const COLUMNS = 8

export function FixturesTable({
  fixtures,
  total,
  limit,
  offset,
  loading,
  error,
  now,
  onPageChange,
}: {
  fixtures: ProviderFixtureDto[]
  total: number
  limit: number
  offset: number
  loading: boolean
  error: string | null
  now: number
  onPageChange: (offset: number) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Derived: a row stays open only while its fixture is on the page, so a new
  // page or filter closes it without an effect.
  const expanded =
    expandedId !== null && fixtures.some((f) => f.eventId === expandedId) ? expandedId : null

  const groups: Array<{ day: string; heading: string; rows: ProviderFixtureDto[] }> = []
  for (const f of fixtures) {
    const day = localDayKey(f.startTime)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.rows.push(f)
    else groups.push({ day, heading: formatDayHeading(f.startTime), rows: [f] })
  }

  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  return (
    <div className={cn(DS_PANEL, 'flex min-w-0 flex-col overflow-hidden lg:h-full')}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ds-line px-4 py-2.5 text-sm">
        <span className="text-ds-ink">
          <span className="font-semibold">{num(total)}</span> partite
          {total > 0 && (
            <span className="text-ds-ink-muted">
              {' '}
              · {num(from)}–{num(to)} in questa pagina, ordinate per calcio d’inizio
            </span>
          )}
        </span>
        <Pager offset={offset} limit={limit} total={total} onPageChange={onPageChange} />
      </div>

      <div className="relative flex-1 overflow-auto">
        {loading && fixtures.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-ds-surface-raised/70 py-1 text-center text-xs text-ds-ink-muted backdrop-blur-xs">
            aggiorno…
          </div>
        )}
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-ds-surface-sunken">
            <tr className="text-left text-xs tracking-[0.02em] text-ds-ink-muted uppercase">
              <Th>Ora</Th>
              <Th>Competizione</Th>
              <Th>Partita</Th>
              <Th>Stato</Th>
              <Th>Giornata</Th>
              <Th title="Bookmaker con mapping · bookmaker con quote attive">Book</Th>
              <Th>ID fixture</Th>
              <Th title="Ultima conferma da api-sports">Visto</Th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={COLUMNS} className="px-4 py-6 text-center text-ds-loss">
                  {error}
                </td>
              </tr>
            ) : loading && fixtures.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS} className="px-4 py-6 text-center text-ds-ink-muted">
                  Caricamento delle partite…
                </td>
              </tr>
            ) : fixtures.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS} className="px-4 py-6 text-center text-ds-ink-muted">
                  Nessuna partita con questi filtri.
                </td>
              </tr>
            ) : (
              groups.map((g) => (
                <Fragment key={g.day}>
                  <tr className="sticky top-[32px] z-5 bg-ds-surface">
                    <td
                      colSpan={COLUMNS}
                      className="ds-label border-y border-ds-line px-4 py-1.5 text-ds-ink uppercase"
                    >
                      {g.heading}
                      <span className="ml-2 font-normal tracking-normal text-ds-ink-muted normal-case">
                        {num(g.rows.length)} in pagina
                      </span>
                    </td>
                  </tr>
                  {g.rows.map((f) => (
                    <Fragment key={f.eventId}>
                      <tr
                        // La riga si apre anche da tastiera (Invio o spazio): prima solo col clic.
                        tabIndex={0}
                        aria-expanded={expanded === f.eventId}
                        onClick={() => setExpandedId(expanded === f.eventId ? null : f.eventId)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return
                          e.preventDefault()
                          setExpandedId(expanded === f.eventId ? null : f.eventId)
                        }}
                        className={cn(
                          'cursor-pointer border-t border-ds-line transition-colors hover:bg-ds-surface-sunken/60',
                          dsFocusRing,
                          expanded === f.eventId && 'bg-ds-surface-sunken',
                        )}
                      >
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-ds-ink">
                          {formatTime(f.startTime)}
                        </td>
                        <td className="max-w-[16rem] px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Flag countryCode={f.countryCode} name={f.categoryName} />
                            <span
                              className="truncate text-ds-ink"
                              title={`${f.categoryName} · ${f.competitionName}`}
                            >
                              {f.competitionName}
                            </span>
                          </div>
                          <div className="ds-caption truncate text-ds-ink-muted">
                            {f.categoryName}
                            {f.sportSlug !== 'football' ? ` · ${f.sportName}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-ds-ink">
                          <span className="font-medium">{f.homeName ?? '—'}</span>
                          <span className="mx-1.5 text-ds-ink-muted">–</span>
                          <span className="font-medium">{f.awayName ?? '—'}</span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <DsBadge tone={STATUS_TONE[f.status] ?? 'neutral'}>
                            {STATUS_LABEL[f.status] ?? f.status}
                          </DsBadge>
                          <span className="ml-1.5 font-mono text-[11px] text-ds-ink-muted">
                            {f.providerStatus ?? '∅'}
                          </span>
                        </td>
                        <td
                          className="max-w-40 truncate px-4 py-2 text-xs text-ds-ink-muted"
                          title={f.round ?? undefined}
                        >
                          {f.round ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                          <BookCount mapped={f.bookmakersMapped} withOdds={f.bookmakersWithOdds} />
                        </td>
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap text-ds-ink-muted">
                          {f.apisportsFixtureId}
                        </td>
                        <td
                          className="px-4 py-2 text-xs whitespace-nowrap text-ds-ink-muted"
                          title={formatDateTime(f.lastSeenAt)}
                        >
                          {ago(f.lastSeenAt, now)}
                        </td>
                      </tr>
                      {expanded === f.eventId && (
                        <tr className="border-t border-ds-line bg-ds-surface-sunken/40">
                          <td colSpan={COLUMNS} className="px-4 py-3">
                            <FixtureDetails fixture={f} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="flex shrink-0 items-center justify-end border-t border-ds-line px-4 py-2.5">
          <Pager offset={offset} limit={limit} total={total} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}

function Th({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <th className="px-4 py-2 font-semibold whitespace-nowrap" title={title}>
      {children}
    </th>
  )
}

function BookCount({ mapped, withOdds }: { mapped: number; withOdds: number }) {
  const cls =
    withOdds > 0
      ? 'font-semibold text-ds-profit'
      : mapped > 0
        ? 'font-semibold text-ds-warning'
        : 'text-ds-ink-muted'
  return (
    <span
      className={cn('font-mono', cls)}
      title={`${mapped} con mapping · ${withOdds} con quote attive`}
    >
      {mapped} · {withOdds}
    </span>
  )
}

function Pager({
  offset,
  limit,
  total,
  onPageChange,
}: {
  offset: number
  limit: number
  total: number
  onPageChange: (offset: number) => void
}) {
  if (total <= limit) return null
  const page = Math.floor(offset / limit) + 1
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="flex items-center gap-2 text-xs text-ds-ink-muted tabular-nums">
      <span>
        pagina {num(page)} di {num(pages)}
      </span>
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => onPageChange(Math.max(0, offset - limit))}
        className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
      >
        Precedenti
      </button>
      <button
        type="button"
        disabled={offset + limit >= total}
        onClick={() => onPageChange(offset + limit)}
        className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-50')}
      >
        Successive
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------
// Expanded row: provider identifiers + the bookmakers attached by the matcher
// ---------------------------------------------------------------------

function FixtureDetails({ fixture }: { fixture: ProviderFixtureDto }) {
  // The result is keyed by the fixture it answers: «loading» is derived from the
  // key not matching, so the effect only touches state inside the promise callbacks.
  const [result, setResult] = useState<{
    eventId: string
    rows: EventBookmaker[] | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    const eventId = fixture.eventId
    getEventBookmakers(eventId)
      .then((rows) => {
        if (!cancelled) setResult({ eventId, rows, error: null })
      })
      .catch(() => {
        if (!cancelled)
          setResult({
            eventId,
            rows: null,
            error: 'Errore nel caricamento dei bookmaker collegati.',
          })
      })
    return () => {
      cancelled = true
    }
  }, [fixture.eventId])

  const current = result && result.eventId === fixture.eventId ? result : null
  const loading = current === null
  const error = current?.error ?? null
  const bookmakers = current?.rows ?? null

  return (
    <div className="grid grid-cols-1 gap-4 text-xs lg:grid-cols-3">
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <Dt>Fixture api-sports</Dt>
        <Dd mono>{fixture.apisportsFixtureId}</Dd>
        <Dt>Lega api-sports</Dt>
        <Dd mono>{fixture.apisportsLeagueId ?? '—'}</Dd>
        <Dt>Stagione</Dt>
        <Dd>{fixture.seasonYear ?? '—'}</Dd>
        <Dt>Squadre (id)</Dt>
        <Dd mono>
          {fixture.homeApisportsTeamId ?? '—'} · {fixture.awayApisportsTeamId ?? '—'}
        </Dd>
        <Dt>Sede</Dt>
        <Dd>{fixture.venue ?? '—'}</Dd>
        <Dt>Calcio d’inizio</Dt>
        <Dd>{formatDateTime(fixture.startTime)}</Dd>
        <Dt>Prima volta nel catalogo</Dt>
        <Dd>{formatDateTime(fixture.firstSeenAt)}</Dd>
        <Dt>Ultima conferma provider</Dt>
        <Dd>{formatDateTime(fixture.lastSeenAt)}</Dd>
        <Dt>Evento canonico</Dt>
        <Dd mono>{fixture.eventId}</Dd>
      </dl>
      <div className="lg:col-span-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="ds-label text-ds-ink-muted uppercase">
            Bookmaker collegati dal matcher
          </span>
          {bookmakers && <span className="text-ds-ink-muted">({num(bookmakers.length)})</span>}
        </div>
        {loading ? (
          <p className="text-ds-ink-muted">Caricamento…</p>
        ) : error ? (
          <p className="text-ds-loss">{error}</p>
        ) : !bookmakers || bookmakers.length === 0 ? (
          <p className="text-ds-ink-muted">
            Nessun bookmaker ha ancora un mapping su questa partita.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-ds-ink-muted">
                  <th className="py-1 pr-3 font-semibold">Bookmaker</th>
                  <th className="py-1 pr-3 font-semibold">Nomi del bookmaker</th>
                  <th className="py-1 pr-3 font-semibold">Competizione del bookmaker</th>
                  <th className="py-1 pr-3 font-semibold">Mapping</th>
                  <th className="py-1 pr-3 font-semibold">Metodo</th>
                  <th className="py-1 font-semibold">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {bookmakers.map((b) => (
                  <tr key={b.id} className="border-t border-ds-line">
                    <td className="py-1 pr-3">
                      <Link href={`/backoffice/scrapers/${b.bookmakerSlug}`} className={boLink}>
                        {b.bookmakerName}
                      </Link>
                    </td>
                    <td className="py-1 pr-3 text-ds-ink">
                      {b.bookmakerHomeName ?? '—'} – {b.bookmakerAwayName ?? '—'}
                    </td>
                    <td className="py-1 pr-3 text-ds-ink-muted">
                      {b.bookmakerCompetitionName ?? '—'}
                    </td>
                    <td className="py-1 pr-3">
                      <DsBadge tone={matchStatusTone(b.matchStatus)}>{b.matchStatus}</DsBadge>
                    </td>
                    <td className="py-1 pr-3">
                      <BoCode>{b.matchMethod}</BoCode>
                    </td>
                    <td className="py-1 font-mono text-ds-ink-muted">
                      {Number.isFinite(b.matchConfidence) ? b.matchConfidence.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Dt({ children }: { children: ReactNode }) {
  return <dt className="text-ds-ink-muted">{children}</dt>
}

function Dd({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <dd className={cn('m-0 text-ds-ink', mono && 'font-mono')}>{children}</dd>
}
