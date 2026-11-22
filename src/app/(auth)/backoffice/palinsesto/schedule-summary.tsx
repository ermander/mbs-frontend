'use client'

import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'

import { BO_TILE_GRID, BoMuted, BoStatTile } from '@/components/backoffice/backoffice-ds'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DS_PANEL } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import type {
  ProviderScheduleSummaryDto,
  ProviderSyncRunDto,
} from '@/services/api/backoffice-provider-schedule-client'
import { ago, formatDate, formatDateTime, num, pct } from './format'

const RUN_TYPE_LABELS: Record<string, string> = {
  catalog: 'Catalogo (leghe e squadre)',
  fixtures: 'Fixture (stagione intera)',
  fixtures_near: 'Fixture (14 giorni, per data)',
  status: 'Stati (vicino al calcio d’inizio)',
}

const RUN_TYPE_ORDER = ['catalog', 'fixtures', 'fixtures_near', 'status']

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'in programma',
  live: 'in corso',
  closed: 'concluse',
  cancelled: 'annullate',
  postponed: 'rinviate',
  rescheduled: 'riprogrammate',
}

function runDetail(r: ProviderSyncRunDto): string {
  if (r.runType === 'catalog') return `${num(r.leaguesSynced)} leghe`
  if (r.runType === 'status') return `${num(r.fixturesUpdated)} aggiornate`
  return `${num(r.fixturesUpserted)} fixture`
}

function runTone(status: string): DsBadgeTone {
  if (status === 'success') return 'profit'
  if (status === 'failed') return 'loss'
  if (status === 'running' || status === 'partial') return 'warning'
  return 'neutral'
}

