'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, X } from 'lucide-react'

import { BoMuted, BoStatTile } from '@/components/backoffice/backoffice-ds'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { GSelect, GTextField } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DS_PANEL, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import {
  extractMessage,
  getCompetitionCatalog,
  setCompetitionsScrape,
  type CompetitionCatalogDto,
  type CompetitionScrapeSelection,
} from '@/services/api/backoffice-provider-schedule-client'
import { num } from '../palinsesto/format'
import { CatalogTree } from './catalog-tree'

type Mode = 'all' | 'on' | 'off' | 'future'

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'all', label: 'Tutte' },
  { value: 'on', label: 'Solo lette' },
  { value: 'off', label: 'Solo spente' },
  { value: 'future', label: 'Solo con partite future' },
]

/** A fetch result remembered with the key of the load that produced it. */
interface Keyed {
  key: number
  data: CompetitionCatalogDto | null
  error: string | null
}

/**
 * The catalog narrowed to what matches: nodes keep their catalog counts, so
 * the bulk actions and the «n/tot» chips speak of the whole node even when
 * only some of its competitions are listed.
 */
function filterCatalog(
  catalog: CompetitionCatalogDto,
  q: string,
  mode: Mode,
): CompetitionCatalogDto {
  const needle = q.trim().toLowerCase()
  const keep = (name: string, categoryName: string, enabled: boolean, future: number): boolean => {
    if (mode === 'on' && !enabled) return false
    if (mode === 'off' && enabled) return false
    if (mode === 'future' && future === 0) return false
    if (!needle) return true
    return name.toLowerCase().includes(needle) || categoryName.toLowerCase().includes(needle)
  }
  return {
    ...catalog,
    sports: catalog.sports
      .map((s) => ({
        ...s,
        categories: s.categories
          .map((c) => ({
            ...c,
            competitions: c.competitions.filter((comp) =>
              keep(comp.name, c.name, comp.scrapeEnabled, comp.futureFixtures),
            ),
          }))
          .filter((c) => c.competitions.length > 0),
      }))
      .filter((s) => s.categories.length > 0),
  }
}

// Il catalogo delle competizioni con l'interruttore di lettura per ciascuna. Dal §14.365 sul
// design OddWise: numeri in riquadri, campi e BoSwitch del design nell'albero.
export default function CompetizioniPage() {
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState<Keyed | null>(null)

  useEffect(() => {
    let cancelled = false
    getCompetitionCatalog()
      .then((data) => {
        if (!cancelled) setResult({ key: tick, data, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setResult({
            key: tick,
            data: null,
            error: extractMessage(err, 'Errore nel caricamento delle competizioni.'),
          })
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  const loading = result?.key !== tick
  // The previous catalog stays on screen while the next one loads.
  const catalog = result?.data ?? null
  const error = result?.error ?? null

  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<Mode>('all')
  const filtered = useMemo(
    () => (catalog ? filterCatalog(catalog, search, mode) : null),
    [catalog, search, mode],
  )
  const autoExpand = search.trim().length > 0 || mode !== 'all'

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)

  const handleScrapeChange = async (selection: CompetitionScrapeSelection, what: string) => {
    setBusy(true)
    try {
      const r = await setCompetitionsScrape(selection)
      const changed =
        r.updated === 0
          ? 'nessuna competizione cambiata'
          : r.updated === 1
            ? `1 competizione ${r.enabled ? 'accesa' : 'spenta'}`
            : `${num(r.updated)} competizioni ${r.enabled ? 'accese' : 'spente'}`
      setNotice({
        text: `${what}: ${changed} · ora gli scraper leggono ${num(r.scrapeEnabledTotal)} competizioni su ${num(r.competitionsTotal)}`,
        error: false,
      })
      setTick((t) => t + 1)
    } catch (err) {
      setNotice({
        text: extractMessage(err, 'Errore nel cambio della selezione.'),
        error: true,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DsPageHeader
        title="Competizioni da leggere"
        description="Tutto il catalogo, senza finestra temporale. Gli interruttori dicono agli scraper per quali competizioni leggere le quote dei bookmaker: il catalogo delle partite resta completo, cambia solo dove vanno a prendere le quote. Le leghe nuove entrano accese."
        actions={
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className={dsButtonClass('secondary', 'md')}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Ricarica
          </button>
        }
      />

      {catalog && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BoStatTile
            label="Lette dagli scraper"
            value={`${num(catalog.scrapeEnabledCompetitions)} / ${num(catalog.totalCompetitions)}`}
            hint="Competizioni accese sul totale del catalogo"
          />
          <BoStatTile
            label="Con partite future"
            value={num(catalog.competitionsWithFutureFixtures)}
            hint="Competizioni con almeno una partita in programma"
          />
          <BoStatTile
            label="Spente"
            value={num(catalog.totalCompetitions - catalog.scrapeEnabledCompetitions)}
            hint="Competizioni che nessun bookmaker viene interrogato per"
          />
        </div>
      )}

      <div className={cn(DS_PANEL, 'px-5 py-4')}>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          <GTextField
            id="comp-q"
            label="Cerca competizione o nazione"
            type="search"
            size="sm"
            value={search}
            onChange={setSearch}
            placeholder="es. Serie A, Premier, Italy"
            prefix={<Search className="h-4 w-4" aria-hidden />}
            className="min-w-[16rem] flex-1"
          />
          <GSelect
            id="comp-mode"
            label="Mostra"
            size="sm"
            value={mode}
            onChange={(value) => setMode((value as Mode) || 'all')}
            options={MODES}
            className="w-56"
          />
        </div>
        {notice && (
          <div
            role={notice.error ? 'alert' : 'status'}
            className={cn(
              'mt-3 flex items-center justify-between gap-2 rounded-ds-sm px-3 py-2 text-sm',
              notice.error ? 'bg-ds-loss-soft text-ds-loss' : 'bg-ds-profit-soft text-ds-profit',
            )}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              aria-label="Chiudi l'avviso"
              className={cn(dsButtonClass('ghost', 'sm'), 'h-7 w-7 flex-none px-0 text-current')}
              onClick={() => setNotice(null)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className={cn(DS_PANEL, 'relative px-2 py-2 sm:px-3')}>
        {loading && (
          <div className="ds-caption absolute top-2 right-3 text-ds-ink-muted">aggiorno…</div>
        )}
        {error ? (
          <p className="m-0 px-2 py-4 text-sm text-ds-loss">{error}</p>
        ) : !filtered ? (
          <BoMuted className="px-2 py-4">{loading ? 'Caricamento…' : 'Nessun dato.'}</BoMuted>
        ) : (
          <CatalogTree
            catalog={filtered}
            autoExpand={autoExpand}
            busy={busy}
            onScrapeChange={(selection, what) => void handleScrapeChange(selection, what)}
          />
        )}
      </div>
    </>
  )
}
