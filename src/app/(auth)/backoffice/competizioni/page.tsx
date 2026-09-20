'use client'

import { useEffect, useMemo, useState } from 'react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
    <Container className="max-w-none">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Competizioni da leggere
          </h2>
          <p className="text-sm text-muted-foreground">
            Tutto il catalogo, senza finestra temporale. Gli interruttori dicono agli scraper per
            quali competizioni leggere le quote dei bookmaker: il catalogo delle partite resta
            completo, cambia solo dove vanno a prendere le quote. Le leghe nuove entrano accese.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setTick((t) => t + 1)}>
          Ricarica
        </Button>
      </div>

      {catalog && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Lette dagli scraper"
            value={`${num(catalog.scrapeEnabledCompetitions)} / ${num(catalog.totalCompetitions)}`}
            hint="Competizioni accese sul totale del catalogo"
          />
          <Stat
            label="Con partite future"
            value={num(catalog.competitionsWithFutureFixtures)}
            hint="Competizioni con almeno una partita in programma"
          />
          <Stat
            label="Spente"
            value={num(catalog.totalCompetitions - catalog.scrapeEnabledCompetitions)}
            hint="Competizioni che nessun bookmaker viene interrogato per"
          />
        </div>
      )}

      <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div className="flex min-w-[16rem] flex-1 flex-col gap-1">
            <Label htmlFor="comp-q" className="text-xs text-muted-foreground">
              Cerca competizione o nazione
            </Label>
            <Input
              id="comp-q"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="es. Serie A, Premier, Italy"
            />
          </div>
          <div className="w-56">
            <SearchableSelect
              id="comp-mode"
              label="Mostra"
              options={MODES}
              value={mode}
              onChange={(value) => setMode((value as Mode) || 'all')}
              size="sm"
            />
          </div>
        </div>
        {notice && (
          <div
            className={`mt-2 flex items-center gap-2 text-xs ${
              notice.error ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => setNotice(null)}
            >
              ok
            </button>
          </div>
        )}
      </div>

      <div className="relative rounded-lg border border-border bg-card px-2 py-2">
        {loading && (
          <div className="absolute right-3 top-2 text-[11px] text-muted-foreground">aggiorno…</div>
        )}
        {error ? (
          <p className="px-2 py-4 text-sm text-destructive">{error}</p>
        ) : !filtered ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            {loading ? 'Caricamento...' : 'Nessun dato.'}
          </p>
        ) : (
          <CatalogTree
            catalog={filtered}
            autoExpand={autoExpand}
            busy={busy}
            onScrapeChange={(selection, what) => void handleScrapeChange(selection, what)}
          />
        )}
      </div>
    </Container>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3" title={hint}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}
