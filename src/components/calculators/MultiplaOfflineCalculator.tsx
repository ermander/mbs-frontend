'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
import { MARKET_OPTIONS, formatMercatoString, isTeamScopedMarket } from '@/lib/calculators/markets'
import { MultiplaOfflineSaveModal } from '@/components/calculators/MultiplaOfflineSaveModal'
import { TeamScopeToggle } from '@/components/calculators/team-scope-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'
import type { OfflineMultiplaEvent } from '@/types/offline-multipla-event'

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatSigned(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

function getDefaultDateTimeLocal(): string {
  const now = new Date()
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  )
  return d.toISOString().slice(0, 16)
}

let nextEventId = 1

function createEmptyEvent(): OfflineMultiplaEvent {
  return {
    id: `evt-${nextEventId++}`,
    type: 'punta-banca',
    eventName: '',
    date: getDefaultDateTimeLocal(),
    sport: 'calcio',
    competition: '',
    market: '',
    marketScope: '',
    mainOdds: '',
    coverOdds: '',
    commissionPercent: '0',
  }
}

const SPORTS = [
  { value: 'calcio', label: 'Calcio' },
  { value: 'tennis', label: 'Tennis' },
  { value: 'basket', label: 'Basket' },
  { value: 'altro', label: 'Altro' },
]