export function ScheduleSummary({
  summary,
  loading,
  error,
  now,
  onRefresh,
}: {
  summary: ProviderScheduleSummaryDto | null
  loading: boolean
  error: string | null
  /** Local clock of the page (ms since epoch), refreshed by the parent. */
  now: number
  onRefresh: () => void
}) {
  const runs = useMemo(() => {
    if (!summary) return []
    return [...summary.lastRuns].sort((a, b) => {
      if (a.sportKey !== b.sportKey) return a.sportKey.localeCompare(b.sportKey)
      return RUN_TYPE_ORDER.indexOf(a.runType) - RUN_TYPE_ORDER.indexOf(b.runType)
    })
  }, [summary])

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-ds-sm bg-ds-loss-soft px-3 py-2 text-sm text-ds-loss"
      >
        <span>{error}</span>
        <button type="button" onClick={onRefresh} className={dsButtonClass('secondary', 'sm')}>
          Riprova
        </button>
      </div>
    )
  }

  if (!summary) {
    return (
      <BoMuted>{loading ? 'Caricamento del riepilogo…' : 'Riepilogo non disponibile.'}</BoMuted>
    )
  }

  const t = summary.totals

  return (
    <div className="flex flex-col gap-3">
      {/* Per-sport cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.sports.map((s) => (
          <div key={s.sportId} className={cn(DS_PANEL, 'px-5 py-4')}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold text-ds-ink">{s.sportName}</div>
              <span className="font-mono text-xs text-ds-ink-muted">{s.sportKey ?? '—'}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl leading-8 font-semibold text-ds-ink tabular-nums">
                {num(s.fixturesFuture)}
              </span>
              <span className="text-xs text-ds-ink-muted">partite future</span>
            </div>
            <dl className="m-0 mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs tabular-nums">
              <dt className="text-ds-ink-muted">Prossimi 7 giorni</dt>
              <dd className="m-0 text-right text-ds-ink">{num(s.fixturesNext7Days)}</dd>
              <dt className="text-ds-ink-muted">Totale in catalogo</dt>
              <dd className="m-0 text-right text-ds-ink">{num(s.fixturesTotal)}</dd>
              <dt className="text-ds-ink-muted">Competizioni</dt>
              <dd className="m-0 text-right text-ds-ink">
                {num(s.competitionsWithFutureFixtures)}
                <span className="text-ds-ink-muted"> / {num(s.competitions)}</span>
              </dd>
              <dt
                className="text-ds-ink-muted"
                title="Competizioni per cui gli scraper leggono le quote dei bookmaker"
              >
                Lette dagli scraper
              </dt>
              <dd className="m-0 text-right text-ds-ink">
                {num(s.competitionsScrapeEnabled)}
                <span className="text-ds-ink-muted"> / {num(s.competitions)}</span>
              </dd>
              <dt className="text-ds-ink-muted">Dal · al</dt>
              <dd className="m-0 text-right text-ds-ink">
                {formatDate(s.firstStartTime)} · {formatDate(s.lastStartTime)}
              </dd>
              <dt className="text-ds-ink-muted">Ultima conferma provider</dt>
              <dd className="m-0 text-right text-ds-ink" title={formatDateTime(s.lastSeenAt)}>
                {ago(s.lastSeenAt, now)}
              </dd>
            </dl>
          </div>
        ))}
        {summary.sports.length === 0 && (
          <p className="text-sm text-ds-ink-muted">
            Nessuno sport con chiave api-sports nel catalogo: il sync del catalogo non è ancora
            girato.
          </p>
        )}
      </div>

      {/* Global KPIs */}
      <div className={BO_TILE_GRID}>
        <BoStatTile
          label="Partite future con almeno un bookmaker"
          value={`${num(t.futureWithBookmaker)} / ${num(t.fixturesFuture)}`}
          hint={pct(t.futureWithBookmaker, t.fixturesFuture)}
        />
        <BoStatTile
          label="Eventi in catalogo non da api-sports"
          value={num(t.nonProviderEvents)}
          hint={`${num(t.nonProviderFutureEvents)} futuri`}
        />
        <BoStatTile
          label="Leghe in whitelist"
          value={`${num(t.whitelistedLeaguesEnabled)} / ${num(t.whitelistedLeagues)}`}
          hint="abilitate / totali"
        />
        <BoStatTile
          label="Chiamate api-sports oggi"
          value={
            summary.budget
              ? `${num(summary.budget.callsUsed)} / ${num(summary.budget.planDailyLimit)}`
              : '—'
          }
          hint={
            summary.budget
              ? `ultima ${ago(summary.budget.lastCallAt, now)}`
              : 'budget non leggibile'
          }
        />
      </div>

      {/* Sync runs + provider statuses */}
      <details className={DS_PANEL}>
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 font-semibold text-ds-ink select-none">
          <span>Sincronizzazioni api-sports e stati delle partite future</span>
          <span className="ds-caption font-normal text-ds-ink-muted">
            aggiornato {ago(summary.now, now)}
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault()
              onRefresh()
            }}
            className={cn(dsButtonClass('secondary', 'sm'), 'disabled:opacity-60')}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
            {loading ? 'Aggiorno…' : 'Aggiorna'}
          </button>
        </summary>
        <div className="grid grid-cols-1 gap-5 border-t border-ds-line px-5 py-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="ds-label mb-2 text-ds-ink-muted uppercase">Ultimo run per tipo</div>
            {runs.length === 0 ? (
              <p className="text-sm text-ds-ink-muted">Nessun run registrato.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ds-ink-muted">
                      <th className="py-1 pr-3 font-semibold">Sport</th>
                      <th className="py-1 pr-3 font-semibold">Tipo</th>
                      <th className="py-1 pr-3 font-semibold">Esito</th>
                      <th className="py-1 pr-3 font-semibold">Quando</th>
                      <th className="py-1 pr-3 font-semibold">Dettaglio</th>
                      <th className="py-1 font-semibold">Chiamate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={`${r.sportKey}-${r.runType}`} className="border-t border-ds-line">
                        <td className="py-1.5 pr-3 font-mono text-xs text-ds-ink">{r.sportKey}</td>
                        <td className="py-1.5 pr-3 text-ds-ink">
                          {RUN_TYPE_LABELS[r.runType] ?? r.runType}
                        </td>
                        <td className="py-1.5 pr-3">
                          <DsBadge tone={runTone(r.status)}>{r.status}</DsBadge>
                          {r.error && (
                            <span className="ml-2 text-xs text-ds-loss" title={r.error}>
                              {r.error.slice(0, 60)}
                              {r.error.length > 60 ? '…' : ''}
                            </span>
                          )}
                        </td>
                        <td
                          className="py-1.5 pr-3 text-ds-ink-muted"
                          title={formatDateTime(r.completedAt ?? r.startedAt)}
                        >
                          {ago(r.completedAt ?? r.startedAt, now)}
                        </td>
                        <td className="py-1.5 pr-3 text-ds-ink">{runDetail(r)}</td>
                        <td className="py-1.5 text-ds-ink">{num(r.apiCallsUsed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="ds-label mb-2 text-ds-ink-muted uppercase">
              Partite future per stato (canonico / codice api-sports)
            </div>
            {summary.futureByStatus.length === 0 ? (
              <p className="text-sm text-ds-ink-muted">Nessuna partita futura.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {summary.futureByStatus.map((r) => (
                  <li
                    key={`${r.status}-${r.providerStatus ?? 'null'}`}
                    className="rounded-ds-sm border border-ds-line bg-ds-surface px-2 py-1 text-xs"
                  >
                    <span className="text-ds-ink">{STATUS_LABELS[r.status] ?? r.status}</span>
                    <span className="mx-1 font-mono text-ds-ink-muted">
                      {r.providerStatus ?? '∅'}
                    </span>
                    <span className="font-semibold text-ds-ink">{num(r.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>
    </div>
  )
}
