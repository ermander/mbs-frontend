'use client'

import { RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatKickoff } from '@/lib/matcher/format'
import { multiplaSummary, sortedByKickoff } from '@/lib/matcher/multipla'
import type { SharedAmounts } from '@/lib/matcher/quick-profit'
import { multiplaEventKey, type MultiplaEvent } from '@/types/multipla-event'
import { cn } from '@/lib/utils'

export interface MultiplaParams {
  numEventi: number
  quotaMinEvento: string
  quotaMaxEvento: string
  quotaMinTotale: string
  dataInizio: string
  dataFine: string
}

export const EMPTY_MULTIPLA_PARAMS: MultiplaParams = {
  numEventi: 2,
  quotaMinEvento: '',
  quotaMaxEvento: '',
  quotaMinTotale: '1.00',
  dataInizio: '',
  dataFine: '',
}

interface ScannerV2MultiplaPanelProps {
  params: MultiplaParams
  onParamsChange: (patch: Partial<MultiplaParams>) => void
  selected: MultiplaEvent[]
  onRemove: (event: MultiplaEvent) => void
  onClear: () => void
  onSave: () => void
  shared: SharedAmounts
  /** The book the multipla is played on; null until exactly one book is chosen in the filter. */
  bookName: string | null
}

const LABEL_CLASS = 'font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground'
const noExponent = (e: React.KeyboardEvent<HTMLInputElement>) =>
  ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()

/**
 * The Multipla of the scanner v2: the old panel on the rows of the store.
 * Events are ticked in the table (one book on the punta side, kickoffs in
 * order); the hedges are sized as in the old scanner (`multiplaLayStakes`).
 */
