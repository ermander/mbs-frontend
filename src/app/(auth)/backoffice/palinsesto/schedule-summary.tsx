'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

function runVariant(status: string): 'success' | 'destructive' | 'warning' | 'outline' {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'destructive'
  if (status === 'running' || status === 'partial') return 'warning'
  return 'outline'
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
      <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={onRefresh}>
          Riprova
        </Button>
      </div>
    )
  }

  if (!summary) {
    return (
      <p className="mb-4 text-sm text-muted-foreground">
        {loading ? 'Caricamento del riepilogo...' : 'Riepilogo non disponibile.'}
      </p>
    )
  }

  const t = summary.totals

  return (
    <div className="mb-4 space-y-3">
      {/* Per-sport cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summary.sports.map((s) => (
          <div key={s.sportId} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">{s.sportName}</div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {s.sportKey ?? '—'}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">
                {num(s.fixturesFuture)}
              </span>
              <span className="text-xs text-muted-foreground">partite future</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Prossimi 7 giorni</dt>
              <dd className="text-right text-foreground">{num(s.fixturesNext7Days)}</dd>
              <dt className="text-muted-foreground">Totale in catalogo</dt>
              <dd className="text-right text-foreground">{num(s.fixturesTotal)}</dd>
              <dt className="text-muted-foreground">Competizioni</dt>
              <dd className="text-right text-foreground">
                {num(s.competitionsWithFutureFixtures)}
                <span className="text-muted-foreground"> / {num(s.competitions)}</span>
              </dd>
              <dt
                className="text-muted-foreground"
                title="Competizioni per cui gli scraper leggono le quote dei bookmaker"
              >
                Lette dagli scraper
              </dt>
              <dd className="text-right text-foreground">
                {num(s.competitionsScrapeEnabled)}
                <span className="text-muted-foreground"> / {num(s.competitions)}</span>
              </dd>
              <dt className="text-muted-foreground">Dal · al</dt>
              <dd className="text-right text-foreground">
                {formatDate(s.firstStartTime)} · {formatDate(s.lastStartTime)}
              </dd>
              <dt className="text-muted-foreground">Ultima conferma provider</dt>
              <dd className="text-right text-foreground" title={formatDateTime(s.lastSeenAt)}>
                {ago(s.lastSeenAt, now)}
              </dd>
            </dl>
          </div>
        ))}
        {summary.sports.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nessuno sport con chiave api-sports nel catalogo: il sync del catalogo non è ancora
            girato.
          </p>
        )}
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Partite future con almeno un bookmaker"
          value={`${num(t.futureWithBookmaker)} / ${num(t.fixturesFuture)}`}
          hint={pct(t.futureWithBookmaker, t.fixturesFuture)}
        />
        <Kpi
          label="Eventi in catalogo non da api-sports"
          value={num(t.nonProviderEvents)}
          hint={`${num(t.nonProviderFutureEvents)} futuri`}
        />
        <Kpi
          label="Leghe in whitelist"
          value={`${num(t.whitelistedLeaguesEnabled)} / ${num(t.whitelistedLeagues)}`}
          hint="abilitate / totali"
        />
        <Kpi
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
      <details className="rounded-lg border border-border bg-card">
        <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium text-foreground">
          Sincronizzazioni api-sports e stati delle partite future
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (aggiornato {ago(summary.now, now)})
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-3"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault()
              onRefresh()
            }}
          >
            {loading ? 'Aggiorno...' : 'Aggiorna'}
          </Button>
        </summary>
        <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-3 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-1 font-mono text-xs uppercase tracking-[0.02em] text-muted-foreground">
              Ultimo run per tipo
            </div>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun run registrato.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">Sport</th>
                    <th className="py-1 pr-3 font-medium">Tipo</th>
                    <th className="py-1 pr-3 font-medium">Esito</th>
                    <th className="py-1 pr-3 font-medium">Quando</th>
                    <th className="py-1 pr-3 font-medium">Dettaglio</th>
                    <th className="py-1 font-medium">Chiamate</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={`${r.sportKey}-${r.runType}`} className="border-t border-border">
                      <td className="py-1.5 pr-3 font-mono text-xs text-foreground">
                        {r.sportKey}
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">
                        {RUN_TYPE_LABELS[r.runType] ?? r.runType}
                      </td>
                      <td className="py-1.5 pr-3">
                        <Badge variant={runVariant(r.status)}>{r.status}</Badge>
                        {r.error && (
                          <span className="ml-2 text-xs text-destructive" title={r.error}>
                            {r.error.slice(0, 60)}
                            {r.error.length > 60 ? '…' : ''}
                          </span>
                        )}
                      </td>
                      <td
                        className="py-1.5 pr-3 text-muted-foreground"
                        title={formatDateTime(r.completedAt ?? r.startedAt)}
                      >
                        {ago(r.completedAt ?? r.startedAt, now)}
                      </td>
                      <td className="py-1.5 pr-3 text-foreground">{runDetail(r)}</td>
                      <td className="py-1.5 text-foreground">{num(r.apiCallsUsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="mb-1 font-mono text-xs uppercase tracking-[0.02em] text-muted-foreground">
              Partite future per stato (canonico / codice api-sports)
            </div>
            {summary.futureByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna partita futura.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {summary.futureByStatus.map((r) => (
                  <li
                    key={`${r.status}-${r.providerStatus ?? 'null'}`}
                    className="rounded-md border border-border bg-surface-1 px-2 py-1 text-xs"
                  >
                    <span className="text-foreground">{STATUS_LABELS[r.status] ?? r.status}</span>
                    <span className="mx-1 font-mono text-muted-foreground">
                      {r.providerStatus ?? '∅'}
                    </span>
                    <span className="font-semibold text-foreground">{num(r.count)}</span>
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

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
