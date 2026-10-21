'use client'

import { ListChecks, X } from 'lucide-react'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { CalcNumberField, CalcStepper, CalcTextField } from '@/components/calculators/calc-ds'
import { DsMoney } from '@/components/landing/ds-data'
import { parseNum } from '@/lib/calculators/engines/odds'
import { formatMoney, formatOdds } from '@/lib/landing-format'
import { formatKickoff } from '@/lib/matcher/format'
import { multiplaSummary, sortedByKickoff } from '@/lib/matcher/multipla'
import type { SharedAmounts } from '@/lib/matcher/quick-profit'
import { multiplaEventKey, type MultiplaEvent } from '@/types/multipla-event'
import { cn } from '@/lib/utils'
import { OmRating } from './om-ds'

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
  quotaMinTotale: '1,00',
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
  /** Bonus and rimborso of the page, edited here (the stake sits in the bar). */
  bonus: string
  rimborso: string
  onAmountsChange: (patch: { bonus?: string; rimborso?: string }) => void
  /** The book the multipla is played on; null until exactly one book is chosen in the filter. */
  bookName: string | null
}

/**
 * The Multipla of the scanner v2 in the design of §14.272: the parameters on the left, the
 * summary on the right (events chosen, rating, total price and result) with the chosen events,
 * «Azzera» and «Salva nel tracker». Events are ticked in the table (one book on the punta side,
 * kickoffs in order); the hedges are sized as in the old scanner (`multiplaLayStakes`).
 */
