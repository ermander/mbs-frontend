'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { BoDot, BoPanel, BoStat, BoMuted, type BoTone } from '@/components/backoffice/backoffice-ds'
import { DsBadge } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { getOddsHealth } from '@/services/api/odds-collection-client'
import type { HealthCron, HealthReport } from '@/types/odds-collection'
import { TrendCharts } from './trend-charts'

const POLL_MS = 30_000

const CRON_LABELS: Record<string, string> = {
  OdOpsAlerts: 'Alert operativi',
  OdProviderCatalogSync: 'Catalogo api-sports',
  OdProviderFixturesSync: 'Fixture api-sports (stagione)',
  OdProviderFixturesNearSync: 'Fixture api-sports (14 giorni)',
  OdProviderStatusSync: 'Stati api-sports',
  OdEventDiscovery: 'Discovery',
  OdOddsRefresh: 'Refresh quote',
  OdMatcherCalculation: 'Matcher (tick)',
  OdMatcherRebuild: 'Matcher (rebuild)',
  OdReconciliation: 'Riconciliazione',
  OdOpsMetricsSample: 'Campioni metriche',
}

const RUN_TYPE_LABELS: Record<string, string> = {
  catalog: 'Catalogo',
  fixtures: 'Fixture (stagione)',
  fixtures_near: 'Fixture (14 giorni, per data)',
  status: 'Stati',
}

const QUEUE_LABELS: Record<string, string> = {
  pending: 'In attesa',
  attached: 'Agganciati',
  rejected: 'Rifiutati',
  created_canonical: 'Creati',
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function ago(iso: string | null, now: number): string {
  if (!iso) return 'mai'
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds} s fa`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min fa`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min fa`
}

function until(iso: string | null, now: number): string {
  if (!iso) return '—'
  const seconds = Math.max(0, Math.round((new Date(iso).getTime() - now) / 1000))
  if (seconds < 60) return `${seconds} s`
  return `${Math.round(seconds / 60)} min`
}

function duration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`
}

function bytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`
  return `${(n / 1024).toFixed(0)} KB`
}

const num = (n: number) => n.toLocaleString('it-IT')

/** L'intestazione delle tabelle dentro i riquadri: piccola, in ink-muted. */
const INNER_THEAD = 'text-xs text-ds-ink-muted'

function cronTone(c: HealthCron | null, now: number, staleMinutes: number): BoTone {
  if (!c || !c.scheduledAt) return 'off'
  if (
    c.lastFailureAt &&
    (!c.lastSuccessAt || new Date(c.lastFailureAt) > new Date(c.lastSuccessAt))
  )
    return 'bad'
  if (!c.lastSuccessAt) return 'warn'
  return now - new Date(c.lastSuccessAt).getTime() > staleMinutes * 60_000 ? 'warn' : 'ok'
}

// Lo stato di salute della raccolta quote, letto ogni 30 secondi. Dal §14.365 sul design OddWise:
// riquadri surface-raised, pallini e badge nei colori di stato del design, grafici sui token.
export default function BackofficeSalutePage() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(() => Date.now())

  // Lo stato cambia solo nei callback della promise, così l'effetto può chiamarlo
  // (react-hooks/set-state-in-effect).
  const load = useCallback(
    () =>
      getOddsHealth(24)
        .then((data) => {
          setReport(data)
          setError(null)
        })
        .catch(() => setError('Errore nel caricamento dello stato di salute.'))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    void load()
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, POLL_MS)
    const tick = setInterval(() => setClock(Date.now()), 5_000)
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [load])

  const now = clock

  return (
    <>
      <DsPageHeader
        title="Salute della raccolta quote"
        description="Adapter, cron, matcher, catalogo api-sports e coda di revisione: la stessa lettura degli alert Telegram, aggiornata ogni 30 secondi."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {report && (
              <span className="ds-body-sm text-ds-ink-muted">
                Letto {ago(report.now, now)} · backend avviato {ago(report.bootedAt, now)}
              </span>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className={dsButtonClass('secondary', 'md')}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Aggiorna
            </button>
          </div>
        }
      />

      {error && <DsAlert>{error}</DsAlert>}
      {loading && !report && (
        <BoMuted className="py-6 text-center">Caricamento dello stato di salute…</BoMuted>
      )}

      {report && (
        <div className="flex flex-col gap-4">
          {/* Global state + alerts */}
          <div
            className={cn(
              'rounded-ds-md border px-5 py-4 shadow-ds-sm',
              report.scrapingGloballyEnabled
                ? 'border-ds-line bg-ds-surface-raised'
                : 'border-ds-warning/40 bg-ds-warning-soft',
            )}
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <BoDot tone={report.scrapingGloballyEnabled ? 'ok' : 'bad'} />
                <span className="text-sm font-medium text-ds-ink">
                  Scraping globale {report.scrapingGloballyEnabled ? 'attivo' : 'in pausa'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BoDot
                  tone={
                    report.alerts.length === 0
                      ? 'ok'
                      : report.alerts.some((a) => a.severity === 'critical')
                        ? 'bad'
                        : 'warn'
                  }
                />
                <span className="text-sm text-ds-ink">
                  {report.alerts.length === 0
                    ? 'Nessun alert attivo'
                    : `${report.alerts.length} alert attivi`}
                </span>
              </div>
              <span className="text-xs text-ds-ink-muted">
                Soglie: silenzio {report.thresholds.adapterSilenceMinutes} min · finestra ingestione{' '}
                {report.thresholds.ingestionWindowMinutes} min · matcher stantio{' '}
                {report.thresholds.matcherStaleMinutes} min
              </span>
            </div>
            {report.alerts.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {report.alerts.map((a) => (
                  <li key={a.key} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <DsBadge tone={a.severity === 'critical' ? 'loss' : 'warning'}>
                      {a.severity === 'critical' ? 'critico' : 'avviso'}
                    </DsBadge>
                    <span className="font-medium text-ds-ink">{a.title}</span>
                    {a.detail && <span className="text-ds-ink-muted">{a.detail}</span>}
                    <span className="text-xs text-ds-ink-muted">da {ago(a.since, now)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Adapters */}
          <BoPanel
            title="Adapter"
            aside={`finestra ${report.thresholds.ingestionWindowMinutes} min · run ultime ${report.hoursBack} h`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={INNER_THEAD}>
                  <tr className="text-left">
                    <th className="pr-3 pb-2 font-semibold">Bookmaker</th>
                    <th className="pr-3 pb-2 font-semibold">Stato</th>
                    <th className="pr-3 pb-2 font-semibold">Ultimo run</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Silenzio</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Run</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Eventi</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Abbinati</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Orfani</th>
                    <th
                      className="pr-3 pb-2 text-right font-semibold"
                      title="Eventi di sport senza fixture a catalogo, messi da parte: né abbinati né orfani"
                    >
                      Fuori catalogo
                    </th>
                    <th className="pr-3 pb-2 text-right font-semibold">Quote</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Run 24 h</th>
                    <th className="pb-2 font-semibold">Circuito</th>
                  </tr>
                </thead>
                <tbody>
                  {report.adapters.map((a) => {
                    const runs = report.runs.find((r) => r.bookmakerSlug === a.slug)
                    const silent = a.silentForMinutes >= report.thresholds.adapterSilenceMinutes
                    const tone = !a.schedulable
                      ? 'off'
                      : a.circuitPhase
                        ? 'warn'
                        : silent
                          ? 'bad'
                          : a.lastRunStatus === 'failed'
                            ? 'warn'
                            : 'ok'
                    return (
                      <tr key={a.slug} className="border-t border-ds-line">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <BoDot tone={tone} />
                            <span className="font-medium text-ds-ink">{a.name}</span>
                            <span className="font-mono text-xs text-ds-ink-muted">{a.slug}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-xs text-ds-ink-muted">
                          {a.schedulable
                            ? a.initialized
                              ? 'schedulato'
                              : 'schedulato, non inizializzato'
                            : `non schedulato: ${a.skipReason}`}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          <span
                            className={
                              a.lastRunStatus === 'failed' ? 'text-ds-loss' : 'text-ds-ink'
                            }
                          >
                            {a.lastRunStatus ?? '—'}
                          </span>
                          <span className="text-ds-ink-muted"> · {ago(a.lastRunAt, now)}</span>
                          {a.lastError && (
                            <div className="max-w-xs truncate text-ds-loss" title={a.lastError}>
                              {a.lastError}
                            </div>
                          )}
                        </td>
                        <td
                          className={cn(
                            'py-2 pr-3 text-right tabular-nums',
                            silent ? 'text-ds-loss' : 'text-ds-ink',
                          )}
                        >
                          {a.silentForMinutes} min
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(a.windowRuns)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(a.windowEvents)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {num(a.windowMatched)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {num(a.windowOrphaned)}
                        </td>
                        <td
                          className={cn(
                            'py-2 pr-3 text-right tabular-nums',
                            (a.windowOffCatalog ?? 0) > 0
                              ? 'text-ds-ink-muted'
                              : 'text-ds-ink-faint',
                          )}
                        >
                          {num(a.windowOffCatalog ?? 0)}
                        </td>
                        <td
                          className={cn(
                            'py-2 pr-3 text-right tabular-nums',
                            a.windowRuns > 0 &&
                              a.windowEvents - (a.windowOffCatalog ?? 0) > 0 &&
                              a.windowOdds === 0 &&
                              'font-semibold text-ds-warning',
                          )}
                        >
                          {num(a.windowOdds)}
                        </td>
                        <td className="py-2 pr-3 text-right text-xs text-ds-ink-muted tabular-nums">
                          {runs ? `${num(runs.successRuns)} ok / ${num(runs.failedRuns)} ko` : '—'}
                        </td>
                        <td className="py-2 text-xs">
                          {a.circuitPhase === 'open' ? (
                            <span className="text-ds-warning">
                              aperto, riprova tra {until(a.circuitOpenUntil, now)}
                            </span>
                          ) : a.circuitPhase === 'probing' ? (
                            <span className="text-ds-warning">
                              in prova, cooldown finito {ago(a.circuitOpenUntil, now)}
                            </span>
                          ) : (
                            <span className="text-ds-ink-muted">chiuso</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {report.adapters.length === 0 && (
                    <tr>
                      <td colSpan={12} className="py-4 text-center text-ds-ink-muted">
                        Nessun adapter abilitato.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </BoPanel>

          {/* Browser sidecar (ADAPTER_STATUS §14.54) */}
          <BoPanel title="Browser" aside={report.browser.endpoint ?? 'nessun sidecar configurato'}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <BoDot
                  tone={
                    !report.browser.configured ? 'off' : report.browser.connected ? 'ok' : 'bad'
                  }
                />
                <span className="text-sm text-ds-ink">
                  {!report.browser.configured
                    ? 'Nessun sidecar Chromium: gli adapter browser non vengono schedulati'
                    : report.browser.connected
                      ? `Collegato · ${report.browser.browserVersion ?? 'versione ignota'}`
                      : 'Non raggiungibile: gli adapter browser falliranno finché non torna su'}
                </span>
              </div>
              {report.browser.configured && (
                <span className="text-xs text-ds-ink-muted">
                  {report.browser.pages.length === 0
                    ? 'nessuna pagina aperta'
                    : `${report.browser.pages.length} pagine aperte`}
                </span>
              )}
            </div>
            {report.browser.pages.length > 0 && (
              <ul className="space-y-1 mt-3 text-xs">
                {report.browser.pages.map((p) => (
                  <li key={p.slug} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-ds-ink">{p.slug}</span>
                    <span className="max-w-md truncate text-ds-ink-muted" title={p.url}>
                      {p.url || '—'}
                    </span>
                    <span className="text-ds-ink-muted tabular-nums">
                      aperta da {p.ageMinutes} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </BoPanel>

          {/* Andamento (storia delle metriche) */}
          <TrendCharts />

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Crons */}
            <BoPanel title="Cron">
              <table className="w-full text-sm">
                <thead className={INNER_THEAD}>
                  <tr className="text-left">
                    <th className="pr-3 pb-2 font-semibold">Job</th>
                    <th className="pr-3 pb-2 font-semibold">Ultimo successo</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Durata</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Run / errori</th>
                    <th className="pb-2 font-semibold">Ultimo errore</th>
                  </tr>
                </thead>
                <tbody>
                  {report.crons.map((c) => (
                    <tr key={c.name} className="border-t border-ds-line">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <BoDot tone={cronTone(c, now, 45)} />
                          <span className="text-ds-ink">{CRON_LABELS[c.name] ?? c.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs text-ds-ink-muted">
                        {ago(c.lastSuccessAt, now)}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs tabular-nums">
                        {duration(c.lastDurationMs)}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs tabular-nums">
                        {num(c.runs)} /{' '}
                        <span className={c.failures > 0 ? 'text-ds-loss' : ''}>
                          {num(c.failures)}
                        </span>
                      </td>
                      <td
                        className="max-w-xs truncate py-2 text-xs text-ds-loss"
                        title={c.lastError ?? undefined}
                      >
                        {c.lastError ? `${ago(c.lastFailureAt, now)}: ${c.lastError}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </BoPanel>

            {/* Matcher + refresh */}
            <BoPanel title="Matcher e refresh">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <BoStat label="Righe nel matcher" value={num(report.matcher.rows)} />
                <BoStat
                  label="Ultimo calcolo"
                  value={ago(report.matcher.calculatedAt, now)}
                  hint={formatDateTime(report.matcher.calculatedAt)}
                />
                <BoStat
                  label="Mercati in coda incrementale"
                  value={num(report.matcher.pendingMarkets ?? report.matcher.pendingEvents)}
                />
                <BoStat
                  label="Rebuild completo"
                  value={ago(report.matcher.rebuild?.lastSuccessAt ?? null, now)}
                  hint={`durata ${duration(report.matcher.rebuild?.lastDurationMs ?? null)}`}
                />
                <BoStat
                  label="Tick (sweep + purge)"
                  value={ago(report.matcher.tick?.lastSuccessAt ?? null, now)}
                  hint={`durata ${duration(report.matcher.tick?.lastDurationMs ?? null)}`}
                />
                <BoStat
                  label="Refresh adattivo"
                  value={`${num(report.refresh.trackedPairs)} coppie`}
                  hint={`ultimo passaggio ${ago(report.refresh.heartbeat?.lastSuccessAt ?? null, now)}, ${duration(report.refresh.heartbeat?.lastDurationMs ?? null)}`}
                />
              </div>
            </BoPanel>

            {/* Provider */}
            <BoPanel title="Catalogo api-sports">
              {report.provider.budget ? (
                <div className="mb-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ds-ink">
                      Budget del giorno:{' '}
                      <span className="font-semibold tabular-nums">
                        {num(report.provider.budget.callsUsed)}
                      </span>{' '}
                      / {num(report.provider.budget.planDailyLimit)} chiamate
                    </span>
                    <span className="text-xs text-ds-ink-muted">
                      ultima {ago(report.provider.budget.lastCallAt, now)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ds-surface-sunken">
                    <div
                      className={cn(
                        'h-2 rounded-full',
                        report.provider.budget.callsUsed /
                          Math.max(1, report.provider.budget.planDailyLimit) >
                          0.9
                          ? 'bg-ds-loss'
                          : 'bg-ds-brand',
                      )}
                      style={{
                        width: `${Math.min(100, (100 * report.provider.budget.callsUsed) / Math.max(1, report.provider.budget.planDailyLimit))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mb-3 text-sm text-ds-ink-muted">Nessuna chiamata registrata oggi.</p>
              )}
              <table className="w-full text-sm">
                <thead className={INNER_THEAD}>
                  <tr className="text-left">
                    <th className="pr-3 pb-2 font-semibold">Sync</th>
                    <th className="pr-3 pb-2 font-semibold">Esito</th>
                    <th className="pr-3 pb-2 font-semibold">Quando</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Righe</th>
                    <th className="pb-2 text-right font-semibold">Chiamate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.provider.lastRuns.map((r) => (
                    <tr key={r.runType} className="border-t border-ds-line">
                      <td className="py-2 pr-3 text-ds-ink">
                        {RUN_TYPE_LABELS[r.runType] ?? r.runType}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <BoDot tone={r.status === 'success' ? 'ok' : 'bad'} />
                          <span className="text-xs">{r.status}</span>
                        </div>
                        {r.error && (
                          <div className="max-w-xs truncate text-xs text-ds-loss" title={r.error}>
                            {r.error}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-ds-ink-muted">
                        {ago(r.startedAt, now)}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs tabular-nums">
                        {r.runType === 'catalog'
                          ? `${num(r.leaguesSynced)} leghe`
                          : r.runType === 'fixtures'
                            ? `${num(r.fixturesUpserted)} fixture`
                            : `${num(r.fixturesUpdated)} aggiornate`}
                      </td>
                      <td className="py-2 text-right text-xs tabular-nums">
                        {num(r.apiCallsUsed)}
                      </td>
                    </tr>
                  ))}
                  {report.provider.lastRuns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-ds-ink-muted">
                        Nessun sync eseguito.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </BoPanel>

            {/* Review queue + coverage */}
            <BoPanel title="Coda di revisione e copertura">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Object.entries(report.reviewQueue).map(([status, n]) => (
                  <BoStat key={status} label={QUEUE_LABELS[status] ?? status} value={num(n)} />
                ))}
                <BoStat
                  label="Fixture nelle 48 h con quote"
                  value={`${num(report.coverage.mappedNext48h)} / ${num(report.coverage.fixturesNext48h)}`}
                  hint={
                    report.coverage.fixturesNext48h > 0
                      ? `${Math.round((100 * report.coverage.mappedNext48h) / report.coverage.fixturesNext48h)}% con almeno un bookmaker`
                      : 'nessuna fixture in finestra'
                  }
                />
              </div>
            </BoPanel>

            {/* Odds */}
            <BoPanel title="Quote in tabella">
              <table className="w-full text-sm">
                <thead className={INNER_THEAD}>
                  <tr className="text-left">
                    <th className="pr-3 pb-2 font-semibold">Bookmaker</th>
                    <th className="pr-3 pb-2 font-semibold">Stato</th>
                    <th className="pr-3 pb-2 text-right font-semibold">Quote</th>
                    <th className="pb-2 text-right font-semibold">Eventi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.odds.map((o) => (
                    <tr key={`${o.slug}-${o.status}`} className="border-t border-ds-line">
                      <td className="py-2 pr-3 font-mono text-xs text-ds-ink">{o.slug}</td>
                      <td
                        className={cn(
                          'py-2 pr-3 text-xs',
                          o.status === 'active'
                            ? 'font-semibold text-ds-profit'
                            : 'text-ds-ink-muted',
                        )}
                      >
                        {o.status}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(o.rows)}</td>
                      <td className="py-2 text-right tabular-nums">{num(o.events)}</td>
                    </tr>
                  ))}
                  {report.odds.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-ds-ink-muted">
                        Nessuna quota in tabella.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </BoPanel>

            {/* Storage */}
            <BoPanel
              title="Spazio nel database"
              aside={`totale ${bytes(report.storage.databaseBytes)}`}
            >
              <ul className="space-y-1.5">
                {report.storage.tables.map((t) => {
                  const share =
                    report.storage.databaseBytes > 0
                      ? (100 * t.bytes) / report.storage.databaseBytes
                      : 0
                  return (
                    <li key={t.name} className="text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-ds-ink">{t.name}</span>
                        <span className="text-ds-ink-muted tabular-nums">
                          {bytes(t.bytes)} · {num(t.liveRows)} righe
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-ds-surface-sunken">
                        <div
                          className={cn(
                            'h-1.5 rounded-full',
                            share > 50 ? 'bg-ds-warning' : 'bg-ds-brand/60',
                          )}
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </BoPanel>
          </div>
        </div>
      )}
    </>
  )
}
