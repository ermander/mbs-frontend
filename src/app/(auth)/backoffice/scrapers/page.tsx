'use client'

import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
import {
  getScrapers,
  toggleScraper,
  updateEnabledSports,
  type BackofficeScraper,
} from '@/services/api/backoffice-scrapers-client'

const ADAPTER_TYPE_LABELS: Record<string, string> = {
  api: 'API',
  playwright: 'Playwright',
  websocket: 'WebSocket',
}

export default function BackofficeScrapersPage() {
  const [scrapers, setScrapers] = useState<BackofficeScraper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingSportsId, setSavingSportsId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const scrapersData = await getScrapers()
      setScrapers(scrapersData)
    } catch {
      setError('Errore nel caricamento dei dati.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

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

  return (
    <Container>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Gestione scraper</h2>
        <p className="text-sm text-muted-foreground">
          Attiva o disattiva lo scraping per ogni bookmaker e seleziona gli sport da scrapare.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

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

            return (
              <div key={scraper.id} className="rounded-md border border-border bg-card">
                <div className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{scraper.name}</span>
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
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                      scraper.scrape_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
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
