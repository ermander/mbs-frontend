'use client'

import { useRef, useMemo } from 'react'
import type { SharedFilters } from '@/types/shared-filters'
import { multiplaEventKey } from '@/types/multipla-event'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SPORT_LABELS: Record<string, { label: string; icon: string }> = {
  '0': { label: 'Calcio', icon: '\u26BD' },
  '1': { label: 'Tennis', icon: '\uD83C\uDFBE' },
  '2': { label: 'Basket', icon: '\uD83C\uDFC0' },
}

function getSportDisplay(sportId: string) {
  return SPORT_LABELS[sportId] ?? { label: `Sport ${sportId}`, icon: '' }
}

function formatDateShort(date: string, hour: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m} ${hour}`
}

interface MultiplaPanelProps {
  filters: SharedFilters
  sports: string[]
  onSave?: () => void
}

export function MultiplaPanel({ filters, sports, onSave }: MultiplaPanelProps) {
  const {
    sharedStake,
    sharedBonus,
    sharedRimborso,
    multiplaNumEventi,
    setMultiplaNumEventi,
    multiplaQuotaMinEvento,
    setMultiplaQuotaMinEvento,
    multiplaQuotaMaxEvento,
    setMultiplaQuotaMaxEvento,
    multiplaQuotaMinTotale,
    setMultiplaQuotaMinTotale,
    multiplaDataInizio,
    setMultiplaDataInizio,
    multiplaDataFine,
    setMultiplaDataFine,
    multiplaSelectedEvents,
    setMultiplaSelectedEvents,
    multiplaSportIds,
    setMultiplaSportIds,
    eliminaMultipla,
    resetMultiplaFilters,
  } = filters

  const multiplaDataInizioRef = useRef<HTMLInputElement>(null)
  const multiplaDataFineRef = useRef<HTMLInputElement>(null)

  // ── Computed values ──
  const multiplaRating = useMemo(() => {
    if (multiplaSelectedEvents.length === 0) return null
    let product = 1
    for (const ev of multiplaSelectedEvents) {
      const main = parseFloat(ev.mainOdd)
      const cover = parseFloat(ev.coverOdd)
      const c = ev.commissionPercent / 100
      if (Number.isNaN(main) || Number.isNaN(cover) || cover <= 0) return null
      if (ev.type === 'punta-punta') {
        if (cover <= 1) return null
        product *= (main * (cover - 1)) / cover
      } else {
        const coverEffective = cover - c
        if (coverEffective <= 0) return null
        product *= (main * (1 - c)) / coverEffective
      }
    }
    return product * 100
  }, [multiplaSelectedEvents])

  const quotaMultipla = useMemo(() => {
    if (multiplaSelectedEvents.length === 0) return null
    return multiplaSelectedEvents.reduce((acc, ev) => {
      const main = parseFloat(ev.mainOdd)
      return Number.isNaN(main) ? acc : acc * main
    }, 1)
  }, [multiplaSelectedEvents])

  const guadagnoMultipla = useMemo(() => {
    if (quotaMultipla == null || multiplaSelectedEvents.length === 0) return null
    const stake = Number.parseFloat(sharedStake) || 0
    const bonus = Number.parseFloat(sharedBonus) || 0
    const rimborso = Number.parseFloat(sharedRimborso) || 0
    const backStakeTotale = stake + bonus
    if (backStakeTotale <= 0) return null
    const results = multiplaLayStakes(
      backStakeTotale,
      quotaMultipla,
      multiplaSelectedEvents.map((ev) => ({
        type: ev.type,
        coverOdds: parseFloat(ev.coverOdd),
        commissionPercent: ev.commissionPercent,
      })),
      rimborso,
    )
    const totalHedgeCost = results.reduce((sum, r) => sum + r.hedgeCost, 0)
    return backStakeTotale * quotaMultipla - stake - totalHedgeCost
  }, [quotaMultipla, multiplaSelectedEvents, sharedStake, sharedBonus, sharedRimborso])

  return (
    <div className="mt-2 animate-fade-in rounded-xl border border-neon-lavender/20 bg-surface-1 p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                N. Eventi
              </Label>
              <select
                value={multiplaNumEventi}
                onChange={(e) => setMultiplaNumEventi(Number(e.target.value))}
                className="h-8 w-full min-w-0 rounded-lg border border-border bg-surface-1 px-3 text-sm text-foreground"
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Quota min evento
              </Label>
              <Input
                type="number"
                placeholder="—"
                value={multiplaQuotaMinEvento}
                onChange={(e) => setMultiplaQuotaMinEvento(e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                className="h-8 w-full min-w-0 text-sm"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Quota max evento
              </Label>
              <Input
                type="number"
                placeholder="—"
                value={multiplaQuotaMaxEvento}
                onChange={(e) => setMultiplaQuotaMaxEvento(e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                className="h-8 w-full min-w-0 text-sm"
                min={1}
                step={0.01}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Quota min totale
              </Label>
              <Input
                type="number"
                value={multiplaQuotaMinTotale}
                onChange={(e) => setMultiplaQuotaMinTotale(e.target.value)}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                className="h-8 w-full min-w-0 text-sm"
                min={1}
                step={0.01}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Sport
            </span>
            {sports.map((s) => {
              const { icon, label } = getSportDisplay(s)
              const active = multiplaSportIds.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setMultiplaSportIds((prev) =>
                      active ? prev.filter((id) => id !== s) : [...prev, s],
                    )
                  }
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${active ? 'border-neon-lavender/60 bg-neon-lavender/15 text-foreground' : 'border-border bg-surface-1 text-muted-foreground hover:text-foreground'}`}
                >
                  {icon && <span aria-hidden>{icon}</span>}
                  {label}
                </button>
              )
            })}
            {multiplaSportIds.length > 0 && (
              <button
                type="button"
                onClick={() => setMultiplaSportIds([])}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Tutti
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 sm:max-w-sm">
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Data inizio
              </Label>
              <div className="relative">
                <Input
                  ref={multiplaDataInizioRef}
                  type="date"
                  value={multiplaDataInizio}
                  onChange={(e) => setMultiplaDataInizio(e.target.value)}
                  className="h-8 w-full min-w-0 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => multiplaDataInizioRef.current?.showPicker?.()}
                  className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Apri selettore data"
                >
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Data fine
              </Label>
              <div className="relative">
                <Input
                  ref={multiplaDataFineRef}
                  type="date"
                  value={multiplaDataFine}
                  onChange={(e) => setMultiplaDataFine(e.target.value)}
                  className="h-8 w-full min-w-0 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => multiplaDataFineRef.current?.showPicker?.()}
                  className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label="Apri selettore data"
                >
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Eventi selezionati — inline sidebar */}
        <div className="flex flex-col gap-2 border-t border-border pt-3 lg:min-w-[240px] lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Eventi selezionati
            </p>
            <p className="font-mono text-sm font-semibold text-emerald-400">
              {multiplaRating != null ? `${multiplaRating.toFixed(2)}%` : '—'}
              {quotaMultipla != null && (
                <span className="ml-1.5 text-muted-foreground">· {quotaMultipla.toFixed(2)}</span>
              )}
              {guadagnoMultipla != null && (
                <span
                  className={cn(
                    'ml-1.5',
                    guadagnoMultipla >= 0 ? 'text-emerald-400' : 'text-red-400',
                  )}
                >
                  · {guadagnoMultipla >= 0 ? '+' : ''}
                  {guadagnoMultipla.toFixed(2)} €
                </span>
              )}
            </p>
          </div>
          {multiplaSelectedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Clicca sugli eventi nelle tabelle per aggiungerli.
            </p>
          ) : (
            <ul className="space-y-1">
              {multiplaSelectedEvents.map((ev) => (
                <li
                  key={multiplaEventKey(ev)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                >
                  <span className="truncate">
                    <span
                      className={cn(
                        'mr-1 rounded px-1 py-0.5 text-[10px] font-bold',
                        ev.type === 'punta-banca'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-sky-500/15 text-sky-300',
                      )}
                    >
                      {ev.type === 'punta-banca' ? 'PB' : 'PP'}
                    </span>
                    {ev.home} – {ev.away}{' '}
                    <span className="text-muted-foreground">
                      ({formatDateShort(ev.date, ev.hour)})
                    </span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Rimuovi"
                    onClick={() =>
                      setMultiplaSelectedEvents((prev) =>
                        prev.filter((r) => multiplaEventKey(r) !== multiplaEventKey(ev)),
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={resetMultiplaFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="inline h-3 w-3" /> Reset
            </button>
            <button
              type="button"
              onClick={eliminaMultipla}
              className="text-xs text-destructive hover:text-destructive/80"
            >
              <X className="inline h-3 w-3" /> Elimina
            </button>
            {onSave && (
              <Button
                size="sm"
                className="ml-auto h-7 text-xs"
                disabled={
                  multiplaSelectedEvents.length !== multiplaNumEventi ||
                  ((Number.parseFloat(sharedStake) || 0) <= 0 &&
                    (Number.parseFloat(sharedBonus) || 0) <= 0) ||
                  (multiplaQuotaMinTotale.trim() !== '' &&
                    quotaMultipla != null &&
                    quotaMultipla < (Number.parseFloat(multiplaQuotaMinTotale) || 0))
                }
                onClick={onSave}
              >
                Salva
              </Button>
            )}
          </div>
          {multiplaSelectedEvents.length === multiplaNumEventi &&
            multiplaQuotaMinTotale.trim() !== '' &&
            quotaMultipla != null &&
            quotaMultipla < (Number.parseFloat(multiplaQuotaMinTotale) || 0) && (
              <p className="text-[11px] text-amber-500">
                Quota totale {quotaMultipla.toFixed(2)} inferiore alla minima (
                {multiplaQuotaMinTotale}).
              </p>
            )}
        </div>
      </div>
    </div>
  )
}
