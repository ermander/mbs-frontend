'use client'

import { RefreshCw, Sparkles, X } from 'lucide-react'
import { DsButton, dsButtonClass } from '@/components/landing/ds-primitives'
import { CalcNumberField, CalcSelect, CalcTextField } from '@/components/calculators/calc-ds'
import { loginHref } from '@/lib/auth-redirects'
import { LANDING_ROUTES } from '@/lib/landing-content'
import { ageLabel, ageSeconds } from '@/lib/matcher/format'
import type { MatcherMeta } from '@/types/matcher'
import { cn } from '@/lib/utils'
import { SORT_OPTIONS, type ScannerV2Filters } from './scanner-v2-filter-bar'

/** Where «Ho già un account» brings the visitor back after the login: the full Oddsmatcher. */
export const ODDSMATCHER_PATH = '/odds-scanner'

/** The filters a visitor has (§14.339): quota minima e massima, date. */
export function hasFreeFilter(f: ScannerV2Filters): boolean {
  return [f.minOdds, f.maxOdds, f.startFrom, f.startTo].some((v) => v.trim() !== '')
}

interface ScannerV2FreeFilterBarProps {
  filters: ScannerV2Filters
  onChange: (patch: Partial<ScannerV2Filters>) => void
  onReset: () => void
  /** «Aggiorna»: reloads the results with the filters applied right now. */
  onRefresh: () => void
  meta: MatcherMeta | null
  loading: boolean
  /** Clock of the page, for «Quote aggiornate … fa». */
  now: number
}

/**
 * The bar of the free Oddsmatcher, for visitors who are not logged in (§14.339): the rows are only
 * back on Sisal (the Snai prices, §14.51) and lay on an exchange, and the backend enforces it. No
 * search, no bookmaker menus, no advanced panel and no Multipla: of the filters only the price of
 * the back leg (minima, massima) and the kickoff window (Dal, Al), next to the shared stake and the
 * sort, all in the card. Above it, one line on what the free version shows and the way to the rest.
 */
export function ScannerV2FreeFilterBar({
  filters,
  onChange,
  onReset,
  onRefresh,
  meta,
  loading,
  now,
}: ScannerV2FreeFilterBarProps) {
  const age = meta?.calculatedAt != null ? ageLabel(ageSeconds(meta.calculatedAt, now)) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-ds-md border border-ds-line bg-ds-brand-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="ds-body-sm m-0 flex items-start gap-2 text-ds-ink">
          <Sparkles className="mt-0.5 h-4 w-4 flex-none text-ds-brand" aria-hidden />
          <span>
            <b>Versione gratuita:</b> punta su Sisal (stesse quote di Snai) e banca
            sull&apos;exchange. Con un account, gratuito, hai tutti i siti di scommesse, la ricerca,
            gli altri filtri e la multipla.
          </span>
        </p>
        <div className="flex flex-none flex-wrap gap-2">
          <DsButton href={LANDING_ROUTES.register} variant="primary" size="sm">
            Iscriviti gratis
          </DsButton>
          <DsButton href={loginHref(ODDSMATCHER_PATH)} variant="ghost" size="sm">
            Ho già un account
          </DsButton>
        </div>
      </div>

      <div className="grid grid-cols-2 items-end gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised px-4 py-4 shadow-ds-sm sm:px-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_120px_150px]">
        <CalcNumberField
          id="om-min-odds"
          label="Quota minima"
          size="md"
          placeholder="es. 1,50"
          value={filters.minOdds}
          onChange={(v) => onChange({ minOdds: v })}
        />
        <CalcNumberField
          id="om-max-odds"
          label="Quota massima"
          size="md"
          placeholder="—"
          value={filters.maxOdds}
          onChange={(v) => onChange({ maxOdds: v })}
        />
        <CalcTextField
          id="om-from"
          label="Dal"
          type="datetime-local"
          size="md"
          value={filters.startFrom}
          onChange={(v) => onChange({ startFrom: v })}
        />
        <CalcTextField
          id="om-to"
          label="Al"
          type="datetime-local"
          size="md"
          value={filters.startTo}
          onChange={(v) => onChange({ startTo: v })}
        />
        <CalcNumberField
          id="om-stake"
          label="Puntata"
          suffix="€"
          placeholder="0,00"
          value={filters.stake}
          onChange={(v) => onChange({ stake: v })}
        />
        <CalcSelect
          id="om-sort"
          label="Ordina per"
          size="md"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(v) => onChange({ sort: v === 'start_time' ? 'start_time' : 'rating' })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {hasFreeFilter(filters) && (
            <button type="button" onClick={onReset} className={dsButtonClass('ghost', 'sm')}>
              <X className="h-4 w-4" aria-hidden />
              Azzera
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {age && <span className="ds-caption text-ds-ink-muted">Quote aggiornate {age} fa</span>}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-busy={loading}
            className={cn(dsButtonClass('ghost', 'sm'), 'disabled:cursor-wait disabled:opacity-70')}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
            Aggiorna
          </button>
        </div>
      </div>
    </div>
  )
}
