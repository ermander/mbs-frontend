'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
import {
  getScrapers,
  toggleScraper,
  updateEnabledSports,
  getGlobalScrapingStatus,
  setGlobalScrapingStatus,
  type BackofficeScraper,
  type GlobalScrapingStatus,
} from '@/services/api/backoffice-scrapers-client'

const ADAPTER_TYPE_LABELS: Record<string, string> = {
  api: 'API',
  playwright: 'Playwright',
  websocket: 'WebSocket',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BackofficeScrapersPage() {
  const [scrapers, setScrapers] = useState<BackofficeScraper[]>([])
  const [globalStatus, setGlobalStatus] = useState<GlobalScrapingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [togglingGlobal, setTogglingGlobal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingSportsId, setSavingSportsId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [scrapersData, globalData] = await Promise.all([
        getScrapers(),
        getGlobalScrapingStatus(),
      ])
      setScrapers(scrapersData)
      setGlobalStatus(globalData)
    } catch {
      setError('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleGlobalToggle = async () => {
    if (!globalStatus) return
    setTogglingGlobal(true)
    try {
      const updated = await setGlobalScrapingStatus(!globalStatus.enabled)
      setGlobalStatus(updated)
    } catch {
      setError("Errore nell'aggiornamento dello stato globale.")
    } finally {
      setTogglingGlobal(false)
    }
  }

  const handleToggle = async (scraper: BackofficeScraper) => {
    setTogglingId(scraper.id)
    try {
      const updated = await toggleScraper(scraper.id, !scraper.scrape_enabled)
      setScrapers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {
      setError(`Errore nell'aggiornamento di ${scraper.name}.`)
    } finally {
      setTogglingId(null)
    }
  }

  const handleSportToggle = async (scraper: BackofficeScraper, sport: string) => {
    setSavingSportsId(scraper.id)
    try {
      const mappedSports = scraper.mapped_sports
      const currentSports = scraper.enabled_sports ?? mappedSports
      const newSports = currentSports.includes(sport)
        ? currentSports.filter((s) => s !== sport)
        : [...currentSports, sport]

      // If all mapped sports selected, set to null (= all enabled)
      const payload = newSports.length === mappedSports.length ? null : newSports

      const updated = await updateEnabledSports(scraper.id, payload)
      // Preserve mapped_sports from local state (not returned by update endpoint)
      setScrapers((prev) =>
        prev.map((s) =>
          s.id === updated.id ? { ...updated, mapped_sports: scraper.mapped_sports } : s,
        ),
      )
    } catch {
      setError(`Errore nell'aggiornamento sport di ${scraper.name}.`)
    } finally {
      setSavingSportsId(null)
    }
  }

  const getActiveSports = (scraper: BackofficeScraper): string[] => {
    return scraper.enabled_sports ?? scraper.mapped_sports
  }

  const globalEnabled = globalStatus?.enabled ?? true

  return (
    <Container>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Gestione scraper</h2>
        <p className="text-sm text-muted-foreground">
          Attiva o disattiva lo scraping per ogni bookmaker e seleziona gli sport da scrapare.
        </p>
      </div>

      {/* Global kill switch */}
      {globalStatus && (
        <div
          className={`mb-6 rounded-lg border px-5 py-4 ${
            globalEnabled ? 'border-border bg-card' : 'border-amber-500/40 bg-amber-500/5'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${
                  globalEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <div>
                <p className="font-medium text-foreground">
                  Scraping globale:{' '}
                  <span className={globalEnabled ? 'text-green-600' : 'text-red-500'}>
                    {globalEnabled ? 'ATTIVO' : 'IN PAUSA'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Aggiornato il {formatDate(globalStatus.updated_at)}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={togglingGlobal}
              onClick={handleGlobalToggle}
              title={globalEnabled ? 'Metti in pausa tutto lo scraping' : 'Riattiva lo scraping'}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                globalEnabled ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  globalEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {/* Warning banner when globally paused */}
      {!globalEnabled && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          Lo scraping è globalmente in pausa. I toggle dei singoli bookmaker restano modificabili ma
          non avranno effetto finché il globale non viene riattivato.
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="py-6 text-center text-muted-foreground">Caricamento...</p>
        ) : scrapers.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Nessun bookmaker configurato.</p>
        ) : (
          scrapers.map((scraper) => {
            const isExpanded = expandedId === scraper.id
            const activeSports = getActiveSports(scraper)
            const mappedSports = scraper.mapped_sports
            // When scraping is globally paused, an enabled scraper shows amber
            // to communicate "configured but suspended"
            const toggleColor = scraper.scrape_enabled
              ? globalEnabled
                ? 'bg-primary'
                : 'bg-amber-400'
              : 'bg-muted-foreground/30'

            return (
              <div key={scraper.id} className="rounded-md border border-border bg-card">
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/backoffice/scrapers/${scraper.slug}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {scraper.name}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">
                        {scraper.slug}
                      </span>
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {ADAPTER_TYPE_LABELS[scraper.adapter_type] ?? scraper.adapter_type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {mappedSports.length === 0 ? (
                        <span className="text-amber-500">Nessuno sport mappato</span>
                      ) : scraper.enabled_sports ? (
                        `${activeSports.length}/${mappedSports.length} sport mappati`
                      ) : (
                        `Tutti gli sport mappati (${mappedSports.length})`
                      )}
                      {' · '}
                      {scraper.scrape_interval_seconds}s
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={mappedSports.length === 0}
                    onClick={() => setExpandedId(isExpanded ? null : scraper.id)}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isExpanded ? 'Chiudi' : 'Sport'}
                  </button>

                  <button
                    type="button"
                    disabled={togglingId === scraper.id || !scraper.is_active}
                    onClick={() => handleToggle(scraper)}
                    title={
                      !scraper.is_active
                        ? 'Bookmaker non attivo'
                        : scraper.scrape_enabled
                          ? 'Disattiva scraping'
                          : 'Attiva scraping'
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${toggleColor}`}
                  >
                    <span
                      className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        scraper.scrape_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-3">
                    {mappedSports.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nessuno sport mappato per questo bookmaker. Vai alla sezione{' '}
                        <a href="/backoffice/sport-mappings" className="text-primary underline">
                          Sport Mappings
                        </a>{' '}
                        per aggiungere le mappature.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {mappedSports.map((sport) => {
                          const isActive = activeSports.includes(sport)
                          return (
                            <button
                              key={sport}
                              type="button"
                              disabled={savingSportsId === scraper.id}
                              onClick={() => handleSportToggle(scraper, sport)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {sport}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </Container>
  )
}
