'use client'

import Link from 'next/link'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getEventBookmakers } from '@/services/api/odds-collection-client'
import type { EventBookmaker } from '@/types/odds-collection'
import type {
  OdEventStatus,
  ProviderFixtureDto,
} from '@/services/api/backoffice-provider-schedule-client'
import { Flag } from './schedule-tree'
import { ago, formatDateTime, formatDayHeading, formatTime, localDayKey, num } from './format'

const STATUS_VARIANT: Record<
  OdEventStatus,
  'info' | 'success' | 'outline' | 'destructive' | 'warning' | 'lavender'
> = {
  scheduled: 'info',
  live: 'success',
  closed: 'outline',
  cancelled: 'destructive',
  postponed: 'warning',
  rescheduled: 'lavender',
}

const STATUS_LABEL: Record<OdEventStatus, string> = {
  scheduled: 'in programma',
  live: 'in corso',
  closed: 'conclusa',
  cancelled: 'annullata',
  postponed: 'rinviata',
  rescheduled: 'riprogrammata',
}

const MATCH_STATUS_VARIANT: Record<
  string,
  'success' | 'info' | 'warning' | 'destructive' | 'outline'
> = {
  auto_confirmed: 'success',
  high_confidence: 'info',
  manual_confirmed: 'success',
  review_needed: 'warning',
  rejected: 'destructive',
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
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2 text-sm">
        <span className="text-foreground">
          <span className="font-semibold">{num(total)}</span> partite
          {total > 0 && (
            <span className="text-muted-foreground">
              {' '}
              · {num(from)}–{num(to)} in questa pagina, ordinate per calcio d’inizio
            </span>
          )}
        </span>
        <Pager offset={offset} limit={limit} total={total} onPageChange={onPageChange} />
      </div>

      <div className="relative flex-1 overflow-auto">
        {loading && fixtures.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-background/60 py-1 text-center text-xs text-muted-foreground backdrop-blur-sm">
            aggiorno…
          </div>
        )}
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <tr className="text-left text-xs text-muted-foreground">
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
                <td colSpan={COLUMNS} className="px-4 py-6 text-center text-destructive">
                  {error}
                </td>
              </tr>
            ) : loading && fixtures.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS} className="px-4 py-6 text-center text-muted-foreground">
                  Caricamento...
                </td>
              </tr>
            ) : fixtures.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS} className="px-4 py-6 text-center text-muted-foreground">
                  Nessuna partita con questi filtri.
                </td>
              </tr>
            ) : (
              groups.map((g) => (
                <Fragment key={g.day}>
                  <tr className="sticky top-[33px] z-[5] bg-surface-1">
                    <td
                      colSpan={COLUMNS}
                      className="border-y border-border px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.02em] text-foreground"
                    >
                      {g.heading}
                      <span className="ml-2 font-normal normal-case text-muted-foreground">
                        {num(g.rows.length)} in pagina
                      </span>
                    </td>
                  </tr>
                  {g.rows.map((f) => (
                    <Fragment key={f.eventId}>
                      <tr
                        onClick={() => setExpandedId(expanded === f.eventId ? null : f.eventId)}
                        className={`cursor-pointer border-t border-border transition-colors hover:bg-accent ${
                          expanded === f.eventId ? 'bg-accent/60' : ''
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-foreground">
                          {formatTime(f.startTime)}
                        </td>
                        <td className="max-w-[16rem] px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Flag countryCode={f.countryCode} name={f.categoryName} />
                            <span
                              className="truncate text-foreground"
                              title={`${f.categoryName} · ${f.competitionName}`}
                            >
                              {f.competitionName}
                            </span>
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {f.categoryName}
                            {f.sportSlug !== 'football' ? ` · ${f.sportName}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-foreground">
                          <span className="font-medium">{f.homeName ?? '—'}</span>
                          <span className="mx-1.5 text-muted-foreground">–</span>
                          <span className="font-medium">{f.awayName ?? '—'}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2">
                          <Badge variant={STATUS_VARIANT[f.status] ?? 'outline'}>
                            {STATUS_LABEL[f.status] ?? f.status}
                          </Badge>
                          <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                            {f.providerStatus ?? '∅'}
                          </span>
                        </td>
                        <td
                          className="max-w-[10rem] truncate px-4 py-2 text-xs text-muted-foreground"
                          title={f.round ?? undefined}
                        >
                          {f.round ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-xs">
                          <BookCount mapped={f.bookmakersMapped} withOdds={f.bookmakersWithOdds} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-muted-foreground">
                          {f.apisportsFixtureId}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground"
                          title={formatDateTime(f.lastSeenAt)}
                        >
                          {ago(f.lastSeenAt, now)}
                        </td>
                      </tr>
                      {expanded === f.eventId && (
                        <tr className="border-t border-border bg-surface-1/60">
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
        <div className="flex shrink-0 items-center justify-end border-t border-border px-4 py-2">
          <Pager offset={offset} limit={limit} total={total} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}

function Th({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <th className="px-4 py-2 font-medium" title={title}>
      {children}
    </th>
  )
}

function BookCount({ mapped, withOdds }: { mapped: number; withOdds: number }) {
  const cls =
    withOdds > 0 ? 'text-emerald-400' : mapped > 0 ? 'text-amber-400' : 'text-muted-foreground'
  return (
    <span
      className={`font-mono ${cls}`}
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
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>
        pagina {num(page)} di {num(pages)}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={offset === 0}
        onClick={() => onPageChange(Math.max(0, offset - limit))}
      >
        Precedenti
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={offset + limit >= total}
        onClick={() => onPageChange(offset + limit)}
      >
        Successive
      </Button>
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
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
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
          <span className="font-mono uppercase tracking-[0.02em] text-muted-foreground">
            Bookmaker collegati dal matcher
          </span>
          {bookmakers && <span className="text-muted-foreground">({num(bookmakers.length)})</span>}
        </div>
        {loading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : !bookmakers || bookmakers.length === 0 ? (
          <p className="text-muted-foreground">
            Nessun bookmaker ha ancora un mapping su questa partita.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Bookmaker</th>
                <th className="py-1 pr-3 font-medium">Nomi del bookmaker</th>
                <th className="py-1 pr-3 font-medium">Competizione del bookmaker</th>
                <th className="py-1 pr-3 font-medium">Mapping</th>
                <th className="py-1 pr-3 font-medium">Metodo</th>
                <th className="py-1 font-medium">Conf.</th>
              </tr>
            </thead>
            <tbody>
              {bookmakers.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="py-1 pr-3">
                    <Link
                      href={`/backoffice/scrapers/${b.bookmakerSlug}`}
                      className="text-primary hover:underline"
                    >
                      {b.bookmakerName}
                    </Link>
                  </td>
                  <td className="py-1 pr-3 text-foreground">
                    {b.bookmakerHomeName ?? '—'} – {b.bookmakerAwayName ?? '—'}
                  </td>
                  <td className="py-1 pr-3 text-muted-foreground">
                    {b.bookmakerCompetitionName ?? '—'}
                  </td>
                  <td className="py-1 pr-3">
                    <Badge variant={MATCH_STATUS_VARIANT[b.matchStatus] ?? 'outline'}>
                      {b.matchStatus}
                    </Badge>
                  </td>
                  <td className="py-1 pr-3 font-mono text-muted-foreground">{b.matchMethod}</td>
                  <td className="py-1 font-mono text-muted-foreground">
                    {Number.isFinite(b.matchConfidence) ? b.matchConfidence.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Dt({ children }: { children: ReactNode }) {
  return <dt className="text-muted-foreground">{children}</dt>
}

function Dd({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <dd className={`text-foreground ${mono ? 'font-mono' : ''}`}>{children}</dd>
}
