'use client'

import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
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
  OdMisplacedCompetitionsAudit: 'Audit competizioni',
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

function Dot({ tone }: { tone: 'ok' | 'warn' | 'bad' | 'off' }) {
  const color =
    tone === 'ok'
      ? 'bg-green-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'bad'
          ? 'bg-red-500'
          : 'bg-muted-foreground/40'
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
}

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function cronTone(c: HealthCron | null, now: number, staleMinutes: number): 'ok' | 'warn' | 'bad' | 'off' {
  if (!c || !c.scheduledAt) return 'off'
  if (c.lastFailureAt && (!c.lastSuccessAt || new Date(c.lastFailureAt) > new Date(c.lastSuccessAt))) return 'bad'
  if (!c.lastSuccessAt) return 'warn'
  return now - new Date(c.lastSuccessAt).getTime() > staleMinutes * 60_000 ? 'warn' : 'ok'
}

export default function BackofficeSalutePage() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      const data = await getOddsHealth(24)
      setReport(data)
      setError(null)
    } catch {
      setError('Errore nel caricamento dello stato di salute.')
    } finally {
      setLoading(false)
    }
  }, [])

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
    <Container>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Salute della raccolta quote</h2>
          <p className="text-sm text-muted-foreground">
            Adapter, cron, matcher, catalogo api-sports e coda di revisione: la stessa lettura degli alert Telegram, aggiornata ogni 30 secondi.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {report && <span>Letto {ago(report.now, now)} · backend avviato {ago(report.bootedAt, now)}</span>}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Aggiorna
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading && !report && <p className="py-6 text-center text-muted-foreground">Caricamento...</p>}

      {report && (
        <div className="space-y-4">
          {/* Global state + alerts */}
          <div
            className={`rounded-lg border px-5 py-4 ${
              report.scrapingGloballyEnabled ? 'border-border bg-card' : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Dot tone={report.scrapingGloballyEnabled ? 'ok' : 'bad'} />
                <span className="text-sm font-medium text-foreground">
                  Scraping globale {report.scrapingGloballyEnabled ? 'attivo' : 'in pausa'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Dot tone={report.alerts.length === 0 ? 'ok' : report.alerts.some((a) => a.severity === 'critical') ? 'bad' : 'warn'} />
                <span className="text-sm text-foreground">
                  {report.alerts.length === 0 ? 'Nessun alert attivo' : `${report.alerts.length} alert attivi`}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Soglie: silenzio {report.thresholds.adapterSilenceMinutes} min · finestra ingestione {report.thresholds.ingestionWindowMinutes} min · matcher stantio {report.thresholds.matcherStaleMinutes} min
              </span>
            </div>
            {report.alerts.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {report.alerts.map((a) => (
                  <li key={a.key} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.severity === 'critical' ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {a.severity === 'critical' ? 'critico' : 'avviso'}
                    </span>
                    <span className="font-medium text-foreground">{a.title}</span>
                    {a.detail && <span className="text-muted-foreground">{a.detail}</span>}
                    <span className="text-xs text-muted-foreground">da {ago(a.since, now)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Adapters */}
          <Card title="Adapter" aside={`finestra ${report.thresholds.ingestionWindowMinutes} min · run ultime ${report.hoursBack} h`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="pb-2 pr-3 font-medium">Bookmaker</th>
                    <th className="pb-2 pr-3 font-medium">Stato</th>
                    <th className="pb-2 pr-3 font-medium">Ultimo run</th>
                    <th className="pb-2 pr-3 text-right font-medium">Silenzio</th>
                    <th className="pb-2 pr-3 text-right font-medium">Run</th>
                    <th className="pb-2 pr-3 text-right font-medium">Eventi</th>
                    <th className="pb-2 pr-3 text-right font-medium">Abbinati</th>
                    <th className="pb-2 pr-3 text-right font-medium">Orfani</th>
                    <th className="pb-2 pr-3 text-right font-medium">Quote</th>
                    <th className="pb-2 pr-3 text-right font-medium">Run 24 h</th>
                    <th className="pb-2 font-medium">Circuito</th>
                  </tr>
                </thead>
                <tbody>
                  {report.adapters.map((a) => {
                    const runs = report.runs.find((r) => r.bookmakerSlug === a.slug)
                    const silent = a.silentForMinutes >= report.thresholds.adapterSilenceMinutes
                    const tone = !a.schedulable ? 'off' : a.circuitOpenUntil ? 'warn' : silent ? 'bad' : a.lastRunStatus === 'failed' ? 'warn' : 'ok'
                    return (
                      <tr key={a.slug} className="border-t border-border">
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <Dot tone={tone} />
                            <span className="font-medium text-foreground">{a.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{a.slug}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {a.schedulable ? (a.initialized ? 'schedulato' : 'schedulato, non inizializzato') : `non schedulato: ${a.skipReason}`}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          <span className={a.lastRunStatus === 'failed' ? 'text-red-500' : 'text-foreground'}>{a.lastRunStatus ?? '—'}</span>
                          <span className="text-muted-foreground"> · {ago(a.lastRunAt, now)}</span>
                          {a.lastError && <div className="max-w-xs truncate text-red-500" title={a.lastError}>{a.lastError}</div>}
                        </td>
                        <td className={`py-2 pr-3 text-right tabular-nums ${silent ? 'text-red-500' : 'text-foreground'}`}>{a.silentForMinutes} min</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(a.windowRuns)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(a.windowEvents)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(a.windowMatched)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{num(a.windowOrphaned)}</td>
                        <td className={`py-2 pr-3 text-right tabular-nums ${a.windowRuns > 0 && a.windowEvents > 0 && a.windowOdds === 0 ? 'text-amber-500' : ''}`}>{num(a.windowOdds)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-xs text-muted-foreground">
                          {runs ? `${num(runs.successRuns)} ok / ${num(runs.failedRuns)} ko` : '—'}
                        </td>
                        <td className="py-2 text-xs">
                          {a.circuitOpenUntil ? (
                            <span className="text-amber-500">aperto, riprova tra {until(a.circuitOpenUntil, now)}</span>
                          ) : (
                            <span className="text-muted-foreground">chiuso</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {report.adapters.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-4 text-center text-muted-foreground">Nessun adapter abilitato.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Andamento (storia delle metriche) */}
          <TrendCharts />

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Crons */}
            <Card title="Cron">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="pb-2 pr-3 font-medium">Job</th>
                    <th className="pb-2 pr-3 font-medium">Ultimo successo</th>
                    <th className="pb-2 pr-3 text-right font-medium">Durata</th>
                    <th className="pb-2 pr-3 text-right font-medium">Run / errori</th>
                    <th className="pb-2 font-medium">Ultimo errore</th>
                  </tr>
                </thead>
                <tbody>
                  {report.crons.map((c) => (
                    <tr key={c.name} className="border-t border-border">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <Dot tone={cronTone(c, now, 45)} />
                          <span className="text-foreground">{CRON_LABELS[c.name] ?? c.name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{ago(c.lastSuccessAt, now)}</td>
                      <td className="py-2 pr-3 text-right text-xs tabular-nums">{duration(c.lastDurationMs)}</td>
                      <td className="py-2 pr-3 text-right text-xs tabular-nums">
                        {num(c.runs)} / <span className={c.failures > 0 ? 'text-red-500' : ''}>{num(c.failures)}</span>
                      </td>
                      <td className="max-w-xs truncate py-2 text-xs text-red-500" title={c.lastError ?? undefined}>
                        {c.lastError ? `${ago(c.lastFailureAt, now)}: ${c.lastError}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Matcher + refresh */}
            <Card title="Matcher e refresh">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Righe nel matcher" value={num(report.matcher.rows)} />
                <Stat label="Ultimo calcolo" value={ago(report.matcher.calculatedAt, now)} hint={formatDateTime(report.matcher.calculatedAt)} />
                <Stat label="Eventi in coda incrementale" value={num(report.matcher.pendingEvents)} />
                <Stat
                  label="Rebuild completo"
                  value={ago(report.matcher.rebuild?.lastSuccessAt ?? null, now)}
                  hint={`durata ${duration(report.matcher.rebuild?.lastDurationMs ?? null)}`}
                />
                <Stat
                  label="Tick (sweep + purge)"
                  value={ago(report.matcher.tick?.lastSuccessAt ?? null, now)}
                  hint={`durata ${duration(report.matcher.tick?.lastDurationMs ?? null)}`}
                />
                <Stat
                  label="Refresh adattivo"
                  value={`${num(report.refresh.trackedPairs)} coppie`}
                  hint={`ultimo passaggio ${ago(report.refresh.heartbeat?.lastSuccessAt ?? null, now)}, ${duration(report.refresh.heartbeat?.lastDurationMs ?? null)}`}
                />
              </div>
            </Card>

            {/* Provider */}
            <Card title="Catalogo api-sports">
              {report.provider.budget ? (
                <div className="mb-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-foreground">
                      Budget del giorno: <span className="font-semibold tabular-nums">{num(report.provider.budget.callsUsed)}</span> / {num(report.provider.budget.planDailyLimit)} chiamate
                    </span>
                    <span className="text-xs text-muted-foreground">ultima {ago(report.provider.budget.lastCallAt, now)}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${
                        report.provider.budget.callsUsed / Math.max(1, report.provider.budget.planDailyLimit) > 0.9 ? 'bg-red-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, (100 * report.provider.budget.callsUsed) / Math.max(1, report.provider.budget.planDailyLimit))}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="mb-3 text-sm text-muted-foreground">Nessuna chiamata registrata oggi.</p>
              )}
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="pb-2 pr-3 font-medium">Sync</th>
                    <th className="pb-2 pr-3 font-medium">Esito</th>
                    <th className="pb-2 pr-3 font-medium">Quando</th>
                    <th className="pb-2 pr-3 text-right font-medium">Righe</th>
                    <th className="pb-2 text-right font-medium">Chiamate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.provider.lastRuns.map((r) => (
                    <tr key={r.runType} className="border-t border-border">
                      <td className="py-2 pr-3 text-foreground">{RUN_TYPE_LABELS[r.runType] ?? r.runType}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <Dot tone={r.status === 'success' ? 'ok' : 'bad'} />
                          <span className="text-xs">{r.status}</span>
                        </div>
                        {r.error && <div className="max-w-xs truncate text-xs text-red-500" title={r.error}>{r.error}</div>}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{ago(r.startedAt, now)}</td>
                      <td className="py-2 pr-3 text-right text-xs tabular-nums">
                        {r.runType === 'catalog' ? `${num(r.leaguesSynced)} leghe` : r.runType === 'fixtures' ? `${num(r.fixturesUpserted)} fixture` : `${num(r.fixturesUpdated)} aggiornate`}
                      </td>
                      <td className="py-2 text-right text-xs tabular-nums">{num(r.apiCallsUsed)}</td>
                    </tr>
                  ))}
                  {report.provider.lastRuns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-muted-foreground">Nessun sync eseguito.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* Review queue + coverage */}
            <Card title="Coda di revisione e copertura">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Object.entries(report.reviewQueue).map(([status, n]) => (
                  <Stat key={status} label={QUEUE_LABELS[status] ?? status} value={num(n)} />
                ))}
                <Stat
                  label="Fixture nelle 48 h con quote"
                  value={`${num(report.coverage.mappedNext48h)} / ${num(report.coverage.fixturesNext48h)}`}
                  hint={
                    report.coverage.fixturesNext48h > 0
                      ? `${Math.round((100 * report.coverage.mappedNext48h) / report.coverage.fixturesNext48h)}% con almeno un bookmaker`
                      : 'nessuna fixture in finestra'
                  }
                />
              </div>
            </Card>

            {/* Odds */}
            <Card title="Quote in tabella">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="pb-2 pr-3 font-medium">Bookmaker</th>
                    <th className="pb-2 pr-3 font-medium">Stato</th>
                    <th className="pb-2 pr-3 text-right font-medium">Quote</th>
                    <th className="pb-2 text-right font-medium">Eventi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.odds.map((o) => (
                    <tr key={`${o.slug}-${o.status}`} className="border-t border-border">
                      <td className="py-2 pr-3 font-mono text-xs text-foreground">{o.slug}</td>
                      <td className={`py-2 pr-3 text-xs ${o.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`}>{o.status}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(o.rows)}</td>
                      <td className="py-2 text-right tabular-nums">{num(o.events)}</td>
                    </tr>
                  ))}
                  {report.odds.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-muted-foreground">Nessuna quota in tabella.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* Storage */}
            <Card title="Spazio nel database" aside={`totale ${bytes(report.storage.databaseBytes)}`}>
              <ul className="space-y-1.5">
                {report.storage.tables.map((t) => {
                  const share = report.storage.databaseBytes > 0 ? (100 * t.bytes) / report.storage.databaseBytes : 0
                  return (
                    <li key={t.name} className="text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-foreground">{t.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {bytes(t.bytes)} · {num(t.liveRows)} righe
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className={`h-1.5 rounded-full ${share > 50 ? 'bg-amber-500' : 'bg-primary/60'}`} style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </Container>
  )
}
