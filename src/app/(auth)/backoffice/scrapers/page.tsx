'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  BoChip,
  BoDot,
  BoMono,
  BoMuted,
  BoSwitch,
  boLink,
} from '@/components/backoffice/backoffice-ds'
import { DsBadge } from '@/components/landing/ds-data'
import { dsButtonClass, dsFocusRing } from '@/components/landing/ds-primitives'
import { GTextArea } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DS_PANEL, DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import {
  getScrapers,
  toggleScraper,
  updateEnabledSports,
  updateScraperNote,
  updateScrapeAllCompetitions,
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

// Lo scraping di ogni bookmaker: interruttore globale, interruttore per sito, sport, Palinsesto o
// tutto il feed e la nota. Dal §14.365 sul design OddWise: riquadri surface-raised, BoSwitch (in
// warning quando il sito è acceso ma lo scraping globale è in pausa), sport come chip.
export default function BackofficeScrapersPage() {
  const [scrapers, setScrapers] = useState<BackofficeScraper[]>([])
  const [globalStatus, setGlobalStatus] = useState<GlobalScrapingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [togglingAllId, setTogglingAllId] = useState<string | null>(null)
  const [togglingGlobal, setTogglingGlobal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingSportsId, setSavingSportsId] = useState<string | null>(null)
  // §14.124: the note editor is open on one bookmaker at a time; the draft
  // starts from the saved note and lives only until Salva or Annulla.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)

  // Lo stato cambia solo nei callback della promise; loading parte già a true
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    Promise.all([getScrapers(), getGlobalScrapingStatus()])
      .then(([scrapersData, globalData]) => {
        setScrapers(scrapersData)
        setGlobalStatus(globalData)
      })
      .catch(() => setError('Errore nel caricamento dei dati.'))
      .finally(() => setLoading(false))
  }, [])

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

  // §14.125: the exception to the Palinsesto for one bookmaker (every competition of its feed).
  const handleAllCompetitionsToggle = async (scraper: BackofficeScraper) => {
    setTogglingAllId(scraper.id)
    setError(null)
    try {
      const updated = await updateScrapeAllCompetitions(
        scraper.id,
        !scraper.scrape_all_competitions,
      )
      setScrapers((prev) =>
        prev.map((s) =>
          s.id === updated.id ? { ...updated, mapped_sports: scraper.mapped_sports } : s,
        ),
      )
    } catch {
      setError(`Errore nell'aggiornamento delle competizioni di ${scraper.name}.`)
    } finally {
      setTogglingAllId(null)
    }
  }

  const openNoteEditor = (scraper: BackofficeScraper) => {
    setEditingNoteId(scraper.id)
    setNoteDraft(scraper.note ?? '')
  }

  const handleNoteSave = async (scraper: BackofficeScraper) => {
    setSavingNoteId(scraper.id)
    setError(null)
    try {
      const trimmed = noteDraft.trim()
      const updated = await updateScraperNote(scraper.id, trimmed.length === 0 ? null : trimmed)
      setScrapers((prev) =>
        prev.map((s) =>
          s.id === updated.id ? { ...updated, mapped_sports: scraper.mapped_sports } : s,
        ),
      )
      setEditingNoteId(null)
    } catch {
      setError(`Errore nel salvataggio della nota di ${scraper.name}.`)
    } finally {
      setSavingNoteId(null)
    }
  }

  const getActiveSports = (scraper: BackofficeScraper): string[] => {
    return scraper.enabled_sports ?? scraper.mapped_sports
  }

  const globalEnabled = globalStatus?.enabled ?? true

  return (
    <>
      <DsPageHeader
        title="Gestione scraper"
        description="Attiva o disattiva lo scraping per ogni bookmaker, seleziona gli sport da scrapare e annota lo stato di ogni integrazione."
      />

      {/* Global kill switch */}
      {globalStatus && (
        <div
          className={cn(
            'rounded-ds-md border px-5 py-4 shadow-ds-sm',
            globalEnabled
              ? 'border-ds-line bg-ds-surface-raised'
              : 'border-ds-loss/30 bg-ds-loss-soft',
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BoDot tone={globalEnabled ? 'ok' : 'bad'} />
              <div>
                <p className="m-0 font-semibold text-ds-ink">
                  Scraping globale:{' '}
                  <span className={globalEnabled ? 'text-ds-profit' : 'text-ds-loss'}>
                    {globalEnabled ? 'ATTIVO' : 'IN PAUSA'}
                  </span>
                </p>
                <p className="ds-caption m-0 text-ds-ink-muted">
                  Aggiornato il {formatDate(globalStatus.updated_at)}
                </p>
              </div>
            </div>

            <BoSwitch
              size="lg"
              checked={globalEnabled}
              disabled={togglingGlobal}
              onChange={() => void handleGlobalToggle()}
              label="Scraping globale"
              title={globalEnabled ? 'Metti in pausa tutto lo scraping' : 'Riattiva lo scraping'}
            />
          </div>
        </div>
      )}

      {error && <DsAlert>{error}</DsAlert>}

      {/* Warning banner when globally paused */}
      {!globalEnabled && (
        <DsAlert tone="warning">
          Lo scraping è globalmente in pausa. I toggle dei singoli bookmaker restano modificabili ma
          non avranno effetto finché il globale non viene riattivato.
        </DsAlert>
      )}

      <div className="flex flex-col gap-3">
        {loading ? (
          <BoMuted className="py-6 text-center">Caricamento degli scraper…</BoMuted>
        ) : scrapers.length === 0 ? (
          <BoMuted className="py-6 text-center">Nessun bookmaker configurato.</BoMuted>
        ) : (
          scrapers.map((scraper) => {
            const isExpanded = expandedId === scraper.id
            const isEditingNote = editingNoteId === scraper.id
            const activeSports = getActiveSports(scraper)
            const mappedSports = scraper.mapped_sports

            return (
              <div key={scraper.id} className={DS_PANEL}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/backoffice/scrapers/${scraper.slug}`}
                        className={cn(
                          'rounded-ds-xs font-semibold text-ds-ink underline-offset-4 hover:text-ds-brand hover:underline',
                          dsFocusRing,
                        )}
                      >
                        {scraper.name}
                      </Link>
                      <BoMono>{scraper.slug}</BoMono>
                      <DsBadge>
                        {ADAPTER_TYPE_LABELS[scraper.adapter_type] ?? scraper.adapter_type}
                      </DsBadge>
                    </div>
                    <p className="ds-caption m-0 mt-0.5 text-ds-ink-muted">
                      {mappedSports.length === 0 ? (
                        <span className="font-semibold text-ds-warning">Nessuno sport mappato</span>
                      ) : scraper.enabled_sports ? (
                        `${activeSports.length}/${mappedSports.length} sport mappati`
                      ) : (
                        `Tutti gli sport mappati (${mappedSports.length})`
                      )}
                      {' · '}
                      {scraper.scrape_interval_seconds}s
                    </p>
                    {scraper.note && !isEditingNote && (
                      <p
                        data-testid={`scraper-note-${scraper.slug}`}
                        className="ds-body-sm m-0 mt-1.5 whitespace-pre-line text-ds-ink"
                      >
                        {scraper.note}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      disabled={togglingAllId === scraper.id}
                      onClick={() => handleAllCompetitionsToggle(scraper)}
                      aria-pressed={scraper.scrape_all_competitions}
                      title={
                        scraper.scrape_all_competitions
                          ? 'Legge tutte le competizioni del feed, anche quelle spente nel Palinsesto. Clicca per tornare al Palinsesto.'
                          : 'Legge solo le competizioni accese nel Palinsesto. Clicca per leggere tutto il feed (§14.125).'
                      }
                      className={cn(
                        'mr-1 inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60',
                        dsFocusRing,
                        scraper.scrape_all_competitions
                          ? 'bg-ds-warning-soft text-ds-warning'
                          : 'bg-ds-surface-sunken text-ds-ink-muted hover:text-ds-ink',
                      )}
                    >
                      {scraper.scrape_all_competitions ? 'Tutto il feed' : 'Palinsesto'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        isEditingNote ? setEditingNoteId(null) : openNoteEditor(scraper)
                      }
                      aria-expanded={isEditingNote}
                      title={scraper.note ? 'Modifica la nota' : 'Aggiungi una nota'}
                      className={dsButtonClass('ghost', 'sm')}
                    >
                      {isEditingNote ? 'Chiudi nota' : 'Nota'}
                    </button>

                    <button
                      type="button"
                      disabled={mappedSports.length === 0}
                      onClick={() => setExpandedId(isExpanded ? null : scraper.id)}
                      aria-expanded={isExpanded}
                      className={cn(
                        dsButtonClass('ghost', 'sm'),
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      {isExpanded ? 'Chiudi' : 'Sport'}
                    </button>

                    <span className="ml-2 flex">
                      <BoSwitch
                        checked={scraper.scrape_enabled}
                        disabled={togglingId === scraper.id || !scraper.is_active}
                        onChange={() => void handleToggle(scraper)}
                        // Con lo scraping globale in pausa uno scraper acceso resta in warning:
                        // configurato ma sospeso.
                        tone={globalEnabled ? 'brand' : 'warning'}
                        label={`Scraping di ${scraper.name}`}
                        title={
                          !scraper.is_active
                            ? 'Bookmaker non attivo'
                            : scraper.scrape_enabled
                              ? 'Disattiva scraping'
                              : 'Attiva scraping'
                        }
                      />
                    </span>
                  </div>
                </div>

                {isEditingNote && (
                  <div className="border-t border-ds-line px-5 py-4">
                    <GTextArea
                      id={`note-${scraper.id}`}
                      label={`Nota su ${scraper.name}`}
                      value={noteDraft}
                      maxLength={2000}
                      disabled={savingNoteId === scraper.id}
                      onChange={setNoteDraft}
                      placeholder="Perché è spento, cosa lo blocca, cosa è stato provato…"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <p className="ds-caption m-0 text-ds-ink-muted">
                        Lascia vuoto e salva per rimuovere la nota. {noteDraft.length}/2000
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={savingNoteId === scraper.id}
                          onClick={() => setEditingNoteId(null)}
                          className={cn(dsButtonClass('ghost', 'sm'), 'disabled:opacity-50')}
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          disabled={savingNoteId === scraper.id}
                          onClick={() => handleNoteSave(scraper)}
                          className={cn(dsButtonClass('primary', 'sm'), 'disabled:opacity-60')}
                        >
                          {savingNoteId === scraper.id ? 'Salvataggio…' : 'Salva nota'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t border-ds-line px-5 py-4">
                    {mappedSports.length === 0 ? (
                      <BoMuted>
                        Nessuno sport mappato per questo bookmaker. Vai alla sezione{' '}
                        <Link href="/backoffice/sport-mappings" className={boLink}>
                          Sport Mappings
                        </Link>{' '}
                        per aggiungere le mappature.
                      </BoMuted>
                    ) : (
                      <div
                        role="group"
                        aria-label={`Sport di ${scraper.name}`}
                        className="flex flex-wrap gap-2"
                      >
                        {mappedSports.map((sport) => (
                          <BoChip
                            key={sport}
                            pressed={activeSports.includes(sport)}
                            disabled={savingSportsId === scraper.id}
                            onClick={() => handleSportToggle(scraper, sport)}
                          >
                            {sport}
                          </BoChip>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