export function ScannerV2MultiplaPanel({
  params,
  onParamsChange,
  selected,
  onRemove,
  onClear,
  onSave,
  shared,
  bonus,
  rimborso,
  onAmountsChange,
  bookName,
}: ScannerV2MultiplaPanelProps) {
  const summary = multiplaSummary(selected, shared.puntata, shared.bonus, shared.rimborso)
  const quotaMinTotale = parseNum(params.quotaMinTotale) ?? 0
  const belowMinTotale =
    params.quotaMinTotale.trim() !== '' &&
    summary.quotaTotale != null &&
    summary.quotaTotale < quotaMinTotale
  const hasStake = (shared.puntata ?? 0) > 0 || shared.bonus > 0
  const complete = selected.length === params.numEventi
  const canSave = complete && hasStake && !belowMinTotale && summary.guadagno != null

  return (
    <div className="grid gap-6 rounded-ds-md border border-ds-line bg-ds-surface-raised p-4 shadow-ds-sm sm:p-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <p className="ds-body-sm m-0 text-ds-ink-muted">
          {bookName ? (
            <>
              Multipla su <b className="font-semibold text-ds-ink">{bookName}</b>: spunta gli eventi
              nella tabella, in ordine di calcio d&apos;inizio. La puntata va sul book, ogni evento
              viene coperto sull&apos;altra gamba della sua riga.
            </>
          ) : (
            <>
              Scegli <b className="font-semibold text-ds-ink">un solo sito di scommesse</b> in
              «Bookmaker principale»: gli eventi della multipla partono da lì. Poi spunta le righe
              nella tabella.
            </>
          )}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CalcStepper
            id="om-multi-n"
            label="N. eventi"
            value={params.numEventi}
            min={2}
            max={8}
            unit="eventi"
            onChange={(n) => onParamsChange({ numEventi: Math.round(n) })}
          />
          <CalcNumberField
            id="om-multi-min"
            label="Quota minima evento"
            placeholder="—"
            value={params.quotaMinEvento}
            onChange={(v) => onParamsChange({ quotaMinEvento: v })}
          />
          <CalcNumberField
            id="om-multi-max"
            label="Quota massima evento"
            placeholder="—"
            value={params.quotaMaxEvento}
            onChange={(v) => onParamsChange({ quotaMaxEvento: v })}
          />
          <CalcNumberField
            id="om-multi-total"
            label="Quota minima totale"
            placeholder="1,00"
            value={params.quotaMinTotale}
            onChange={(v) => onParamsChange({ quotaMinTotale: v })}
          />
          <CalcTextField
            id="om-multi-from"
            label="Data inizio"
            type="date"
            size="md"
            value={params.dataInizio}
            onChange={(v) => onParamsChange({ dataInizio: v })}
          />
          <CalcTextField
            id="om-multi-to"
            label="Data fine"
            type="date"
            size="md"
            value={params.dataFine}
            onChange={(v) => onParamsChange({ dataFine: v })}
          />
          <CalcNumberField
            id="om-multi-bonus"
            label="Puntata bonus"
            suffix="€"
            value={bonus}
            onChange={(v) => onAmountsChange({ bonus: v })}
          />
          <CalcNumberField
            id="om-multi-refund"
            label="Rimborso"
            suffix="€"
            value={rimborso}
            onChange={(v) => onAmountsChange({ rimborso: v })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-ds-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <span className="ds-label uppercase text-ds-ink-muted">Multipla</span>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="ds-caption text-ds-ink-muted">Eventi</div>
            <div className="ds-num-xl">
              {selected.length}{' '}
              <span className="ds-body text-ds-ink-muted">su {params.numEventi}</span>
            </div>
          </div>
          <div>
            <div className="ds-caption text-ds-ink-muted">Rating multipla</div>
            <div className="mt-1.5">
              {summary.rating != null ? (
                <OmRating value={summary.rating} large />
              ) : (
                <span className="ds-num-xl text-ds-ink-faint">—</span>
              )}
            </div>
          </div>
          <div>
            <div className="ds-caption text-ds-ink-muted">Quota totale</div>
            <div className="ds-num">
              {summary.quotaTotale != null ? formatOdds(summary.quotaTotale) : '—'}
            </div>
          </div>
          <div>
            <div className="ds-caption text-ds-ink-muted">Guadagno</div>
            {summary.guadagno != null ? (
              <DsMoney value={summary.guadagno} />
            ) : (
              <div className="ds-num text-ds-ink-faint">—</div>
            )}
          </div>
        </div>

        {selected.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {sortedByKickoff(selected).map((ev, i) => {
              const hedge = summary.hedges[i]
              return (
                <li
                  key={multiplaEventKey(ev)}
                  className="flex items-start justify-between gap-2 rounded-ds-sm border border-ds-line bg-ds-surface px-2.5 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="ds-body-sm block truncate font-semibold text-ds-ink">
                      {ev.home} – {ev.away}
                    </span>
                    <span className="ds-caption block text-ds-ink-muted">
                      {ev.type === 'punta-banca' ? 'Punta-Banca' : 'Punta-Punta'} · {ev.selection} @{' '}
                      {formatOdds(parseNum(ev.mainOdd) ?? 0)}
                      {ev.startTimeIso ? ` · ${formatKickoff(ev.startTimeIso)}` : ''}
                      {hedge
                        ? ` · copertura ${formatMoney(hedge.hedgeStake, { sign: false })}`
                        : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Togli ${ev.home} – ${ev.away} dalla multipla`}
                    onClick={() => onRemove(ev)}
                    className={cn(dsButtonClass('ghost', 'sm'), 'h-7 w-7 flex-none px-0')}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {complete && !hasStake && (
          <p className="ds-body-sm m-0 text-ds-warning">
            Inserisci la puntata nella barra (o la puntata bonus qui) per salvare.
          </p>
        )}
        {belowMinTotale && summary.quotaTotale != null && (
          <p className="ds-body-sm m-0 text-ds-warning">
            Quota totale {formatOdds(summary.quotaTotale)} sotto la minima ({params.quotaMinTotale}
            ).
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onClear}
            disabled={selected.length === 0}
            className={cn(dsButtonClass('ghost', 'sm'), 'disabled:opacity-50')}
          >
            Azzera
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            className={cn(
              dsButtonClass('primary', 'sm'),
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <ListChecks className="h-4 w-4" aria-hidden />
            Salva nel tracker
          </button>
        </div>
      </div>
    </div>
  )
}