export function MultiplaOfflineCalculator() {
  const [stakeReale, setStakeReale] = useState('')
  const [stakeBonus, setStakeBonus] = useState('')
  const [rimborso, setRimborso] = useState('')
  const [events, setEvents] = useState<OfflineMultiplaEvent[]>([
    createEmptyEvent(),
    createEmptyEvent(),
  ])
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stakeRealeNum = parseNum(stakeReale) ?? 0
  const stakeBonusNum = parseNum(stakeBonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const backStakeTotale = stakeRealeNum + stakeBonusNum

  const totalBackOdds = useMemo(() => {
    return events.reduce((acc, ev) => {
      const odds = parseNum(ev.mainOdds)
      return odds != null && odds > 0 ? acc * odds : acc
    }, 1)
  }, [events])

  const hedgeEvents = useMemo(() => {
    return events.map((ev) => ({
      type: ev.type,
      coverOdds: parseNum(ev.coverOdds) ?? 0,
      commissionPercent: parseNum(ev.commissionPercent) ?? 0,
    }))
  }, [events])

  const hedgeResults = useMemo(() => {
    return multiplaLayStakes(backStakeTotale, totalBackOdds, hedgeEvents, rimborsoNum)
  }, [backStakeTotale, totalBackOdds, hedgeEvents, rimborsoNum])

  const allEventsValid = useMemo(() => {
    return (
      events.length >= 2 &&
      events.every((ev) => {
        const main = parseNum(ev.mainOdds)
        const cover = parseNum(ev.coverOdds)
        return main != null && main > 1 && cover != null && cover > 1
      })
    )
  }, [events])

  const totalHedgeCost = useMemo(() => {
    return hedgeResults.reduce((acc, r) => acc + r.hedgeCost, 0)
  }, [hedgeResults])

  const vincitaPotenziale = backStakeTotale * totalBackOdds
  const profittoNetto = vincitaPotenziale - stakeRealeNum - totalHedgeCost

  const showSummary = backStakeTotale > 0 && allEventsValid

  const canSave = showSummary && hedgeResults.every((r) => r.hedgeStake > 0)

  // Event management
  const addEvent = () => {
    setEvents((prev) => [...prev, createEmptyEvent()])
  }

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id))
  }

  const updateEvent = (id: string, updates: Partial<OfflineMultiplaEvent>) => {
    setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)))
  }

  const moveEvent = (index: number, direction: 'up' | 'down') => {
    setEvents((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Sezione Stake */}
      <div className="border-b border-border bg-primary/5 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">
          Stake Multipla
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="stake-reale">Puntata reale</Label>
            <div className="relative">
              <Input
                id="stake-reale"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={stakeReale}
                onChange={(e) => setStakeReale(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stake-bonus">Puntata bonus</Label>
            <div className="relative">
              <Input
                id="stake-bonus"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={stakeBonus}
                onChange={(e) => setStakeBonus(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rimborso">Valore rimborso</Label>
            <div className="relative">
              <Input
                id="rimborso"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={rimborso}
                onChange={(e) => setRimborso(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Eventi */}
      <div className="border-b border-border p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Selezioni Multipla
        </p>
        <div className="space-y-4">
          {events.map((ev, index) => {
            const isCollapsed = collapsedIds.has(ev.id)
            const hr = hedgeResults[index]
            const dateFormatted = ev.date
              ? new Date(ev.date).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'

            return (
              <div key={ev.id} className="rounded-xl border border-border bg-muted/10">
                {/* Header - sempre visibile, cliccabile per collassare */}
                <div
                  className="flex cursor-pointer items-center justify-between gap-2 p-3 sm:p-4"
                  onClick={() => toggleCollapse(ev.id)}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div
                      className="flex rounded-md border border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => updateEvent(ev.id, { type: 'punta-banca' })}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium transition-colors',
                          ev.type === 'punta-banca'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        P-B
                      </button>
                      <button
                        type="button"
                        onClick={() => updateEvent(ev.id, { type: 'punta-punta' })}
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium transition-colors',
                          ev.type === 'punta-punta'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        P-P
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => moveEvent(index, 'up')}
                      disabled={index === 0}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEvent(index, 'down')}
                      disabled={index === events.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    {events.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeEvent(ev.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Vista collassata - riepilogo su due righe */}
                {isCollapsed && (
                  <div className="border-t border-border/50 px-3 pb-3 sm:px-4 sm:pb-4">
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="pb-1 pr-3 text-left font-normal">Evento</th>
                            <th className="pb-1 pr-3 text-left font-normal">Data/ora</th>
                            <th className="pb-1 pr-3 text-left font-normal">Mercato</th>
                            <th className="pb-1 pr-3 text-right font-normal">Q. Punta</th>
                            <th className="pb-1 pr-3 text-right font-normal">
                              {ev.type === 'punta-banca' ? 'Q. Banca' : 'Q. Punta 2'}
                            </th>
                            <th className="pb-1 pr-3 text-right font-normal">Stake</th>
                            <th className="pb-1 text-right font-normal">Resp.</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="font-mono text-xs">
                            <td className="pr-3 font-sans font-medium text-foreground">
                              {ev.eventName || '—'}
                            </td>
                            <td className="whitespace-nowrap pr-3 text-muted-foreground">
                              {dateFormatted}
                            </td>
                            <td className="pr-3 font-sans text-muted-foreground">
                              {formatMercatoString(ev.market, ev.marketScope) || '—'}
                            </td>
                            <td className="pr-3 text-right">{formatNum(parseNum(ev.mainOdds))}</td>
                            <td className="pr-3 text-right">{formatNum(parseNum(ev.coverOdds))}</td>
                            <td className="pr-3 text-right text-destructive">
                              {formatNum(hr?.hedgeStake ?? null)} €
                            </td>
                            <td className="text-right">{formatNum(hr?.hedgeCost ?? null)} €</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Vista espansa - form completo */}
                {!isCollapsed && (
                  <div className="border-t border-border/50 px-3 pb-3 sm:px-4 sm:pb-4">
                    {/* Inputs evento */}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                        <Label htmlFor={`ev-name-${ev.id}`} className="text-xs">
                          Nome evento
                        </Label>
                        <Input
                          id={`ev-name-${ev.id}`}
                          placeholder="Es. Roma - Milan"
                          value={ev.eventName}
                          onChange={(e) => updateEvent(ev.id, { eventName: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`ev-date-${ev.id}`} className="text-xs">
                          Data/ora
                        </Label>
                        <Input
                          id={`ev-date-${ev.id}`}
                          type="datetime-local"
                          value={ev.date}
                          onChange={(e) => updateEvent(ev.id, { date: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`ev-sport-${ev.id}`} className="text-xs">
                          Sport
                        </Label>
                        <select
                          id={`ev-sport-${ev.id}`}
                          value={ev.sport}
                          onChange={(e) => updateEvent(ev.id, { sport: e.target.value })}
                          className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {SPORTS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`ev-comp-${ev.id}`} className="text-xs">
                          Competizione
                        </Label>
                        <Input
                          id={`ev-comp-${ev.id}`}
                          placeholder="Es. Serie A"
                          value={ev.competition}
                          onChange={(e) => updateEvent(ev.id, { competition: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`ev-market-${ev.id}`} className="text-xs">
                          Mercato
                        </Label>
                        <SearchableSelect
                          id={`ev-market-${ev.id}`}
                          placeholder="Seleziona"
                          searchPlaceholder="Cerca mercato..."
                          options={MARKET_OPTIONS}
                          value={ev.market}
                          onChange={(v) =>
                            updateEvent(ev.id, {
                              market: v,
                              marketScope: isTeamScopedMarket(v) ? ev.marketScope || 'CASA' : '',
                            })
                          }
                          className="[&>button]:h-8"
                        />
                      </div>
                      {isTeamScopedMarket(ev.market) && (
                        <div className="space-y-1">
                          <Label className="text-xs">Squadra</Label>
                          <TeamScopeToggle
                            value={ev.marketScope}
                            onChange={(s) => updateEvent(ev.id, { marketScope: s })}
                            className="h-8 items-stretch"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quote e commissione */}
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`ev-main-${ev.id}`} className="text-xs">
                          Quota Punta
                        </Label>
                        <div className="relative">
                          <Input
                            id={`ev-main-${ev.id}`}
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={ev.mainOdds}
                            onChange={(e) => updateEvent(ev.id, { mainOdds: e.target.value })}
                            className="h-8 pr-6"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            @
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`ev-cover-${ev.id}`} className="text-xs">
                          {ev.type === 'punta-banca' ? 'Quota Banca' : 'Quota Punta 2'}
                        </Label>
                        <div className="relative">
                          <Input
                            id={`ev-cover-${ev.id}`}
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={ev.coverOdds}
                            onChange={(e) => updateEvent(ev.id, { coverOdds: e.target.value })}
                            className="h-8 pr-6"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            @
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`ev-comm-${ev.id}`} className="text-xs">
                          Commissione
                        </Label>
                        <div className="relative">
                          <Input
                            id={`ev-comm-${ev.id}`}
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={ev.commissionPercent}
                            onChange={(e) =>
                              updateEvent(ev.id, { commissionPercent: e.target.value })
                            }
                            className="h-8 pr-6"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Risultato hedge per questo evento */}
                    {hr != null && hr.hedgeStake > 0 && backStakeTotale > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-background/60 p-2.5">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {ev.type === 'punta-banca' ? 'Stake Banca' : 'Stake Punta 2'}
                          </p>
                          <p className="font-mono text-sm font-semibold text-destructive">
                            {formatNum(hr.hedgeStake)} €
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {ev.type === 'punta-banca' ? 'Responsabilità' : 'Costo'}
                          </p>
                          <p className="font-mono text-sm font-semibold">
                            {formatNum(hr.hedgeCost)} €
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Bottone aggiungi evento */}
          <button
            type="button"
            onClick={addEvent}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Aggiungi evento
          </button>
        </div>
      </div>

      {/* Riepilogo Multipla */}
      {showSummary && (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            {stakeBonusNum > 0 && rimborsoNum > 0
              ? 'BONUS + RIMBORSO • '
              : stakeBonusNum > 0
                ? 'BONUS • '
                : rimborsoNum > 0
                  ? 'RIMBORSO • '
                  : ''}
            Riepilogo Multipla
          </div>

          {/* Tabella riepilogo - card su mobile */}
          <div className="block space-y-3 p-4 sm:hidden">
            {events.map((ev, i) => {
              const hr = hedgeResults[i]
              return (
                <div key={ev.id} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {ev.eventName || `Evento ${i + 1}`}
                    </p>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase',
                        ev.type === 'punta-banca'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-amber-500/15 text-amber-600',
                      )}
                    >
                      {ev.type === 'punta-banca' ? 'P-B' : 'P-P'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quota Punta</span>
                      <span className="font-mono">{formatNum(parseNum(ev.mainOdds))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {ev.type === 'punta-banca' ? 'Quota Banca' : 'Quota Punta 2'}
                      </span>
                      <span className="font-mono">{formatNum(parseNum(ev.coverOdds))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {ev.type === 'punta-banca' ? 'Stake Banca' : 'Stake Punta 2'}
                      </span>
                      <span className="font-mono text-destructive">
                        {formatNum(hr?.hedgeStake ?? null)} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {ev.type === 'punta-banca' ? 'Responsabilità' : 'Costo'}
                      </span>
                      <span className="font-mono">{formatNum(hr?.hedgeCost ?? null)} €</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tabella riepilogo - desktop */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-3 text-left font-normal">Evento</th>
                  <th className="p-3 text-center font-normal">Tipo</th>
                  <th className="p-3 text-right font-normal">Q. Punta</th>
                  <th className="p-3 text-right font-normal">Q. Cop.</th>
                  <th className="p-3 text-right font-normal">Stake Cop.</th>
                  <th className="p-3 text-right font-normal">Resp./Costo</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => {
                  const hr = hedgeResults[i]
                  return (
                    <tr
                      key={ev.id}
                      className="border-b border-border transition-colors hover:bg-accent"
                    >
                      <td className="p-3 font-medium">{ev.eventName || `Evento ${i + 1}`}</td>
                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase',
                            ev.type === 'punta-banca'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-amber-500/15 text-amber-600',
                          )}
                        >
                          {ev.type === 'punta-banca' ? 'P-B' : 'P-P'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatNum(parseNum(ev.mainOdds))}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatNum(parseNum(ev.coverOdds))}
                      </td>
                      <td className="p-3 text-right font-mono text-destructive">
                        {formatNum(hr?.hedgeStake ?? null)} €
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatNum(hr?.hedgeCost ?? null)} €
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totali */}
          <div className="space-y-2 border-t border-border p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quota multipla totale</span>
              <span className="font-mono font-semibold">{formatNum(totalBackOdds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stake totale (reale + bonus)</span>
              <span className="font-mono">{formatNum(backStakeTotale)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vincita potenziale lorda</span>
              <span className="font-mono text-primary">{formatNum(vincitaPotenziale)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Costo totale copertura</span>
              <span className="font-mono text-destructive">{formatNum(totalHedgeCost)} €</span>
            </div>
            {rimborsoNum > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rimborso</span>
                <span className="font-mono text-primary">{formatNum(rimborsoNum)} €</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-medium">
              <span className="text-foreground">Profitto netto (se tutti vincono)</span>
              <span
                className={cn(
                  'font-mono',
                  profittoNetto >= 0 ? 'text-primary' : 'text-destructive',
                )}
              >
                {formatSigned(profittoNetto)} €
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottone Salva */}
      <div className="flex flex-col items-center gap-2 p-4">
        <Button onClick={() => setSaveModalOpen(true)} variant="default" disabled={!canSave}>
          Invia al Profit Tracker
        </Button>
      </div>

      <MultiplaOfflineSaveModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        events={events}
        stakeReale={stakeRealeNum}
        stakeBonus={stakeBonusNum}
        rimborso={rimborsoNum}
        hedgeResults={hedgeResults}
      />
    </div>
  )
}