export function ScannerV2MultiplaPanel({
  params,
  onParamsChange,
  selected,
  onRemove,
  onClear,
  onSave,
  shared,
  bookName,
}: ScannerV2MultiplaPanelProps) {
  const summary = multiplaSummary(selected, shared.puntata, shared.bonus, shared.rimborso)
  const quotaMinTotale = Number.parseFloat(params.quotaMinTotale) || 0
  const belowMinTotale =
    params.quotaMinTotale.trim() !== '' &&
    summary.quotaTotale != null &&
    summary.quotaTotale < quotaMinTotale
  const hasStake = (shared.puntata ?? 0) > 0 || shared.bonus > 0
  const complete = selected.length === params.numEventi
  const canSave = complete && hasStake && !belowMinTotale && summary.guadagno != null

  return (
    <div className="mt-2 animate-fade-in rounded-ow-card border border-border bg-surface-1 p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {bookName ? (
              <>
                Multipla su <span className="font-medium text-foreground">{bookName}</span>: spunta
                gli eventi nella tabella, in ordine di calcio d&apos;inizio. La puntata va sul book,
                ogni evento viene coperto sull&apos;altra gamba della sua riga.
              </>
            ) : (
              <>
                Scegli <span className="font-medium text-foreground">un solo book</span> nel filtro
                Book: gli eventi della multipla partono da lì.
              </>
            )}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>N. Eventi</Label>
              <select
                value={params.numEventi}
                onChange={(e) => onParamsChange({ numEventi: Number(e.target.value) })}
                className="h-8 w-full min-w-0 rounded-ow-btn border border-border bg-surface-1 px-3 text-[13px] text-foreground"
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Quota min evento</Label>
              <Input
                type="number"
                placeholder="—"
                value={params.quotaMinEvento}
                onChange={(e) => onParamsChange({ quotaMinEvento: e.target.value })}
                onKeyDown={noExponent}
                className="h-8 w-full min-w-0 rounded-ow-btn text-[13px]"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Quota max evento</Label>
              <Input
                type="number"
                placeholder="—"
                value={params.quotaMaxEvento}
                onChange={(e) => onParamsChange({ quotaMaxEvento: e.target.value })}
                onKeyDown={noExponent}
                className="h-8 w-full min-w-0 rounded-ow-btn text-[13px]"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Quota min totale</Label>
              <Input
                type="number"
                value={params.quotaMinTotale}
                onChange={(e) => onParamsChange({ quotaMinTotale: e.target.value })}
                onKeyDown={noExponent}
                className="h-8 w-full min-w-0 rounded-ow-btn text-[13px]"
                min={1}
                step={0.01}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 sm:max-w-sm">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Data inizio</Label>
              <Input
                type="date"
                value={params.dataInizio}
                onChange={(e) => onParamsChange({ dataInizio: e.target.value })}
                className="h-8 w-full min-w-0 rounded-ow-btn text-[13px]"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className={LABEL_CLASS}>Data fine</Label>
              <Input
                type="date"
                value={params.dataFine}
                onChange={(e) => onParamsChange({ dataFine: e.target.value })}
                className="h-8 w-full min-w-0 rounded-ow-btn text-[13px]"
              />
            </div>
          </div>
        </div>

        {/* Eventi selezionati */}
        <div className="flex flex-col gap-2 border-t border-border pt-3 lg:min-w-[280px] lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.02em] text-muted-foreground">
              Eventi selezionati {selected.length}/{params.numEventi}
            </p>
            <p className="font-mono text-sm font-medium tabular-nums text-foreground">
              {summary.rating != null ? `${summary.rating.toFixed(2)}%` : '—'}
              {summary.quotaTotale != null && (
                <span className="ml-1.5 text-muted-foreground">
                  · {summary.quotaTotale.toFixed(2)}
                </span>
              )}
              {summary.guadagno != null && (
                <span
                  className={cn(
                    'ml-1.5',
                    summary.guadagno >= 0 ? 'text-emerald-400' : 'text-red-400',
                  )}
                >
                  · {summary.guadagno >= 0 ? '+' : ''}
                  {summary.guadagno.toFixed(2)} €
                </span>
              )}
            </p>
          </div>
          {selected.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Spunta gli eventi nella tabella per aggiungerli.
            </p>
          ) : (
            <ul className="space-y-1">
              {sortedByKickoff(selected).map((ev, i) => {
                const hedge = summary.hedges[i]
                return (
                  <li
                    key={multiplaEventKey(ev)}
                    className="flex items-center justify-between gap-2 rounded-ow-btn border border-border bg-background px-2 py-1 text-xs"
                  >
                    <span className="min-w-0 truncate">
                      <span
                        className="mr-1 rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground"
                        title={ev.type === 'punta-banca' ? 'Punta-Banca' : 'Punta-Punta'}
                      >
                        {ev.type === 'punta-banca' ? 'PB' : 'PP'}
                      </span>
                      {ev.home} – {ev.away}{' '}
                      <span className="text-muted-foreground">
                        {ev.selection} @ {ev.mainOdd}
                        {ev.startTimeIso ? ` · ${formatKickoff(ev.startTimeIso)}` : ''}
                        {hedge ? ` · copertura ${hedge.hedgeStake.toFixed(2)} €` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Rimuovi"
                      onClick={() => onRemove(ev)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onParamsChange({ ...EMPTY_MULTIPLA_PARAMS })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="inline h-3 w-3" /> Reset
            </button>
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-destructive hover:text-destructive/80"
              disabled={selected.length === 0}
            >
              <X className="inline h-3 w-3" /> Elimina
            </button>
            <Button
              size="sm"
              className="ml-auto h-7 rounded-ow-btn text-xs"
              disabled={!canSave}
              onClick={onSave}
            >
              Salva nel Profit Tracker
            </Button>
          </div>
          {complete && !hasStake && (
            <p className="text-[11px] text-amber-400">
              Inserisci la puntata (o il bonus) nella barra per salvare.
            </p>
          )}
          {belowMinTotale && summary.quotaTotale != null && (
            <p className="text-[11px] text-amber-500">
              Quota totale {summary.quotaTotale.toFixed(2)} inferiore alla minima (
              {params.quotaMinTotale}).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
