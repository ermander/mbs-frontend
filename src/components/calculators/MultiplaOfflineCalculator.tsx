'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
import { MARKET_OPTIONS, formatMercatoString, isTeamScopedMarket } from '@/lib/calculators/markets'
import { MultiplaOfflineSaveModal } from '@/components/calculators/MultiplaOfflineSaveModal'
import { TeamScopeToggle } from '@/components/calculators/team-scope-toggle'
import { CalculatorSaveAction } from '@/components/calculators/calculator-panel'
import {
  CalcFigure,
  CalcLayout,
  CalcNote,
  CalcNumberField,
  CalcProfits,
  CalcSelect,
  CalcTable,
  CalcTextField,
  amount,
  type CalcColumn,
} from '@/components/calculators/calc-ds'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsMoney } from '@/components/landing/ds-data'
import { formatOdds } from '@/lib/landing-format'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'
import type { OfflineMultiplaEvent } from '@/types/offline-multipla-event'

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
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

  const typeLabel = (type: OfflineMultiplaEvent['type']) =>
    type === 'punta-banca' ? 'Punta-Banca' : 'Punta-Punta'
  const coverLabel = (type: OfflineMultiplaEvent['type']) =>
    type === 'punta-banca' ? 'Bancata' : 'Punta 2'
  const costLabel = (type: OfflineMultiplaEvent['type']) =>
    type === 'punta-banca' ? 'Resp.' : 'Costo'
  const oddsText = (s: string) => {
    const n = parseNum(s)
    return n != null ? formatOdds(n) : '—'
  }

  const summaryColumns: CalcColumn<{ id: string; ev: OfflineMultiplaEvent; i: number }>[] = [
    {
      key: 'evento',
      label: 'Evento',
      render: ({ ev, i }) => (
        <span className="font-semibold text-ds-ink">{ev.eventName || `Evento ${i + 1}`}</span>
      ),
    },
    { key: 'tipo', label: 'Tipo', render: ({ ev }) => typeLabel(ev.type) },
    { key: 'qp', label: 'Quota punta', num: true, render: ({ ev }) => oddsText(ev.mainOdds) },
    { key: 'qc', label: 'Quota cop.', num: true, render: ({ ev }) => oddsText(ev.coverOdds) },
    {
      key: 'stake',
      label: 'Copertura',
      num: true,
      render: ({ i }) => amount(hedgeResults[i]?.hedgeStake ?? null),
    },
    {
      key: 'cost',
      label: 'Resp. / costo',
      num: true,
      render: ({ i }) => amount(hedgeResults[i]?.hedgeCost ?? null),
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <CalcLayout
        outcomes={
          <>
            {events.map((ev, index) => {
              const isCollapsed = collapsedIds.has(ev.id)
              const hr = hedgeResults[index]
              const hasResult = hr != null && hr.hedgeStake > 0 && backStakeTotale > 0
              const isPB = ev.type === 'punta-banca'
              return (
                <div
                  key={ev.id}
                  className="flex flex-col gap-4 rounded-ds-md border border-ds-line bg-ds-surface-raised px-5 py-4 shadow-ds-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(ev.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? 'Espandi evento' : 'Comprimi evento'}
                      className={cn(dsButtonClass('ghost', 'sm'), 'w-8 px-0')}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                    <span className="ds-label inline-flex h-7 w-7 items-center justify-center rounded-full bg-ds-brand-soft tracking-normal text-ds-brand">
                      {index + 1}
                    </span>
                    {isCollapsed ? (
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="ds-subheading truncate">
                          {ev.eventName || `Evento ${index + 1}`}
                        </span>
                        <span className="ds-body-sm whitespace-nowrap tabular-nums text-ds-ink-muted">
                          {typeLabel(ev.type)}
                          {ev.market
                            ? ` · ${formatMercatoString(ev.market, ev.marketScope)}`
                            : ''}{' '}
                          · {oddsText(ev.mainOdds)} / {oddsText(ev.coverOdds)}
                          {isPB ? ` · ${ev.commissionPercent || 0} %` : ''}
                        </span>
                        <span className="ds-num ml-auto whitespace-nowrap">
                          {coverLabel(ev.type)} {amount(hasResult ? hr.hedgeStake : null)}
                        </span>
                      </div>
                    ) : (
                      <div role="group" aria-label="Tipo di copertura" className="flex gap-2">
                        {(['punta-banca', 'punta-punta'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={ev.type === t}
                            onClick={() => updateEvent(ev.id, { type: t })}
                            className={dsButtonClass(ev.type === t ? 'primary' : 'secondary', 'sm')}
                          >
                            {typeLabel(t)}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="ml-auto flex gap-1">
                      <button
                        type="button"
                        aria-label="Sposta su"
                        disabled={index === 0}
                        onClick={() => moveEvent(index, 'up')}
                        className={cn(dsButtonClass('ghost', 'sm'), 'w-8 px-0 disabled:opacity-40')}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Sposta giù"
                        disabled={index === events.length - 1}
                        onClick={() => moveEvent(index, 'down')}
                        className={cn(dsButtonClass('ghost', 'sm'), 'w-8 px-0 disabled:opacity-40')}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Rimuovi evento"
                        disabled={events.length <= 2}
                        onClick={() => removeEvent(ev.id)}
                        className={cn(dsButtonClass('ghost', 'sm'), 'w-8 px-0 disabled:opacity-40')}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                        <CalcTextField
                          id={`ev-name-${ev.id}`}
                          label="Nome evento"
                          placeholder="Es. Roma - Milan"
                          value={ev.eventName}
                          onChange={(v) => updateEvent(ev.id, { eventName: v })}
                          className="col-span-2 sm:col-span-3"
                        />
                        <CalcTextField
                          id={`ev-date-${ev.id}`}
                          label="Data e ora"
                          type="datetime-local"
                          value={ev.date}
                          onChange={(v) => updateEvent(ev.id, { date: v })}
                          className="col-span-2 sm:col-span-3"
                        />
                        <CalcSelect
                          id={`ev-sport-${ev.id}`}
                          label="Sport"
                          options={SPORTS}
                          value={ev.sport}
                          onChange={(v) => updateEvent(ev.id, { sport: v })}
                          className="sm:col-span-2"
                        />
                        <CalcTextField
                          id={`ev-comp-${ev.id}`}
                          label="Competizione"
                          placeholder="Es. Serie A"
                          value={ev.competition}
                          onChange={(v) => updateEvent(ev.id, { competition: v })}
                          className="sm:col-span-2"
                        />
                        <div className="col-span-2 flex min-w-0 flex-col gap-1">
                          <label
                            htmlFor={`ev-market-${ev.id}`}
                            className="text-sm font-semibold leading-5 text-ds-ink"
                          >
                            Mercato
                          </label>
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
                          <div className="col-span-2 flex flex-col gap-1">
                            <span className="text-sm font-semibold leading-5 text-ds-ink">
                              Squadra
                            </span>
                            <TeamScopeToggle
                              value={ev.marketScope}
                              onChange={(sc) => updateEvent(ev.id, { marketScope: sc })}
                              className="h-8 items-stretch"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 items-start gap-3 border-t border-ds-line pt-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(150px,1.4fr)]">
                        <CalcNumberField
                          id={`ev-main-${ev.id}`}
                          label="Quota punta"
                          size="sm"
                          value={ev.mainOdds}
                          onChange={(v) => updateEvent(ev.id, { mainOdds: v })}
                        />
                        <CalcNumberField
                          id={`ev-cover-${ev.id}`}
                          label={isPB ? 'Quota banca' : 'Quota punta 2'}
                          size="sm"
                          value={ev.coverOdds}
                          onChange={(v) => updateEvent(ev.id, { coverOdds: v })}
                        />
                        {isPB ? (
                          <CalcNumberField
                            id={`ev-comm-${ev.id}`}
                            label="Commissione"
                            size="sm"
                            suffix="%"
                            value={ev.commissionPercent}
                            onChange={(v) => updateEvent(ev.id, { commissionPercent: v })}
                          />
                        ) : (
                          <span className="hidden sm:block" />
                        )}
                        <div className="col-span-2 text-right sm:col-span-1">
                          <div className="ds-caption text-ds-ink-muted">{coverLabel(ev.type)}</div>
                          <div aria-live="polite" className="ds-num text-xl leading-7">
                            {amount(hasResult ? hr.hedgeStake : null)}
                          </div>
                          <div className="ds-body-sm whitespace-nowrap tabular-nums text-ds-ink-muted">
                            {costLabel(ev.type)} {amount(hasResult ? hr.hedgeCost : null)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            <div className="flex justify-center">
              <button type="button" onClick={addEvent} className={dsButtonClass('secondary', 'md')}>
                <Plus className="h-5 w-5" aria-hidden />
                Aggiungi evento
              </button>
            </div>
          </>
        }
        inputs={
          <>
            <CalcNumberField
              id="stake-reale"
              label="Puntata reale"
              size="lg"
              suffix="€"
              value={stakeReale}
              onChange={setStakeReale}
            />
            <div className="grid grid-cols-2 gap-3">
              <CalcNumberField
                id="stake-bonus"
                label="Puntata bonus"
                suffix="€"
                value={stakeBonus}
                onChange={setStakeBonus}
              />
              <CalcNumberField
                id="rimborso"
                label="Rimborso"
                suffix="€"
                value={rimborso}
                onChange={setRimborso}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-ds-line pt-4">
              <CalcFigure
                label="Quota totale"
                align="left"
                live
                value={showSummary ? formatOdds(totalBackOdds) : '—'}
              />
              <CalcFigure
                label="Ritorno potenziale"
                align="left"
                live
                value={amount(showSummary ? vincitaPotenziale : null)}
              />
            </div>
          </>
        }
      />

      <CalcProfits
        outlayLabel="Costo coperture"
        outlay={showSummary ? totalHedgeCost : null}
        gainLabel="Profitto se vince la multipla"
        minGain={showSummary ? profittoNetto : null}
      >
        {showSummary ? (
          <div className="flex flex-col gap-4">
            <CalcTable
              caption="Coperture per evento"
              columns={summaryColumns}
              rows={events.map((ev, i) => ({ id: ev.id, ev, i }))}
            />
            <div className="rounded-ds-md border border-ds-line bg-ds-surface-raised px-5 py-1">
              {[
                ['Quota multipla totale', formatOdds(totalBackOdds)],
                ['Puntata totale (reale + bonus)', amount(backStakeTotale)],
                ['Vincita potenziale lorda', amount(vincitaPotenziale)],
                ['Costo totale copertura', amount(totalHedgeCost)],
                ...(rimborsoNum > 0 ? [['Rimborso', amount(rimborsoNum)]] : []),
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-b border-ds-line py-3"
                >
                  <span className="ds-body-sm text-ds-ink-muted">{label}</span>
                  <span className="ds-num whitespace-nowrap">{value}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 py-3">
                <span className="text-sm font-semibold text-ds-ink">
                  Profitto netto (se tutti vincono)
                </span>
                <DsMoney value={profittoNetto} />
              </div>
            </div>
          </div>
        ) : (
          <CalcNote title="Servono puntata e quote">
            Il risultato compare quando la puntata e le quote di punta e copertura di ogni evento
            sono compilate e valide.
          </CalcNote>
        )}
      </CalcProfits>

      <CalculatorSaveAction onClick={() => setSaveModalOpen(true)} disabled={!canSave} />

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
